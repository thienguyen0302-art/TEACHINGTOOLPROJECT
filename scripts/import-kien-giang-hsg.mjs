import { Buffer } from 'node:buffer';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { serializePublicProblem, validateProblem } from '../src/utils/problemAuthoring.js';
import { validateContest, contestEnd } from '../src/utils/contest.js';

export const FIRST_CONTEST_START = '2026-10-16T19:00:00+07:00';
export const RELEASE_INTERVAL_DAYS = 2;
export const seriesId = 'kien-giang-hsg';
export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const digest = value => createHash('sha256').update(value).digest('hex');
export function seasonSchedule(index) {
  if (!Number.isInteger(index) || index < 0 || index > 18) throw new Error('Invalid season index');
  return new Date(Date.parse(FIRST_CONTEST_START) + index * RELEASE_INTERVAL_DAYS * 86400000 + 7 * 3600000).toISOString().replace('.000Z', '+07:00');
}
export function verifyManifest(manifest) {
  if (manifest.series !== seriesId || manifest.seasons?.length !== 19) throw new Error('Series must contain exactly 19 seasons');
  manifest.seasons.forEach((s, i) => {
    const season = `${2006+i}-${2007+i}`;
    if (s.season !== season || s.id !== `${seriesId}-${season}` || s.startAt !== seasonSchedule(i) || s.source === '15_DE_HSG_KG.pdf' || !/\.pdf$/i.test(s.source)) throw new Error(`Invalid season ${season}`);
    if (s.source === 'tin_1728.pdf' && (s.headerVerification?.season !== '2017-2018' || s.headerVerification?.verified !== true)) {
      if (!s.needsReview) throw new Error('tin_1728.pdf requires verified PDF header before normalization');
    }
  });
  return manifest;
}
export async function verifySources(manifest, sourceDir) {
  const names = await readdir(sourceDir);
  for (const season of manifest.seasons) {
    if (!names.includes(season.source)) throw new Error(`Missing source: ${season.source}`);
    const bytes = await readFile(path.join(sourceDir, season.source));
    if (!bytes.subarray(0,5).equals(Buffer.from('%PDF-')) || digest(bytes) !== season.sha256) throw new Error(`Source changed: ${season.source}; re-extract and review first`);
  }
  if (digest(await readFile(path.join(sourceDir, manifest.compilation.source))) !== manifest.compilation.sha256) throw new Error('Compilation changed; review required');
}
function reviewReasons(season, problems) {
  const reasons = [];
  if (season.needsReview) reasons.push('Season marked needsReview');
  if (!season.headerVerification?.verified) reasons.push('Annual PDF header/season requires review');
  if (!season.duration?.verified || !Number.isInteger(season.duration?.minutes)) reasons.push('Duration not verified');
  if (!season.extractionVerified) reasons.push('Annual statements/samples require source review');
  if (!problems.length || problems.length !== season.expectedProblemCount) reasons.push('Problem count not verified');
  for (const p of problems) {
    if (!p.extractionVerified || p.needsReview) reasons.push(`${p.id}: extraction needs review`);
    if (!Number.isInteger(p.points) || p.points < 1) reasons.push(`${p.id}: point distribution needs review`);
    if (!p.samplesVerified || !p.problem?.samples?.length) reasons.push(`${p.id}: public samples need validation`);
    if (!p.hiddenTestsVerified || !p.hiddenTests?.length || !p.referenceEvidence?.sha256 || !p.referenceEvidence?.validatedAt) reasons.push(`${p.id}: no validated private reference tests`);
  }
  return [...new Set(reasons)];
}
export function planSeason(season, candidates = []) {
  const seen = new Set();
  const problems = candidates.map((p, i) => {
    const id = `${season.id}-${String.fromCharCode(96+(p.sourceNumber ?? i+1))}`;
    if (seen.has(p.id)) throw new Error('Duplicate problem ID');
    seen.add(p.id);
    if (p.id !== id) throw new Error('Non-deterministic problem ID');
    return p;
  });
  const reasons = reviewReasons(season, problems);
  const ready = reasons.length === 0;
  const entries = [];
  for (const p of problems) {
    // Invalid/incomplete drafts stay in the review manifest; never make invalid production problem documents.
    try {
      const payload = validateProblem({ ...p.problem, slug: p.id, hiddenTests: ready ? p.hiddenTests : [] }, { status: ready ? 'published' : 'draft' });
      // Solution explanations from reference documents never belong in public sample fields.
      const publicData = serializePublicProblem(payload);
      if (p.originalFileIO) {
        const { input, output } = p.originalFileIO;
        if (![input, output].every(name=>typeof name==='string'&&/^[a-zA-Z0-9_.-]{1,80}$/.test(name))) throw new Error('Invalid original file I/O names');
        publicData.inputDescription = 'Standard Input. ' + publicData.inputDescription;
        publicData.outputDescription = 'Standard Output. ' + publicData.outputDescription;
        publicData.statement += `\n\nĐề gốc sử dụng file ${input} / ${output}. Bài trên PeanutCode dùng Standard Input / Standard Output; không cần freopen.`;
      }
      publicData.samples = publicData.samples.map(({input,output}) => ({input,output,explanation:''}));
      if (!Number.isInteger(p.points) || p.points < 1) { if (ready) throw new Error('Unverified points'); else continue; }
      entries.push({ id:p.id, points:p.points, publicData, hiddenTests:ready ? payload.hiddenTests : [] });
    } catch (error) {
      if (ready) throw error;
    }
  }
  let contest = null;
  if (season.duration?.verified && Number.isInteger(season.duration.minutes)) {
    contest = validateContest({ title:`HSG Tin học Kiên Giang ${season.season.replace('-', '–')}`, description:'Đề HSG Tin học Kiên Giang · Standard Input / Standard Output.', startAt:season.startAt, durationMinutes:season.duration.minutes, problems:entries.map(p=>({problemId:p.id,points:p.points})) }, {status:ready?'published':'draft',publishedProblems:entries.map(p=>({id:p.id,status:p.publicData.status,hiddenTestCount:p.hiddenTests.length}))});
  }
  return { id:season.id, season:season.season, state:ready?'READY':'NEEDS REVIEW', needsReview:!ready, reasons, contest, problems:entries, candidateCount:problems.length, duration:season.duration ?? null };
}
// A single transaction per season; existing IDs are skipped, including teacher-edited drafts.
// This makes retries safe and never overwrites running contests, student submissions or locks.
export async function applyPlan(plans, repository) {
  const results=[];
  for (const plan of plans) {
    if (!plan.contest) { results.push({id:plan.id,state:'SKIPPED',reason:'Unknown duration; retained in manifest only'}); continue; }
    results.push(await repository.createSeasonIfAbsent(plan));
  }
  return results;
}
export async function firestoreRepository(projectId, ownerUid) {
  if (!projectId || !ownerUid) throw new Error('--apply requires FIREBASE_PROJECT_ID and IMPORT_TEACHER_UID');
  const {applicationDefault, initializeApp} = await import('firebase-admin/app');
  const {getFirestore,Timestamp} = await import('firebase-admin/firestore');
  const db=getFirestore(initializeApp({credential:applicationDefault(),projectId}));
  const profile=await db.doc(`users/${ownerUid}`).get();
  if (profile.data()?.role !== 'teacher') throw new Error('IMPORT_TEACHER_UID must identify an existing teacher');
  return createImportRepository({db, Timestamp, ownerUid});
}
export function createImportRepository({db, Timestamp, ownerUid}) {
  return { async createSeasonIfAbsent(plan) {
    return db.runTransaction(async tx => {
      const ref=db.doc(`contests/${plan.id}`);
      if ((await tx.get(ref)).exists) return {id:plan.id,state:'SKIPPED',reason:'Existing contest preserved'};
      const refs=plan.problems.flatMap(p=>[db.doc(`problems/${p.id}`),db.doc(`problemSecrets/${p.id}`),db.doc(`problemSlugs/${p.id}`),db.doc(`problemLocks/${p.id}`)]);
      if (refs.length && (await tx.getAll(...refs)).some(s=>s.exists)) return {id:plan.id,state:'SKIPPED',reason:'Existing problem/slug/secret/lock preserved'};
      const now=Timestamp.now();
      for (const p of plan.problems) {
        tx.create(db.doc(`problems/${p.id}`),{...p.publicData,createdBy:ownerUid,createdAt:now,updatedAt:now});
        tx.create(db.doc(`problemSecrets/${p.id}`),{hiddenTests:p.hiddenTests,updatedAt:now});
        tx.create(db.doc(`problemSlugs/${p.id}`),{problemId:p.id});
        if (plan.contest.status==='published') tx.create(db.doc(`problemLocks/${p.id}`),{until:Timestamp.fromMillis(contestEnd(plan.contest))});
      }
      tx.create(ref,{...plan.contest,startAt:Timestamp.fromMillis(plan.contest.startAt),createdBy:ownerUid,createdAt:now,updatedAt:now});
      return {id:plan.id,state:plan.state,problems:plan.problems.length,status:plan.contest.status};
    });
  }};
}
export async function main(args=process.argv.slice(2)) {
  const flags=new Set(args.filter(a=>a.startsWith('--')));
  for (const flag of flags) if (!['--apply','--dry-run','--source-dir'].includes(flag)) throw new Error(`Unknown option: ${flag}`);
  if (flags.has('--apply') && flags.has('--dry-run')) throw new Error('Choose --apply or --dry-run');
  const manifest=verifyManifest(JSON.parse(await readFile(path.join(projectRoot,'seed/kien-giang-hsg/manifest.json'),'utf8')));
  const pos=args.indexOf('--source-dir');
  const sourceDir=path.resolve(pos>=0 ? args[pos+1] : path.join(projectRoot,manifest.sourceDirectory));
  try { await verifySources(manifest,sourceDir); } catch(error) { throw new Error(`${error.message}. Place archive at imports/kien-giang-hsg/De-Thi-HSG-Tin-Hoc.zip, extract it and use --source-dir <directory>. No import performed.`); }
  const candidates=JSON.parse(await readFile(path.join(projectRoot,'seed/kien-giang-hsg/annual-candidates.json'),'utf8'));
  const plans=manifest.seasons.map(s=>planSeason(s,candidates[s.season] ?? []));
  const report=plans.map(p=>({id:p.id,state:p.state,startAt:manifest.seasons.find(s=>s.id===p.id).startAt,duration:p.duration,validProblems:p.problems.length,candidates:p.candidateCount,reasons:p.reasons}));
  console.log(JSON.stringify({mode:flags.has('--apply')?'APPLY':'DRY RUN',timezone:'Asia/Ho_Chi_Minh',report},null,2));
  if (flags.has('--apply')) console.log(JSON.stringify(await applyPlan(plans,await firestoreRepository(process.env.FIREBASE_PROJECT_ID,process.env.IMPORT_TEACHER_UID)),null,2));
  return plans;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) main().catch(error=>{console.error(error.message);process.exitCode=1;});
