import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonCompletion } from '../src/utils/lessonCompletion.js';
const chapter = { theory: [{ id: 't1', selfCheck: {} }], quiz: [{}], practice: [{ id: 'p1', runnable: true }], advanced: [{ id: 'a1', runnable: true }] };
test('sections require reading, reflections, submitted quiz and Accepted practice in order', () => {
  const state = { overviewRead: false, reflections: {}, quizSubmitted: false, solvedIds: [] };
  const check = () => lessonCompletion(chapter, state).unlocked;
  assert.deepEqual(check(), { overview: true, theory: false, practice: false, summary: false });
  state.overviewRead = true;
  assert.equal(check().theory, true);
  state.reflections.t1 = '   ';
  assert.equal(check().practice, false);
  state.reflections.t1 = 'My explanation';
  assert.equal(check().practice, true);
  state.quizSubmitted = true;
  assert.equal(check().summary, false);
  state.solvedIds = ['p1'];
  assert.equal(check().summary, true);
});
