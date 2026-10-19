import test from 'node:test';
import assert from 'node:assert/strict';
import {createContestHandler,createContestService} from './contest.js';
import {seedContest,request,identity,authoredProblem} from './contestTestSupport.js';
const now=1000000;
const setup=(uid='t1')=>{const s=seedContest(now);return {...s,handler:createContestHandler({repository:s.repository,authenticate:identity(uid),clock:()=>now})};};
test('teacher opts existing contest problem into practice; student sees public fields only; removal works',async()=>{
 const s=setup();
 assert.equal((await request(s.handler,'/api/teacher/problems/p1/practice',{method:'PUT',body:{published:true}})).status,200);
 const student=createContestHandler({repository:s.repository,authenticate:identity(),clock:()=>now});
 const listed=await request(student,'/api/practice');assert.equal(listed.data.length,1);
 const detail=await request(student,'/api/practice/p1');assert.equal(detail.data.id,'p1');assert.equal(detail.data.hiddenTests,undefined);assert.ok(!JSON.stringify(detail).includes('PRIVATE'));
 assert.equal((await s.repository.getContest('c1')).problems[0].problemId,'p1');
 await request(s.handler,'/api/teacher/problems/p1/practice',{method:'PUT',body:{published:false}});
 assert.equal((await request(student,'/api/practice/p1')).status,404);
});
test('role, draft, malformed toggle and contest locks reject publication; locked problems hidden on list/detail/judge',async()=>{
 const s=setup('u1');assert.equal((await request(s.handler,'/api/teacher/problems/p1/practice',{method:'PUT',body:{published:true}})).status,403);
 const teacher=createContestHandler({repository:s.repository,authenticate:identity('t1'),clock:()=>now});
 assert.equal((await request(teacher,'/api/teacher/problems/p1/practice',{method:'PUT',body:{published:'yes'}})).status,400);
 s.put('problems/p1',authoredProblem({id:'p1',status:'draft'}));
 assert.equal((await request(teacher,'/api/teacher/problems/p1/practice',{method:'PUT',body:{published:true}})).status,400);
 s.put('problems/p1',authoredProblem({id:'p1',practicePublished:true}));s.put('problemLocks/p1',{until:now+1});
 assert.equal((await request(teacher,'/api/teacher/problems/p1/practice',{method:'PUT',body:{published:true}})).status,409);
 assert.deepEqual((await request(s.handler,'/api/practice')).data,[]);
 assert.equal((await request(s.handler,'/api/practice/p1')).status,404);
 const service=createContestService({repository:s.repository,clock:()=>now,execute:()=>{throw Error('must not execute');}});
 await assert.rejects(service.judge({problemId:'p1',language:'cpp',source:'code',mode:'run'},'u1',{},null,true),/chưa mở/);
});
test('practice judge uses private tests, redacts outputs, and never changes contest submissions or scoreboard',async()=>{
 const s=setup();s.put('problems/p1',authoredProblem({id:'p1',practicePublished:true}));
 const service=createContestService({repository:s.repository,clock:()=>now,grade:async({tests})=>({passed:1,total:tests.length,score:50,results:tests.map((t,index)=>({index,passed:index===0,status:'Wrong Answer',input:t.input,expected:t.output,stdout:'private'}))})});
 const result=await service.judge({problemId:'p1',language:'cpp',source:'code',mode:'submit',score:100},'u1',{},null,true);
 assert.equal(result.score,50);assert.equal(result.results[1].input,undefined);assert.equal(result.results[1].stdout,undefined);
 assert.equal((await s.repository.listSubmissions('c1')).length,0);assert.equal((await s.repository.listScoreboard('c1')).length,0);
});
