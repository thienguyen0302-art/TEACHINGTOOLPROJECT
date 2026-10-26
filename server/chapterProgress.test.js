import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLessonProgress } from '../src/utils/lessonCompletion.js';
import { chapterScore } from '../src/utils/grading.js';
import { normalizeChapterRow, summarizeChapters, mergeLocalState, averageChapterScore, TOTAL_CHAPTERS } from '../src/utils/chapterProgress.js';
import { buildClassOverview } from '../src/utils/teacher.js';
import { filterStudents, buildStudentsCsv } from '../src/utils/studentRoster.js';

const chapter = {
  theory: [{ id: 't1', selfCheck: {} }, { id: 't2', selfCheck: {} }],
  quiz: [
    { id: 'q1', choices: ['a', 'b'], answer: 'a' },
    { id: 'q2', choices: ['a', 'b'], answer: 'b' },
  ],
  practice: [{ id: 'p1', runnable: true }, { id: 'p2', runnable: true }, { id: 'p3', runnable: false }],
};

test('% chương tăng dần theo từng phần đã làm và chỉ chạm 100 khi đủ', () => {
  const base = { chapter, tab: 'overview' };
  assert.equal(computeLessonProgress(base), 0);
  // đọc tổng quan: 10
  assert.equal(computeLessonProgress({ ...base, overviewRead: true }), 10);
  // 1/2 self-check: +10
  assert.equal(computeLessonProgress({ ...base, overviewRead: true, reflections: { t1: 'x' } }), 20);
  // 1/2 quiz: +15
  assert.equal(computeLessonProgress({ ...base, overviewRead: true, reflections: { t1: 'x' }, answers: { q1: 'a' } }), 35);
  // 1/2 bài code bắt buộc: +15 (p3 không bắt buộc, không tính)
  assert.equal(computeLessonProgress({ ...base, overviewRead: true, reflections: { t1: 'x' }, answers: { q1: 'a' }, solvedIds: ['p1', 'p3'] }), 50);

  const full = { chapter, overviewRead: true, reflections: { t1: 'x', t2: 'y' }, quizSubmitted: true, solvedIds: ['p1', 'p2'] };
  assert.equal(computeLessonProgress({ ...full, tab: 'practice' }), 90); // chưa vào Tổng kết
  assert.equal(computeLessonProgress({ ...full, tab: 'summary' }), 100);
  assert.equal(computeLessonProgress({ ...full, tab: 'practice', summaryVisited: true }), 100);
});

test('học hết chương không bị kẹt ở 83%/95%: đủ mọi phần thì đúng 100', () => {
  const only = { theory: [], quiz: [], practice: [] };
  assert.equal(computeLessonProgress({ chapter: only, overviewRead: true, summaryVisited: true, tab: 'summary' }), 100);
});

test('điểm chương = TB quiz% và % bài code bắt buộc', () => {
  assert.equal(chapterScore(chapter, { quizPercent: 100, quizSubmitted: true, solvedIds: ['p1'] }).score, 75);
  assert.equal(chapterScore(chapter, { quizPercent: 100, quizSubmitted: false, solvedIds: [] }).score, 0);
});

test('normalizeChapterRow: chương mới chỉ xem không có điểm; dữ liệu cũ vẫn đọc được', () => {
  assert.equal(normalizeChapterRow({ chapterId: 'ch01', progressPercent: 30 }).score, null);
  assert.equal(normalizeChapterRow({ chapterId: 'ch01', completed: true, chapterScore: 80 }).percent, 100);
  // bản ghi cũ không có progressPercent hợp lệ: không dùng bestScore làm % tiến độ
  assert.equal(normalizeChapterRow({ chapterId: 'ch01', bestScore: 83 }).percent, 0);
  assert.equal(normalizeChapterRow({ chapterId: 'ch01', bestScore: 83 }).score, 83);
  assert.equal(normalizeChapterRow({ chapterId: 'ch01', progressPercent: 100 }).percent, 99); // chưa completed => tối đa 99
});

test('mergeLocalState ưu tiên bản mới hơn, không ghi đè chương đã hoàn thành', () => {
  const remote = { progressPercent: 40 };
  assert.equal(mergeLocalState(remote, { progressPercent: 60 }).progressPercent, 60);
  assert.equal(mergeLocalState(remote, { progressPercent: 10 }).progressPercent, 40);
  assert.equal(mergeLocalState({ completed: true, progressPercent: 100 }, { progressPercent: 5 }).progressPercent, 100);
});

test('summarizeChapters: đếm chương hoàn thành trên tổng số chương của lộ trình', () => {
  const rows = [
    { language: 'cpp', chapterId: 'ch01', completed: true, chapterScore: 90, quizSubmitted: true },
    { language: 'cpp', chapterId: 'ch02', progressPercent: 50, chapterScore: 40, quizSubmitted: true },
    { language: 'python', chapterId: 'ch03', completed: true, chapterScore: 100 },
  ];
  const s = summarizeChapters(rows, 'cpp');
  assert.equal(s.total, TOTAL_CHAPTERS);
  assert.equal(s.completedCount, 1);
  assert.equal(s.chapters.length, TOTAL_CHAPTERS);
  assert.equal(s.avgScore, 65);
  assert.deepEqual(s.weakChapters.map((c) => c.chapterId), ['ch02']);
  assert.equal(s.overallPercent, Math.round((100 + 50) / TOTAL_CHAPTERS));
  assert.equal(averageChapterScore(rows.filter((r) => r.language === 'cpp')), 65);
});

test('teacher overview + lọc + CSV dùng cùng số liệu', () => {
  const users = [{ uid: 'a', displayName: 'An', language: 'cpp', lastActive: Date.now() }];
  const rows = [
    { uid: 'a', language: 'cpp', chapterId: 'ch01', completed: true, chapterScore: 90, quizSubmitted: true },
    { uid: 'a', language: 'cpp', chapterId: 'ch02', progressPercent: 40, chapterScore: 40, quizSubmitted: true },
  ];
  const o = buildClassOverview(users, rows);
  const s = o.students[0];
  assert.equal(s.chaptersCompleted, 1);
  assert.equal(s.chaptersTotal, TOTAL_CHAPTERS);
  assert.equal(s.chapterProgress.length, TOTAL_CHAPTERS);
  assert.equal(filterStudents(o.students, { status: 'warning' }).length, 1);
  assert.equal(filterStudents(o.students, { search: 'zzz' }).length, 0);
  assert.match(buildStudentsCsv(o.students), new RegExp(`"1/${TOTAL_CHAPTERS}"`));
});
