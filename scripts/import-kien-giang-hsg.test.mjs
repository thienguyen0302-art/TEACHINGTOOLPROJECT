import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyManifest, seasonSchedule, planSeason, applyPlan, digest } from './import-kien-giang-hsg.mjs';
import { isKienGiangSeries, nextSeriesContest } from '../src/utils/contestSeries.js';
const manifest=JSON.parse(await readFile(new URL('../seed/kien-giang-hsg/manifest.json',import.meta.url),'utf8'));
const candidates=JSON.parse(await readFile(new URL('../seed/kien-giang-hsg/annual-candidates.json',import.meta.url),'utf8'));
test('exactly 19 unique annual seasons and deterministic IDs, compilation/PPTX excluded',()=>{
 verifyManifest(manifest);assert.equal(new Set(manifest.seasons.map(s=>s.id)).size,19);
 assert.equal(manifest.seasons[0].season,'2006-2007');assert.equal(manifest.seasons.at(-1).season,'2024-2025');
 assert.equal(manifest.compilation.createsContest,false);
 assert.ok(manifest.seasons.every(s=>s.source!=='15_DE_HSG_KG.pdf'&&!s.source.endsWith('.pptx')));
});
test('release interval exactly two days with explicit UTC+07 independent of host TZ',()=>{
 for(let i=0;i<19;i++){
  const iso=seasonSchedule(i);assert.match(iso,/T19:00:00\+07:00$/);
  if(i)assert.equal(Date.parse(iso)-Date.parse(seasonSchedule(i-1)),172800000);
 }
 assert.equal(seasonSchedule(0),'2026-10-16T19:00:00+07:00');assert.equal(seasonSchedule(18),'2026-11-21T19:00:00+07:00');
 assert.throws(()=>seasonSchedule(19));
});
test('tin_1728 normalization requires original PDF header verification',()=>{
 const s=manifest.seasons.find(s=>s.source==='tin_1728.pdf');assert.equal(s.headerVerification.season,'2017-2018');assert.equal(s.headerVerification.page,1);
 const copy=structuredClone(manifest);copy.seasons[11].headerVerification.verified=false;copy.seasons[11].needsReview=false;assert.throws(()=>verifyManifest(copy),/header/);
});
test('all supplied scans remain review drafts; no guessed samples or hidden tests',()=>{
 for(const s of manifest.seasons){const plan=planSeason(s,candidates[s.season]??[]);assert.equal(plan.state,'NEEDS REVIEW');assert.equal(plan.contest.status,'draft');assert.equal(plan.contest.durationMinutes,150);assert.ok(plan.problems.every(p=>p.publicData.status==='draft'&&p.hiddenTests.length===0));}
});
const seed=()=>{
 const season=structuredClone(manifest.seasons[0]);season.extractionVerified=true;season.needsReview=false;season.expectedProblemCount=1;
 const id=season.id+'-a';
 const p={id,points:100,extractionVerified:true,samplesVerified:true,hiddenTestsVerified:true,needsReview:false,referenceEvidence:{sha256:digest('synthetic reference fixture'),validatedAt:'2026-10-15'},hiddenTests:[{input:'2 3',output:'5'}],problem:{title:'Synthetic addition fixture',statement:'Add a and b.',inputDescription:'a b',outputDescription:'sum',constraints:[],samples:[{input:'1 2',output:'3',explanation:'PRIVATE_REFERENCE'}],difficulty:'basic',tags:[],allowedLanguages:['cpp','python'],starterCode:{cpp:'',python:''},solution:'PRIVATE_SOLUTION',referenceSource:'PRIVATE_SOURCE'}};
 return {season,p};
};
test('no validated private tests or uncertain samples means draft, even when everything else valid',()=>{
 const {season,p}=seed();p.hiddenTests=[];p.hiddenTestsVerified=false;
 const plan=planSeason(season,[p]);assert.equal(plan.state,'NEEDS REVIEW');assert.equal(plan.contest.status,'draft');assert.deepEqual(plan.problems[0].hiddenTests,[]);
 p.hiddenTests=[{input:'2',output:'2'}];p.hiddenTestsVerified=true;p.samplesVerified=false;assert.equal(planSeason(season,[p]).contest.status,'draft');
});
test('ready plan uses published validators and never serializes reference or secret data publicly',()=>{
 const {season,p}=seed();const plan=planSeason(season,[p]);assert.equal(plan.state,'READY');assert.equal(plan.contest.status,'published');
 const serialized=JSON.stringify({contest:plan.contest,problem:plan.problems[0].publicData});assert.equal(serialized.includes('PRIVATE_'),false);assert.equal(serialized.includes('hiddenTests'),false);
 assert.deepEqual(plan.problems[0].hiddenTests,p.hiddenTests);
});
test('idempotent apply skips existing IDs and uncertain duration without creating duplicates',async()=>{
 const {season,p}=seed();const plan=planSeason(season,[p]);const docs=new Map();let writes=0;
 const repo={async createSeasonIfAbsent(plan){if(docs.has(plan.id))return{id:plan.id,state:'SKIPPED'};docs.set(plan.id,plan);writes++;return{id:plan.id,state:plan.state};}};
 await applyPlan([plan],repo);const again=await applyPlan([plan],repo);assert.equal(writes,1);assert.equal(docs.size,1);assert.equal(again[0].state,'SKIPPED');
 season.duration.verified=false;assert.equal((await applyPlan([planSeason(season,[p])],repo))[0].state,'SKIPPED');
});
test('series badge and next release consider published series only',()=>{
 const row={id:manifest.seasons[0].id,status:'published',startAt:Date.parse(manifest.seasons[0].startAt)};
 assert.equal(isKienGiangSeries(row),true);assert.equal(nextSeriesContest([row,{...row,startAt:row.startAt-10,status:'draft'}],0).id,row.id);
 assert.equal(nextSeriesContest([row],row.startAt),null);
});

test('original file I/O retains source note and uses standard streams',()=>{const {season,p}=seed();p.originalFileIO={input:'BAI1.INP',output:'BAI1.OUT'};const result=planSeason(season,[p]).problems[0].publicData;assert.match(result.statement,/Đề gốc sử dụng file BAI1.INP \/ BAI1.OUT/);assert.match(result.inputDescription,/Standard Input/);assert.match(result.outputDescription,/Standard Output/);});

test('real import transaction path is create-only, separates secrets, skips collisions and creates publish locks',async()=>{
 const {createImportRepository}=await import('./import-kien-giang-hsg.mjs');
 const records=new Map();let writes=0;
 const db={doc:path=>({path}),async runTransaction(fn){
  const pending=[];let wrote=false;
  const get=async ref=>{assert.equal(wrote,false,'all reads precede writes');return{exists:records.has(ref.path)};};
  const tx={get,getAll:(...refs)=>Promise.all(refs.map(get)),create:(ref,value)=>{wrote=true;assert.equal(records.has(ref.path),false);pending.push([ref.path,value]);}};
  const result=await fn(tx);for(const [path,value]of pending){records.set(path,value);writes++;}return result;
 }};
 const Timestamp={now:()=>123,fromMillis:value=>value};
 const repo=createImportRepository({db,Timestamp,ownerUid:'teacher'});
 const {season,p}=seed();const ready=planSeason(season,[p]);
 assert.equal((await applyPlan([ready],repo))[0].state,'READY');
 assert.equal(records.get(`problems/${p.id}`).hiddenTests,undefined);
 assert.deepEqual(records.get(`problemSecrets/${p.id}`).hiddenTests,p.hiddenTests);
 assert.equal(records.get(`problemLocks/${p.id}`).until,ready.contest.startAt+150*60000);
 const before=writes;assert.equal((await applyPlan([ready],repo))[0].state,'SKIPPED');assert.equal(writes,before);
 const next=structuredClone(ready);next.id=manifest.seasons[1].id;
 assert.equal((await applyPlan([next],repo))[0].state,'SKIPPED');assert.equal(records.has(`contests/${next.id}`),false);
 assert.equal(records.get(`contests/${ready.id}`).createdBy,'teacher');
});

test('apply requires project and teacher UID before initializing Firebase',async()=>{
 const {firestoreRepository}=await import('./import-kien-giang-hsg.mjs');
 await assert.rejects(firestoreRepository('project',undefined),/IMPORT_TEACHER_UID/);
 await assert.rejects(firestoreRepository(undefined,'teacher'),/FIREBASE_PROJECT_ID/);
});
