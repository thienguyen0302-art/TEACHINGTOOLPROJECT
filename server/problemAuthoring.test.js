import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProblemImport, serializePublicProblem, validateProblem } from '../src/utils/problemAuthoring.js';
import { createContestHandler } from './contest.js';
import { authoredProblem, contestFixture, identity, memoryFirestore, request, seedContest } from './contestTestSupport.js';

test('valid problem and draft without hidden tests', () => {
  assert.equal(validateProblem(authoredProblem(), { status: 'published' }).status, 'published');
  assert.equal(validateProblem(authoredProblem({ hiddenTests: [] })).hiddenTests.length, 0);
});
test('invalid slug and duplicate slug, including other documents', () => {
  for (const slug of ['', 'Bad', 'có-dấu', '../secret', 'under_score']) assert.throws(() => validateProblem(authoredProblem({ slug })));
  assert.throws(() => validateProblem(authoredProblem(), { existingSlugs: ['tong-hai-so'] }), /Slug/);
  assert.doesNotThrow(() => validateProblem(authoredProblem(), { existingSlugs: [{ id: 'p', slug: 'tong-hai-so' }], currentId: 'p' }));
});
test('sample, publish hidden-test, language and difficulty requirements', () => {
  for (const changes of [{ samples: [] }, { hiddenTests: [] }, { allowedLanguages: [] }, { allowedLanguages: ['java'] }, { allowedLanguages: ['cpp','cpp'] }, { difficulty: 'impossible' }]) assert.throws(() => validateProblem(authoredProblem(changes), { status: 'published' }));
});
test('test counts, string types and UTF-8 byte limits', () => {
  for (const changes of [
    { samples: Array(11).fill({ input:'',output:'' }) }, { hiddenTests: Array(51).fill({ input:'',output:'' }) },
    { samples: [{ input: 4, output: '' }] }, { hiddenTests: [{ input: '', output: null }] },
    { hiddenTests: [{ input: 'é'.repeat(10241), output: '' }] },
    { samples: [{ input: '', output: 'x'.repeat(20481) }] },
  ]) assert.throws(() => validateProblem(authoredProblem(changes)));
});
test('large aggregate private document rejected before Firestore 1 MiB limit', () => {
  assert.throws(() => validateProblem(authoredProblem({ hiddenTests: Array(50).fill({ input:'a'.repeat(20000),output:'b'.repeat(20000) }) })), /900 KB/);
});
test('JSON import validates, populates draft, strips official solution and never publishes', () => {
  assert.throws(() => parseProblemImport('{broken'), /JSON/);
  assert.throws(() => parseProblemImport('null'));
  const imported = parseProblemImport(JSON.stringify({ ...authoredProblem(), solution: { code:'SECRET' } }));
  assert.equal(imported.status,'draft'); assert.equal(imported.hiddenTests.length,1); assert.equal(imported.solution,undefined);
});
test('public serializer removes hidden tests, solutions, secrets and nested sample extras', () => {
  const publicData = serializePublicProblem(authoredProblem({ solution:{code:'SECRET'}, apiKey:'KEY', samples:[{input:'1',output:'2',explanation:'',hiddenTests:['LEAK']}] }));
  const json = JSON.stringify(publicData);
  for (const word of ['hiddenTests','PRIVATE_INPUT','PRIVATE_EXPECTED','SECRET','KEY','LEAK','solution']) assert.ok(!json.includes(word),word);
});
test('concurrent slug allocation is atomic; public/private storage stays separate', async () => {
  const store=memoryFirestore();
  const outcomes=await Promise.allSettled([store.repository.saveProblem(null,authoredProblem(),'t1',100),store.repository.saveProblem(null,authoredProblem(),'t1',100)]);
  assert.equal(outcomes.filter((o) => o.status==='fulfilled').length,1);
  const id=outcomes.find((o) => o.status==='fulfilled').value;
  assert.equal(store.records.get(`problems/${id}`).hiddenTests,undefined);
  assert.equal(store.records.get(`problemSecrets/${id}`).hiddenTests.length,1);
});
test('teacher API enforces role; import does not expose private data on list', async () => {
  const store=seedContest();
  const student=createContestHandler({repository:store.repository,authenticate:identity()});
  assert.equal((await request(student,'/api/teacher/problems')).status,403);
  const teacher=createContestHandler({repository:store.repository,authenticate:identity('t1')});
  const list=await request(teacher,'/api/teacher/problems');
  assert.equal(list.status,200); assert.equal(list.data[0].hiddenTestCount,1); assert.equal(list.data[0].hiddenTests,undefined);
  const edit=await request(teacher,'/api/teacher/problems/p1'); assert.equal(edit.data.hiddenTests[0].input,'PRIVATE_INPUT');
});
test('saving authoritative teacher identity ignores client createdBy and disallows unauthenticated authoring', async () => {
  const store=seedContest();
  const teacher=createContestHandler({repository:store.repository,authenticate:identity('t1'),clock:()=>100});
  const saved=await request(teacher,'/api/teacher/problems',{method:'POST',body:authoredProblem({slug:'another',createdBy:'forged'})});
  assert.equal(saved.status,200); assert.equal(store.records.get(`problems/${saved.data.id}`).createdBy,'t1');
  const denied=createContestHandler({repository:store.repository,authenticate:async()=>({ok:false,status:401,error:'Login'})});
  assert.equal((await request(denied,'/api/teacher/problems')).status,401);
});
function fourProblemContest(store, overrides = {}) {
  for (const id of ['p2', 'p3', 'p4']) {
    const problem = authoredProblem({ slug: id });
    store.put(`problems/${id}`, { ...problem, hiddenTests: undefined });
    store.put(`problemSecrets/${id}`, { hiddenTests: problem.hiddenTests });
  }
  return contestFixture(1000000, { ...overrides, problems: ['p1', 'p2', 'p3', 'p4'].map(problemId => ({ problemId, points: 100 })) });
}
test('published contests atomically lock public content and hidden tests, including scheduled contests', async () => {
  const store=seedContest(); const now=1000000;
  const id=await store.repository.saveContest(null,fourProblemContest(store,{startAt:now+10000}),'t1',now);
  assert.ok(id);
  await assert.rejects(store.repository.saveProblem('p1',authoredProblem({hiddenTests:[{input:'CHANGED',output:'0'}]}),'t1',now+1),/khóa/);
  await assert.rejects(store.repository.saveContest(id,contestFixture(now),'t1',now+10001),/bắt đầu/);
  await assert.doesNotReject(store.repository.saveProblem('p1',authoredProblem(),'t1',now+4000000));
});
test('publish checks actual stored problem status and hidden tests inside transaction', async () => {
  const store=seedContest();
  store.put('problemSecrets/p1',{hiddenTests:[]});
  await assert.rejects(store.repository.saveContest(null,fourProblemContest(store),'t1',1000000),/hidden tests/);
  store.put('problems/p1',authoredProblem({status:'draft'}));
  await assert.rejects(store.repository.saveContest(null,fourProblemContest(store),'t1',1000000),/published/);
});

test('incomplete imported drafts may omit samples; publication still requires samples and private tests', () => {
  const draft = validateProblem(authoredProblem({samples: [], hiddenTests: []}), {status:'draft'});
  assert.equal(draft.status,'draft');
  assert.throws(() => validateProblem(draft, {status:'published'}));
});

test('teacher cannot publish fewer than four problems and may keep an incomplete draft', async () => {
  const store = seedContest();
  await assert.rejects(store.repository.saveContest(null, contestFixture(), 't1', 1000000), /4–26/);
  await assert.doesNotReject(store.repository.saveContest(null, contestFixture(1000000, {status:'draft'}), 't1', 1000000));
});
