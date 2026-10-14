export const toMillis = (value) =>
  value == null || value === ""
    ? NaN
    : (value?.toMillis?.() ??
      (typeof value === "number"
        ? value
        : value?.seconds !== undefined
          ? value.seconds * 1000
          : new Date(value).getTime()));
export function contestStatus(contest, now = Date.now()) {
  const start = toMillis(contest.startAt);
  return now < start
    ? "upcoming"
    : now < start + contest.durationMinutes * 60000
      ? "running"
      : "ended";
}
export const problemLabel = (index) => String.fromCharCode(65 + index);
export function validateContest(c, catalog = []) {
  const errors = [];
  if (typeof c.title !== "string" || !c.title.trim() || c.title.length > 200)
    errors.push("Tên contest không hợp lệ.");
  if (!["draft", "published"].includes(c.status))
    errors.push("Trạng thái không hợp lệ.");
  if (!Number.isFinite(toMillis(c.startAt)))
    errors.push("Ngày bắt đầu không hợp lệ.");
  if (
    !Number.isInteger(c.durationMinutes) ||
    c.durationMinutes <= 0 ||
    c.durationMinutes > 10080
  )
    errors.push("Thời lượng phải là số nguyên từ 1 đến 10080 phút.");
  if (
    !Array.isArray(c.problems) ||
    !c.problems.length ||
    c.problems.length > 26
  )
    errors.push("Chọn từ 1 đến 26 bài.");
  else {
    const seen = new Set();
    c.problems.forEach((p, i) => {
      if (!p || typeof p.problemId !== "string" || seen.has(p.problemId))
        errors.push(`Bài ${problemLabel(i)} trống hoặc trùng.`);
      seen.add(p?.problemId);
      if (!Number.isInteger(p?.points) || p.points < 1 || p.points > 10000)
        errors.push(`Điểm bài ${problemLabel(i)} phải từ 1 đến 10000.`);
      if (c.status === "published") {
        const problem = catalog.find((x) => x.id === p?.problemId);
        if (!problem?.published || !problem?.hasHiddenTests)
          errors.push(`Bài ${problemLabel(i)} cần publish và có hidden tests.`);
      }
    });
  }
  return errors;
}
export function updateScoreboard(
  previous,
  { uid, displayName, problemId, points, score, status, submittedAt },
) {
  const problems = { ...(previous?.problems ?? {}) };
  const old = problems[problemId] ?? {};
  const bestScore = Math.max(old.bestScore ?? 0, score);
  problems[problemId] = {
    attempts: (old.attempts ?? 0) + 1,
    bestScore,
    earnedPoints: Math.round((points * bestScore) / 100),
    accepted: old.accepted === true || score === 100,
    lastStatus: status,
  };
  return {
    uid,
    displayName,
    problems,
    totalScore: Object.values(problems).reduce(
      (sum, p) => sum + p.earnedPoints,
      0,
    ),
    lastSubmissionAt: submittedAt,
  };
}
export const sortScoreboard = (rows) =>
  [...rows].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      toMillis(a.lastSubmissionAt) - toMillis(b.lastSubmissionAt) ||
      a.uid.localeCompare(b.uid),
  );
