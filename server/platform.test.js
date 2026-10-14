import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { buildExamRecord, mergeSubmission, submissionDocId } from '../src/utils/persistence.js';
import { calcStreak, dateKey, monthGrid, weekSummary } from '../src/utils/activity.js';
import { isProfileComplete, normalizeProfile } from '../src/utils/profile.js';
import { calcPoints, mergeLeaderboardEntry, rankEntries } from '../src/utils/ranking.js';
import { buildClassOverview } from '../src/utils/teacher.js';
import { createAuthGuard, verifyIdToken } from './auth.js';

const contract = { problemId: 'p', slug: 'lesson/cpp/ch01/practice/x', chapterId: 'ch01', sourceType: 'lesson', section: 'practice', language: 'cpp', status: 'attempted', score: 50, passed: 3, total: 6 };

test('doc id của bài Lesson không chứa dấu /', () => {
  assert.equal(submissionDocId(contract), 'cpp_lesson__cpp__ch01__practice__x');
});

test('mergeSubmission cộng dồn attempts, giữ best và solved', () => {
  const first = mergeSubmission(null, contract);
  assert.equal(first.attempts, 1);
  const second = mergeSubmission(first, { ...contract, status: 'accepted', score: 100, passed: 6 });
  assert.deepEqual([second.attempts, second.bestScore, second.solved], [2, 100, true]);
  const third = mergeSubmission(second, { ...contract, score: 20 });
  assert.deepEqual([third.attempts, third.bestScore, third.solved, third.lastScore], [3, 100, true, 20]);
});

test('buildExamRecord tính lại điểm và từ chối dữ liệu sai', () => {
  const ok = buildExamRecord({ examId: 'e1', language: 'cpp', correct: 7, total: 10, durationSec: 600, score: 999 });
  assert.equal(ok.score, 70);
  assert.deepEqual([ok.maxScore, ok.points], [20, 14]); // 7/10 của thang 20
  assert.equal(buildExamRecord({ examId: 'e1', language: 'cpp', correct: 3, total: 7, durationSec: 1, maxScore: 10 }).points, 4.29);
  assert.throws(() => buildExamRecord({ examId: 'a.b', language: 'cpp', correct: 1, total: 2, durationSec: 1 }), /examId/);
  assert.equal(ok.autoSubmitted, false);
  for (const bad of [{}, { examId: 'e', language: 'java', correct: 1, total: 2, durationSec: 1 },
    { examId: 'e', language: 'cpp', correct: 3, total: 2, durationSec: 1 },
    { examId: 'e', language: 'cpp', correct: 1, total: 0, durationSec: 1 },
    { examId: 'e', language: 'cpp', correct: 1, total: 2, durationSec: -1 }]) {
    assert.throws(() => buildExamRecord(bad));
  }
});

test('calcStreak: chuỗi liên tiếp, hôm nay chưa học thì chưa đứt', () => {
  const now = new Date(2026, 9, 11, 12); // Chủ nhật 11/10/2026
  const day = (offset) => dateKey(new Date(2026, 9, 11 + offset));
  assert.equal(calcStreak({}, now), 0);
  assert.equal(calcStreak({ [day(0)]: 300, [day(-1)]: 300, [day(-2)]: 61 }, now), 3);
  assert.equal(calcStreak({ [day(-1)]: 300, [day(-2)]: 300 }, now), 2);
  assert.equal(calcStreak({ [day(0)]: 30, [day(-1)]: 300 }, now), 1); // 30 giây hôm nay chưa tính
  assert.equal(calcStreak({ [day(-2)]: 300 }, now), 0); // đã đứt
});

test('weekSummary bắt đầu từ thứ Hai và đánh dấu hôm nay', () => {
  const now = new Date(2026, 9, 14, 9); // Thứ Tư 14/10/2026
  const w = weekSummary({ '2026-10-12': 120, '2026-10-14': 600 }, now);
  assert.equal(w.days[0].key, '2026-10-12');
  assert.equal(w.days[2].isToday, true);
  assert.equal(w.days[3].isFuture, true);
  assert.equal(w.activeCount, 2);
  assert.equal(w.totalSeconds, 720);
});

test('buildClassOverview: chương yếu cả lớp và theo từng học sinh', () => {
  const now = Date.UTC(2026, 9, 11);
  const users = [
    { uid: 't', role: 'teacher' },
    { uid: 'a', displayName: 'An', className: '9A2', school: 'THCS Hạ Long', language: 'cpp', studySeconds: 3600, lastActive: now - 3600e3 },
    { uid: 'b', email: 'b@x.vn', language: 'cpp', lastActive: now - 20 * 86400e3 },
  ];
  const rows = [
    { uid: 'a', language: 'cpp', chapterId: 'ch01', bestScore: 90, completed: true },
    { uid: 'a', language: 'cpp', chapterId: 'ch02', bestScore: 40, completed: false },
    { uid: 'b', language: 'cpp', chapterId: 'ch02', bestScore: 50, completed: false },
  ];
  const o = buildClassOverview(users, rows, { now });
  assert.equal(o.studentCount, 2); // giáo viên không tính
  assert.equal(o.activeLast7d, 1);
  assert.equal(o.weakChapters[0].chapterId, 'ch02');
  assert.equal(o.weakChapters[0].avgScore, 45);
  assert.equal(o.students[0].name, 'An'); // hoạt động gần nhất lên đầu
  assert.equal(o.students[0].className, '9A2');
  assert.equal(o.students[0].weakChapters[0].chapterId, 'ch02');
});

test('monthGrid: tháng 10/2026 bắt đầu thứ Năm, phân mức học theo số giây', () => {
  const now = new Date(2026, 9, 14);
  const m = monthGrid({ '2026-10-01': 30, '2026-10-02': 120, '2026-10-14': 4000 }, now);
  assert.equal(m.title, 'Tháng 10, 2026');
  assert.equal(m.days.length, 31);
  assert.equal(m.offset, 3); // 1/10/2026 là thứ Năm -> 3 ô trống (T2, T3, T4)
  assert.deepEqual(m.days.slice(0, 2).map((d) => d.level), [0, 1]); // 30 giây chưa tính
  assert.equal(m.days[13].level, 2);
  assert.equal(m.days[13].isToday, true);
  assert.equal(m.days[14].isFuture, true);
  assert.equal(m.studiedDays, 2);
});

test('normalizeProfile chuẩn hoá khoảng trắng và từ chối dữ liệu thiếu/quá dài', () => {
  const ok = normalizeProfile({ displayName: '  Nguyễn   Minh Anh ', school: 'THCS Hạ Long', className: '9A2', province: 'Quảng Ninh', district: 'Hạ Long' });
  assert.equal(ok.displayName, 'Nguyễn Minh Anh');
  assert.equal(isProfileComplete(ok), true);
  assert.equal(isProfileComplete({ displayName: 'A' }), false);
  assert.throws(() => normalizeProfile({ ...ok, school: '' }), /tên trường/);
  assert.throws(() => normalizeProfile({ ...ok, className: 'x'.repeat(81) }), /quá dài/);
});

test('calcPoints và mergeLeaderboardEntry: mỗi đề chỉ giữ điểm cao nhất', () => {
  assert.equal(calcPoints(18, 20), 18);
  const profile = { displayName: 'An', school: 'THCS A', className: '9A', province: 'Hà Nội', district: 'Ba Đình' };
  const first = mergeLeaderboardEntry(null, { uid: 'u1', examId: 'E1', points: 12, profile });
  assert.deepEqual([first.total, first.examCount, first.average], [12, 1, 12]);
  const second = mergeLeaderboardEntry(first, { uid: 'u1', examId: 'E2', points: 15.5, profile });
  assert.deepEqual([second.total, second.examCount, second.average], [27.5, 2, 13.75]);
  const retake = mergeLeaderboardEntry(second, { uid: 'u1', examId: 'E1', points: 8, profile }); // thi lại điểm thấp hơn
  assert.equal(retake.total, 27.5);
  const better = mergeLeaderboardEntry(second, { uid: 'u1', examId: 'E1', points: 20, profile });
  assert.equal(better.total, 35.5);
  assert.equal(mergeLeaderboardEntry(null, { uid: 'u', examId: 'E', points: 1, profile: { email: 'x@y.vn' } }).displayName, 'x');
});

test('rankEntries: cùng điểm cùng hạng, hạng kế tiếp nhảy cóc', () => {
  const ranked = rankEntries([
    { uid: 'a', displayName: 'A', total: 30, average: 15 },
    { uid: 'b', displayName: 'B', total: 40, average: 20 },
    { uid: 'c', displayName: 'C', total: 30, average: 15 },
    { uid: 'd', displayName: 'D', total: 10, average: 10 },
  ]);
  assert.deepEqual(ranked.map((e) => [e.uid, e.rank]), [['b', 1], ['a', 2], ['c', 2], ['d', 4]]);
});

// --- Xác thực ID token ---
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = publicKey.export({ type: 'spki', format: 'pem' });
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function makeToken(claims = {}, header = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'RS256', kid: 'k1', ...header });
  const p = b64({ aud: 'proj', iss: 'https://securetoken.google.com/proj', sub: 'u1', iat: now - 10, exp: now + 3600, email_verified: true, ...claims });
  const sig = createSign('RSA-SHA256').update(`${h}.${p}`).sign(privateKey).toString('base64url');
  return `${h}.${p}.${sig}`;
}
const getKeys = async () => ({ k1: pem });

test('verifyIdToken chấp nhận token hợp lệ', async () => {
  const user = await verifyIdToken(makeToken(), { projectId: 'proj', getKeys });
  assert.deepEqual(user, { uid: 'u1', emailVerified: true });
});

test('verifyIdToken từ chối token sai/hết hạn/dự án khác/bị sửa', async () => {
  const exp = Math.floor(Date.now() / 1000) - 5;
  await assert.rejects(verifyIdToken(makeToken({ exp }), { projectId: 'proj', getKeys }), /hết hạn/);
  await assert.rejects(verifyIdToken(makeToken({ aud: 'other' }), { projectId: 'proj', getKeys }), /dự án khác/);
  await assert.rejects(verifyIdToken(makeToken({}, { kid: 'zzz' }), { projectId: 'proj', getKeys }), /không hợp lệ/);
  await assert.rejects(verifyIdToken(makeToken({}, { alg: 'none' }), { projectId: 'proj', getKeys }), /không hợp lệ/);
  const [h, , s] = makeToken().split('.');
  await assert.rejects(verifyIdToken(`${h}.${b64({ sub: 'hacker', aud: 'proj', iss: 'https://securetoken.google.com/proj', exp: 9e9, iat: 1 })}.${s}`, { projectId: 'proj', getKeys }), /Chữ ký/);
  await assert.rejects(verifyIdToken('abc', { projectId: 'proj', getKeys }), /không hợp lệ/);
});

test('createAuthGuard: dev bỏ qua, production bắt buộc token + email đã xác minh', async () => {
  const dev = createAuthGuard({ required: false });
  assert.equal((await dev({ headers: {} })).ok, true);

  const guard = createAuthGuard({ projectId: 'proj', required: true, getKeys });
  assert.equal((await guard({ headers: {} })).status, 401);
  assert.equal((await guard({ headers: { authorization: 'Bearer rác' } })).status, 401);
  const good = await guard({ headers: { authorization: `Bearer ${makeToken()}` } });
  assert.deepEqual([good.ok, good.uid], [true, 'u1']);
  const unverified = await guard({ headers: { authorization: `Bearer ${makeToken({ email_verified: false })}` } });
  assert.equal(unverified.status, 403);
  assert.equal((await createAuthGuard({ required: true })({ headers: {} })).status, 503);
});
