import { requireValue, validId } from './problemAuthoring.js';
export function timestampMs(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Date.parse(value);
  return NaN;
}
export const contestEnd = (contest) => timestampMs(contest.startAt) + contest.durationMinutes * 60000;
export function contestPhase(contest, now = Date.now()) {
  if (now < timestampMs(contest.startAt)) return 'upcoming';
  return now < contestEnd(contest) ? 'running' : 'ended';
}
export function remainingMs(contest, now = Date.now()) { return Math.max(0, contestEnd(contest) - now); }
export function formatCountdown(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((n) => String(n).padStart(2, '0')).join(':');
}
export function validateContest(input, { publishedProblems, status = 'draft' } = {}) {
  requireValue(input && typeof input === 'object', 'Contest không hợp lệ.');
  requireValue(typeof input.title === 'string' && input.title.trim() && input.title.length <= 300, 'Tên contest không hợp lệ.');
  requireValue(typeof input.description === 'string' && input.description.length <= 20000, 'Mô tả contest không hợp lệ.');
  requireValue(Number.isFinite(timestampMs(input.startAt)), 'Thời gian bắt đầu không hợp lệ.');
  requireValue(Number.isInteger(input.durationMinutes) && input.durationMinutes > 0 && input.durationMinutes <= 1440, 'Thời lượng phải từ 1 đến 1440 phút.');
  requireValue(['draft', 'published'].includes(status), 'Trạng thái không hợp lệ.');
  requireValue(Array.isArray(input.problems) && input.problems.length <= 26 && (status !== 'published' || input.problems.length > 0), 'Contest cần 1–26 bài để publish.');
  const ids = new Set();
  const problems = input.problems.map((entry, index) => {
    requireValue(validId(entry?.problemId) && !ids.has(entry.problemId), 'ID bài không hợp lệ hoặc bị trùng.');
    ids.add(entry.problemId);
    requireValue(Number.isInteger(entry.points) && entry.points > 0 && entry.points <= 10000, 'Điểm mỗi bài phải từ 1 đến 10000.');
    if (status === 'published' && publishedProblems) {
      const problem = publishedProblems.find((p) => p.id === entry.problemId);
      requireValue(problem?.status === 'published' && problem.hiddenTestCount > 0, 'Mỗi bài phải published và có hidden tests.');
    }
    return { problemId: entry.problemId, points: entry.points, label: String.fromCharCode(65 + index) };
  });
  return { title: input.title.trim(), description: input.description, status, startAt: timestampMs(input.startAt), durationMinutes: input.durationMinutes, scoringMode: 'partial', problems };
}
export function mergeScoreboard(previous, submission, displayName) {
  const problems = { ...(previous?.problems ?? {}) };
  const before = problems[submission.problemId] ?? {};
  problems[submission.problemId] = {
    attempts: (before.attempts ?? 0) + 1,
    bestScore: Math.max(before.bestScore ?? 0, submission.score),
    earnedPoints: Math.max(before.earnedPoints ?? 0, submission.earnedPoints),
    accepted: before.accepted === true || submission.passed === submission.total,
    lastStatus: submission.status,
  };
  return { uid: submission.uid, displayName, problems, totalScore: Object.values(problems).reduce((sum, p) => sum + p.earnedPoints, 0), lastSubmissionAt: Math.max(timestampMs(previous?.lastSubmissionAt) || 0, submission.submittedAt) };
}
export function rankScoreboard(rows) {
  return [...rows].sort((a, b) => b.totalScore - a.totalScore || timestampMs(a.lastSubmissionAt) - timestampMs(b.lastSubmissionAt) || a.uid.localeCompare(b.uid));
}
export function problemStatus(state) {
  if (state?.accepted) return 'Accepted';
  if (state?.earnedPoints > 0) return 'Partial';
  return state?.attempts > 0 ? 'Attempted' : 'Chưa làm';
}
