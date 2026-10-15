import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createContestRepository } from './contestRepository.js';
import { authoredProblem, contestFixture } from './contestTestSupport.js';
import { serializePublicProblem } from '../src/utils/problemAuthoring.js';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('test:rules requires FIRESTORE_EMULATOR_HOST; use firebase emulators:exec --only firestore.');
const projectId='demo-peanutcode-contest';
let env, adminApp, repository;
before(async()=>{
  env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
  adminApp=initializeApp({projectId},'contest-security-test');repository=createContestRepository(getFirestore(adminApp));
});
after(async()=>{await env?.cleanup();if(adminApp) await deleteApp(adminApp);});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async(context)=>{
    const db=context.firestore();
    const problem=authoredProblem();
    await Promise.all([
      setDoc(doc(db,'users/student'),{displayName:'An'}),setDoc(doc(db,'users/other'),{displayName:'Binh'}),setDoc(doc(db,'users/teacher'),{role:'teacher'}),
      setDoc(doc(db,'problems/p1'),{...serializePublicProblem(problem),createdBy:'teacher',createdAt:Timestamp.now(),updatedAt:Timestamp.now()}),
      setDoc(doc(db,'problemSecrets/p1'),{hiddenTests:problem.hiddenTests,updatedAt:Timestamp.now()}),setDoc(doc(db,'problemSlugs/tong-hai-so'),{problemId:'p1'}),
      setDoc(doc(db,'contests/c1'),{...contestFixture(Date.now()),startAt:Timestamp.fromMillis(Date.now()-10000)}),
      setDoc(doc(db,'contests/draft'),{...contestFixture(Date.now()),status:'draft'}),
      setDoc(doc(db,'contests/c1/scoreboard/student'),{uid:'student',displayName:'An',problems:{},totalScore:0,lastSubmissionAt:Timestamp.now()}),
      setDoc(doc(db,'contests/c1/submissions/one'),{uid:'student',source:'my source'}),setDoc(doc(db,'contests/c1/submissions/two'),{uid:'other',source:'other source'}),
    ]);
  });
});
const student=()=>env.authenticatedContext('student').firestore();
const teacher=()=>env.authenticatedContext('teacher').firestore();
test('student reads published public docs and scoreboard, never private tests/drafts',async()=>{
  const db=student();
  await assertSucceeds(getDoc(doc(db,'problems/p1')));await assertSucceeds(getDoc(doc(db,'contests/c1')));await assertSucceeds(getDocs(collection(db,'contests/c1/scoreboard')));
  await assertFails(getDoc(doc(db,'problemSecrets/p1')));await assertFails(getDocs(collection(db,'problemSecrets')));await assertFails(getDoc(doc(db,'contests/draft')));
});
test('student can query own submissions but cannot read other source or query all',async()=>{
  const db=student();await assertSucceeds(getDoc(doc(db,'contests/c1/submissions/one')));
  await assertSucceeds(getDocs(query(collection(db,'contests/c1/submissions'),where('uid','==','student'))));
  await assertFails(getDoc(doc(db,'contests/c1/submissions/two')));await assertFails(getDocs(collection(db,'contests/c1/submissions')));
});
test('no client, including teachers, can forge scoreboard or submissions',async()=>{
  for(const db of [student(),teacher()]){
    await assertFails(setDoc(doc(db,'contests/c1/scoreboard/forged'),{uid:'student',totalScore:999}));
    await assertFails(setDoc(doc(db,'contests/c1/submissions/forged'),{uid:'student',score:100}));
    await assertFails(updateDoc(doc(db,'contests/c1/scoreboard/student'),{totalScore:999}));
  }
});
test('teacher reads secrets, all submissions, and edits valid unlocked problem data',async()=>{
  const db=teacher();await assertSucceeds(getDoc(doc(db,'problemSecrets/p1')));await assertSucceeds(getDocs(collection(db,'contests/c1/submissions')));
  await assertSucceeds(updateDoc(doc(db,'problems/p1'),{title:'Teacher update'}));
  await assertSucceeds(updateDoc(doc(db,'problemSecrets/p1'),{hiddenTests:[{input:'1',output:'2'}]}));
  await assertFails(updateDoc(doc(db,'problems/p1'),{hiddenTests:[{input:'LEAK',output:'LEAK'}]}));
});
test('problem lock denies teacher direct fairness edits; client cannot remove lock or publish contest',async()=>{
  await env.withSecurityRulesDisabled((context)=>setDoc(doc(context.firestore(),'problemLocks/p1'),{until:Timestamp.fromMillis(Date.now()+3600000)}));
  const db=teacher();await assertFails(updateDoc(doc(db,'problemSecrets/p1'),{hiddenTests:[{input:'changed',output:'changed'}]}));
  await assertFails(updateDoc(doc(db,'problems/p1'),{statement:'changed'}));
  await assertFails(updateDoc(doc(db,'problemLocks/p1'),{until:Timestamp.fromMillis(0)}));
  await assertFails(updateDoc(doc(db,'contests/draft'),{status:'published'}));
  await assertFails(updateDoc(doc(db,'contests/c1'),{durationMinutes:500}));
});
test('student cannot promote role or write authoring data, anonymous denied',async()=>{
  const db=student();await assertFails(updateDoc(doc(db,'users/student'),{role:'teacher'}));
  await assertFails(updateDoc(doc(db,'problemSecrets/p1'),{hiddenTests:[]}));await assertFails(updateDoc(doc(db,'problems/p1'),{title:'attack'}));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'contests/c1')));
});
test('actual Admin SDK transactions preserve attempts and scores under concurrent writes',async()=>{
  await Promise.all(Array.from({length:8},(_,i)=>repository.recordSubmission('c1',{uid:'student',problemId:'p1',language:'cpp',score:i===0?100:50,earnedPoints:i===0?200:100,passed:i===0?2:1,total:2,status:i===0?'Accepted':'Wrong Answer',source:'review source',submittedAt:Date.now()+i},'An')));
  const row=(await repository.listScoreboard('c1')).find((r)=>r.uid==='student');
  assert.equal(row.problems.p1.attempts,8);assert.equal(row.problems.p1.bestScore,100);assert.equal(row.totalScore,200);assert.equal(row.problems.p1.accepted,true);
  assert.equal((await repository.listSubmissions('c1','student')).length,9);
});
