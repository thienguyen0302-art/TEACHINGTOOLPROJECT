import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTheoryRows, buildExerciseRows, buildContestRows, summarizeHistory, filterRows, codeKind } from '../src/utils/submissionHistory.js';

const progress = [
  { language: 'cpp', chapterId: 'ch02', reflections: { t1: 'Biến là ô nhớ', t2: '  ' }, quizSubmitted: true, attempts: 2, quizScore: 80, correct: 4, total: 5, updatedAt: { toMillis: () => 2000 } },
  { language: 'cpp', chapterId: 'ch01', reflections: {}, attempts: 0, updatedAt: { toMillis: () => 1000 } },
];
const chapters = { cpp_ch02: { theory: [{ id: 't1', title: 'Biến', selfCheck: {} }, { id: 't2', title: 'Kiểu', selfCheck: {} }] } };
const subs = [
  { id: 'a', sourceType: 'lesson', section: 'practice', problemId: 'p1', language: 'cpp', chapterId: 'ch02', attempts: 3, bestScore: 100, solved: true, passed: 5, total: 5, lastSubmittedAt: 5000 },
  { id: 'b', sourceType: 'lesson', section: 'advanced', problemId: 'h1', language: 'cpp', chapterId: 'ch02', attempts: 1, bestScore: 40, solved: false, passed: 2, total: 5, lastSubmittedAt: 4000 },
  { id: 'c', sourceType: 'problem-bank', problemId: 'bank1', language: 'python', attempts: 1, bestScore: 100, solved: true, lastSubmittedAt: 3000 },
];

test('phân loại bài code: thực hành / nâng cao / kho bài tập', () => {
  assert.equal(codeKind(subs[0]), 'practice');
  assert.equal(codeKind(subs[1]), 'advanced');
  assert.equal(codeKind(subs[2]), 'problem-bank');
});

test('Lý thuyết: chỉ lấy câu Self-Check đã viết, bỏ câu trống, gắn tiêu đề', () => {
  const rows = buildTheoryRows(progress, chapters);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Biến');
  assert.equal(rows[0].answer, 'Biến là ô nhớ');
  assert.equal(rows[0].totalInChapter, 2);
});

test('Bài tập: gộp quiz và 3 loại bài code, mới nhất trước', () => {
  const rows = buildExerciseRows(progress, subs);
  assert.deepEqual(rows.map((r) => r.kind), ['practice', 'advanced', 'problem-bank', 'quiz']);
  assert.equal(rows.find((r) => r.kind === 'quiz').detail, '4/5 câu đúng');
  assert.equal(rows.find((r) => r.kind === 'advanced').solved, false);
});

test('Contest: chỉ lấy bài của đúng học sinh, từng lần nộp', () => {
  const contests = [{ id: 'k1', title: 'HSG tháng 10' }];
  const byContest = { k1: [
    { id: 's1', uid: 'u1', problemId: 'A', status: 'Accepted', score: 100, earnedPoints: 50, passed: 5, total: 5, source: 'int main(){}', submittedAt: 9000 },
    { id: 's2', uid: 'u2', problemId: 'A', status: 'Wrong Answer', score: 0, submittedAt: 9500 },
    { id: 's3', uid: 'u1', problemId: 'B', status: 'Wrong Answer', score: 40, earnedPoints: 20, passed: 2, total: 5, submittedAt: 8000 },
  ] };
  const rows = buildContestRows('u1', contests, byContest);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.problemId), ['A', 'B']);
  assert.equal(rows[0].accepted, true);
  assert.equal(rows[0].source, 'int main(){}');
});

test('summarize + filter', () => {
  const ex = buildExerciseRows(progress, subs);
  const s = summarizeHistory({ theory: buildTheoryRows(progress, chapters), exercise: ex, contest: [] });
  assert.equal(s.exercise.count, 4);
  assert.equal(s.exercise.solved, 3);
  assert.equal(s.exercise.attempts, 2 + 3 + 1 + 1);
  assert.equal(filterRows(ex, { kind: 'advanced' }).length, 1);
  assert.equal(filterRows(ex, { status: 'notyet' }).length, 1);
  assert.equal(filterRows(ex, { language: 'python' }).length, 1);
  assert.equal(filterRows(ex, { search: 'bank1' }).length, 1);
});
