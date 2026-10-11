import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSubmissionResult, updateSubmissionStats, currentJudgeResult } from '../src/services/submissionService.js';
import { createSubmissionProgressStore, recordSubmissionProgress } from '../src/services/submissionProgressService.js';
import { preferredTutorAction } from '../src/utils/tutorActions.js';

const metadata = { problemId:'sum-001', slug:'tong-hai-so', chapterId:'ch01', language:'cpp', source:'SECRET_SOURCE', solution:{code:'SECRET_SOLUTION'} };
function judge(passed = 0, status = 'Wrong Answer', total = 6) {
 return {mode:'submit',passed,total,score:Math.round(passed/total*100),results:Array.from({length:total},(_,i)=>({hidden:i>0,passed:i<passed,status:i<passed?'Accepted':status,time:'0.02',memory:3400,input:'SECRET_INPUT',expected:'SECRET_EXPECTED',stdout:'SECRET_STDOUT',stderr:'SECRET_STDERR',compileOutput:'SECRET_COMPILE'}))};
}
test('Run never records attempts or invokes persistence',()=>{
 const store=createSubmissionProgressStore();
 const result=store.record(metadata,{mode:'run',result:{status:'Accepted'}});
 assert.equal(result,null);assert.equal(store.get(metadata),null);
});
test('WA Submit is an attempt',()=>{
 const stats=updateSubmissionStats(null,buildSubmissionResult(metadata,judge()));
 assert.equal(stats.attempts,1);assert.equal(stats.lastStatus,'attempted');assert.equal(stats.solved,false);
});
test('CE Submit stopped early still counts once',()=>{
 const ce=judge(0,'Compilation Error');ce.results=ce.results.slice(0,1);ce.stoppedEarly=true;
 const normalized=buildSubmissionResult(metadata,ce);
 assert.equal(normalized.judgeStatus,'Compilation Error');assert.equal(updateSubmissionStats(null,normalized).attempts,1);
});
test('RE/TLE are attempts with authoritative Judge statuses',()=>{
 for(const status of ['Runtime Error (NZEC)','Runtime Error (Other)','Time Limit Exceeded']){
 const submission=buildSubmissionResult(metadata,judge(0,status));
 assert.equal(submission.judgeStatus,status);assert.equal(updateSubmissionStats(null,submission).attempts,1);
 }
});
test('Accepted marks solved',()=>{
 const normalized=buildSubmissionResult(metadata,judge(6));
 assert.equal(normalized.status,'accepted');assert.equal(normalized.judgeStatus,'Accepted');
 assert.equal(updateSubmissionStats(null,normalized).solved,true);
});
test('solved is monotonic, bestScore is maximum, lastScore/status follow last Submit',()=>{
 let stats=null;
 for(const passed of [2,4,6,3])stats=updateSubmissionStats(stats,buildSubmissionResult(metadata,judge(passed)));
 assert.deepEqual(stats,{attempts:4,bestScore:100,lastScore:50,solved:true,lastStatus:'attempted'});
});
test('Run leaves existing stats unchanged',()=>{
 const stats={attempts:4,bestScore:100,lastScore:50,solved:true,lastStatus:'attempted'};
 assert.equal(updateSubmissionStats(stats,buildSubmissionResult(metadata,{mode:'run'})),stats);
});
test('Problem Bank metadata and metrics are normalized',()=>{
 const result=buildSubmissionResult(metadata,judge(6),12345);
 assert.deepEqual(result,{problemId:'sum-001',slug:'tong-hai-so',chapterId:'ch01',sourceType:'problem-bank',section:null,language:'cpp',status:'accepted',judgeStatus:'Accepted',score:100,passed:6,total:6,time:0.02,memory:3400,submittedAt:12345});
});
for(const section of ['practice','advanced'])test(`Lesson ${section} metadata`,()=>{
 const result=buildSubmissionResult({slug:`lesson/python/ch03/${section}/exercise01`,chapterId:'ch03',language:'python'},judge(6));
 assert.equal(result.problemId,'exercise01');assert.equal(result.sourceType,'lesson');assert.equal(result.section,section);assert.equal(result.chapterId,'ch03');
});
test('Normalized result and persistence contract exclude source, solutions, hidden diagnostics and arbitrary extra fields',async()=>{
 const submission=buildSubmissionResult(metadata,judge(6));
 const outcome=await recordSubmissionProgress(submission,updateSubmissionStats(null,submission));
 for(const value of [submission,outcome.contract]){
 assert.equal(JSON.stringify(value).includes('SECRET_'),false);assert.equal('results' in value,false);assert.equal('source' in value,false);
 }
 assert.deepEqual(Object.keys(outcome.contract).sort(),['problemId','slug','chapterId','sourceType','section','language','status','score','passed','total','attempts','bestScore','solved','submittedAt'].sort());
});
test('Persistence rejection never destroys Accepted or session stats',async()=>{
 const store=createSubmissionProgressStore();const judged=judge(6);
 const entry=store.record(metadata,judged,{uid:'student',persist:async()=>{throw new Error('PRIVATE_CREDENTIAL');}});
 assert.equal(entry.stats.solved,true);assert.equal(judged.score,100);
 const outcome=await entry.handoff;
 assert.equal(outcome.persistence,'failed');assert.equal(outcome.warning.includes('PRIVATE_CREDENTIAL'),false);
 assert.equal(store.get(metadata,'student').stats.solved,true);assert.equal(judged.results[0].status,'Accepted');
});
test('Anonymous and unconfigured persistence retain local session progress',async()=>{
 const submission=buildSubmissionResult(metadata,judge(6));const stats=updateSubmissionStats(null,submission);
 let called=false;
 assert.equal((await recordSubmissionProgress(submission,stats,{persist:async()=>{called=true;}})).persistence,'session-only');
 assert.equal(called,false);
 assert.equal((await recordSubmissionProgress(submission,stats,{uid:'student'})).persistence,'session-only');
});
test('Dev1 adapter receives contract and identity only',async()=>{
 const submission=buildSubmissionResult(metadata,judge(6));
 const outcome=await recordSubmissionProgress(submission,updateSubmissionStats(null,submission),{uid:'student',persist:async(contract,identity)=>{
 assert.deepEqual(identity,{uid:'student'});assert.equal(contract.attempts,1);assert.equal(contract.solved,true);assert.equal('judgeStatus' in contract,false);
 }});
 assert.equal(outcome.persistence,'saved');
});
test('AI recommendations CE/RE/partial/TLE/Accepted',()=>{
 for(const status of ['Compilation Error','Runtime Error (NZEC)'])assert.equal(preferredTutorAction(judge(0,status)),'explain_error');
 assert.equal(preferredTutorAction(judge(4)),'explain_failure');assert.equal(preferredTutorAction(judge(0,'Time Limit Exceeded')),'explain_failure');
 assert.equal(preferredTutorAction(judge(6)),'complexity');assert.equal(preferredTutorAction(null),'hint');
});
test('Changed source or language invalidates AI verdict, progress and historical submission survive',()=>{
 const store=createSubmissionProgressStore();store.record(metadata,judge(6));
 const snapshot={...judge(6),language:'cpp',judgedSource:'old source'};
 assert.equal(currentJudgeResult(snapshot,'old source','cpp'),snapshot);
 assert.equal(currentJudgeResult(snapshot,'edited source','cpp'),null);assert.equal(currentJudgeResult(snapshot,'old source','python'),null);
 assert.equal(preferredTutorAction(currentJudgeResult(snapshot,'edited source','cpp')),'hint');
 assert.equal(store.get(metadata).stats.attempts,1);assert.equal(store.get(metadata).stats.bestScore,100);assert.equal(store.get(metadata).submission.score,100);
});
test('Session store keeps problem/language/user progress separate and supports subscriptions/remount',()=>{
 const store=createSubmissionProgressStore();let changes=0;const unsubscribe=store.subscribe(()=>changes++);
 store.record(metadata,judge(6));assert.equal(changes,1);unsubscribe();
 assert.equal(store.get({...metadata}).stats.attempts,1);
 assert.equal(store.get({...metadata,language:'python'}),null);assert.equal(store.get(metadata,'student'),null);
});
test('Judge failure or malformed/internal result does not create fake progress',()=>{
 const store=createSubmissionProgressStore();
 assert.equal(store.record(metadata,null),null);
 for(const result of [{mode:'submit'},judge(0,'Internal Error')])assert.throws(()=>store.record(metadata,result));
 assert.equal(store.get(metadata),null);
});
test('Late persistence failure cannot overwrite newer progress',async()=>{
 const store=createSubmissionProgressStore();let fail;
 const first=store.record(metadata,judge(0),{uid:'student',persist:()=>new Promise((resolve,reject)=>{fail=reject;})});
 const second=store.record(metadata,judge(6),{uid:'student',persist:async()=>{}});
 await second.handoff;fail(new Error('old failure'));await first.handoff;
 assert.equal(store.get(metadata,'student').stats.attempts,2);assert.equal(store.get(metadata,'student').stats.solved,true);assert.equal(store.get(metadata,'student').warning,'');
});

test('Inconsistent or rounded scores never create fake Accepted',()=>{
 const rounded=judge(199,'Wrong Answer',200);
 const submission=buildSubmissionResult(metadata,rounded);
 assert.equal(submission.score,100);assert.equal(submission.status,'attempted');assert.equal(updateSubmissionStats(null,submission).solved,false);
 const contradictory=judge(6);contradictory.results[0].status='Wrong Answer';
 assert.throws(()=>buildSubmissionResult(metadata,contradictory));
 const secretStatus=judge();secretStatus.results[0].status='SECRET_DIAGNOSTIC';
 assert.throws(()=>buildSubmissionResult(metadata,secretStatus));
});
