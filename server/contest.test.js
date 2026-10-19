import test from 'node:test';
import assert from 'node:assert/strict';
import { contestEnd, contestPhase, mergeScoreboard, rankScoreboard, remainingMs, validateContest } from '../src/utils/contest.js';
import { createContestHandler, createContestService } from './contest.js';
import { gradeSubmission } from './judge.js';
import { contestFixture, identity, request, seedContest } from './contestTestSupport.js';
const now=1000000;
const body={contestId:'c1',problemId:'p1',language:'cpp',source:'int main(){}',mode:'submit'};
const result=(stdout='5',statusId=3,status='Accepted')=>({statusId,status,stdout,stderr:'PRIVATE_STDERR',compileOutput:'PRIVATE_COMPILE',message:'PRIVATE_MESSAGE',time:'0.01',memory:1000});
function setup({clock=()=>now,execute=async()=>result(),grade}={}) {
  const store=seedContest(now);
  const service=createContestService({repository:store.repository,clock,execute,grade:grade ?? ((args)=>gradeSubmission({...args,execute}))});
  return Object.assign(store,{service});
}
test('status boundaries and timestamp-based remaining time do not drift',()=>{
  const c=contestFixture(now,{startAt:now});
  assert.equal(contestPhase(c,now-1),'upcoming'); assert.equal(contestPhase(c,now),'running');
  assert.equal(contestPhase(c,contestEnd(c)),'ended');assert.equal(remainingMs(c,contestEnd(c)+10),0);
  assert.equal(remainingMs(c,now+10000),3590000);
});
test('contest validation rejects invalid duration, no published problems and invalid points',()=>{
  for(const changes of [{durationMinutes:0},{durationMinutes:-1},{durationMinutes:NaN},{startAt:'bad'},{problems:[]},{problems:[{problemId:'p1',points:0}]},{problems:[{problemId:'p1',points:5},{problemId:'p1',points:5}]}]) assert.throws(()=>validateContest(contestFixture(now,changes),{status:'published'}));
  assert.throws(()=>validateContest(contestFixture(now),{status:'published',publishedProblems:[]}),/published/);
  assert.deepEqual(validateContest(contestFixture(now),{status:'published'}).problems,[{problemId:'p1',label:'A',points:200}]);
});
for(const [name,changes,time] of [
  ['before start',{startAt:now+1},now], ['after end',{startAt:now-3600000},now], ['draft',{status:'draft'},now],
]) test(`judge rejects ${name}`,async()=>{
  const {service,put}=setup({clock:()=>time});put('contests/c1',contestFixture(now,changes));await assert.rejects(service.judge(body,'u1',{}));
});
test('unknown contest/problem membership/language rejected before executing',async()=>{
  let executions=0;const {service}=setup({execute:async()=>{executions++;return result();}});
  for(const change of [{contestId:'unknown'},{problemId:'outside'},{language:'java'}]) await assert.rejects(service.judge({...body,...change},'u1',{}));
  assert.equal(executions,0);
});
test('problem-specific language whitelist is enforced',async()=>{
  const s=setup(); const p=await s.repository.getProblem('p1');s.put('problems/p1',{...p,allowedLanguages:['python']});
  await assert.rejects(s.service.judge(body,'u1',{}),/Ngôn ngữ/);
});
test('Run executes custom stdin and creates no attempts, submission or scoreboard',async()=>{
  let input;const s=setup({execute:async(options)=>{input=options.input;return result('custom');}});
  const response=await s.service.judge({...body,mode:'run',stdin:'custom input'},'u1',{});
  assert.equal(response.result.stdout,'custom');assert.equal(input,'custom input');
  assert.equal((await s.repository.listScoreboard('c1')).length,0);assert.equal((await s.repository.listSubmissions('c1')).length,0);
});
test('partial scoring uses only server samples/private tests; client uid, points, score and tests ignored',async()=>{
  const inputs=[];const s=setup({execute:async(options)=>{inputs.push(options.input);return result('5');}});
  const response=await s.service.judge({...body,uid:'victim',score:100,points:999999,tests:[{input:'ATTACK'}]},'u1',{displayName:'An'});
  assert.deepEqual(inputs,['2 3','PRIVATE_INPUT']); assert.equal(response.score,50);assert.equal(response.earnedPoints,100);
  const rows=await s.repository.listScoreboard('c1');assert.equal(rows[0].uid,'u1');assert.equal(rows[0].problems.p1.attempts,1);
  const json=JSON.stringify(response.results[1]);
  for(const secret of ['PRIVATE_INPUT','PRIVATE_EXPECTED','PRIVATE_STDERR','PRIVATE_COMPILE','PRIVATE_MESSAGE','stdout','stderr','expected','input','compileOutput']) assert.ok(!json.includes(secret),secret);
  const submissions=await s.repository.listSubmissions('c1','u1');
  assert.equal(submissions.length,1);assert.equal(submissions[0].source,body.source);assert.equal(submissions[0].results,undefined);assert.equal(submissions[0].hiddenTests,undefined);
});
test('best/accepted stay monotonic after lower attempts, with complete total across problems',()=>{
  const accepted={uid:'u',problemId:'a',score:100,earnedPoints:100,passed:2,total:2,status:'Accepted',submittedAt:10};
  let row=mergeScoreboard(null,accepted,'An');
  row=mergeScoreboard(row,{...accepted,score:0,earnedPoints:0,passed:0,status:'Wrong Answer',submittedAt:11},'An');
  row=mergeScoreboard(row,{...accepted,problemId:'b',score:60,earnedPoints:90,passed:3,total:5,submittedAt:12},'An');
  assert.equal(row.problems.a.attempts,2);assert.equal(row.problems.a.bestScore,100);assert.equal(row.problems.a.accepted,true);assert.equal(row.problems.a.lastStatus,'Wrong Answer');assert.equal(row.totalScore,190);
});
test('AC/WA/CE/RE/TLE reuse existing Judge verdicts, including CE early stop',async()=>{
  for(const [id,status] of [[6,'Compilation Error'],[5,'Time Limit Exceeded'],[11,'Runtime Error (NZEC)']]){
    const s=setup({execute:async()=>result('',id,status)});
    const response=await s.service.judge(body,'u1',{});assert.equal(response.status,status);assert.equal(response.score,0);assert.equal(response.stoppedEarly,id===6);
  }
  const s=setup({execute:async({input})=>result(input==='2 3'?'5':'PRIVATE_EXPECTED')});
  const accepted=await s.service.judge(body,'u1',{});assert.equal(accepted.status,'Accepted');assert.equal(accepted.earnedPoints,200);
});
test('transaction retries concurrent submissions without lost attempts or stale totalScore',async()=>{
  const s=setup();
  await Promise.all(Array.from({length:15},(_,i)=>s.repository.recordSubmission('c1',{uid:'u1',problemId:i%2?'a':'b',language:'cpp',score:i%3?50:100,earnedPoints:i%3?50:100,passed:i%3?1:2,total:2,status:i%3?'Wrong Answer':'Accepted',source:'code',submittedAt:now+i},'An')));
  const [row]=await s.repository.listScoreboard('c1');
  assert.equal(row.problems.a.attempts+row.problems.b.attempts,15);assert.equal(row.totalScore,200);assert.ok(row.problems.a.accepted&&row.problems.b.accepted);assert.ok(s.retries>0);
  assert.equal((await s.repository.listSubmissions('c1','u1')).length,15);
});
test('leaderboard tie breaks by last submission ascending and stable uid',()=>{
  const rows=rankScoreboard([{uid:'b',totalScore:100,lastSubmissionAt:20},{uid:'a',totalScore:100,lastSubmissionAt:10},{uid:'c',totalScore:150,lastSubmissionAt:30}]);
  assert.deepEqual(rows.map((r)=>r.uid),['c','a','b']);
});
test('authenticated student history only own, teacher all; public problem response is allowlisted',async()=>{
  const s=setup();await s.service.judge(body,'u1',{});await s.service.judge(body,'other',{});
  const handler=createContestHandler({repository:s.repository,authenticate:identity(),clock:()=>now});
  const own=await request(handler,'/api/contests/c1/submissions');assert.equal(own.data.length,1);assert.equal(own.data[0].uid,'u1');
  const teacher=createContestHandler({repository:s.repository,authenticate:identity('t1'),clock:()=>now});
  assert.equal((await request(teacher,'/api/contests/c1/submissions')).data.length,2);
  const p=await request(handler,'/api/contests/c1/problems/p1');
  assert.equal(p.status,200);assert.ok(!JSON.stringify(p.data).includes('hiddenTests'));
});
test('API enforces auth, blocks premature statement access and sanitizes infrastructure errors',async()=>{
  const s=setup();
  const denied=createContestHandler({repository:s.repository,authenticate:async()=>({ok:false,status:401,error:'Login'})});
  assert.equal((await request(denied,'/api/contest/judge',{method:'POST',body})).status,401);
  const upcoming=createContestHandler({repository:s.repository,authenticate:identity(),clock:()=>0});
  assert.equal((await request(upcoming,'/api/contests/c1/problems/p1')).status,403);
  const broken=createContestHandler({repository:s.repository,authenticate:identity(),clock:()=>now,execute:async()=>{throw new Error('PRIVATE_INPUT PRIVATE_EXPECTED');},grade:async()=>{throw new Error('PRIVATE_INPUT');}});
  const failure=await request(broken,'/api/contest/judge',{method:'POST',body});
  assert.equal(failure.status,503);assert.ok(!JSON.stringify(failure).includes('PRIVATE'));
});

test('new contest publication policy requires four distinct problems; drafts and legacy reads remain valid', () => {
  const input = contestFixture(now);
  assert.throws(() => validateContest(input, { status: 'published', minimumProblems: 4 }), /4–26/);
  assert.doesNotThrow(() => validateContest(input, { status: 'draft', minimumProblems: 4 }));
  const problems = ['a', 'b', 'c', 'd'].map(problemId => ({ problemId, points: 100 }));
  assert.equal(validateContest({ ...input, problems }, { status: 'published', minimumProblems: 4 }).problems.length, 4);
});
