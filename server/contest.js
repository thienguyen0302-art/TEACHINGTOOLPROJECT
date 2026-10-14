import { executeTest, gradeSubmission } from "./judge.js";
import { contestStatus, updateScoreboard } from "../src/utils/contest.js";
const safeId = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export function checkContest(c, problemId, now) {
  if (!c) fail(404, "Không tìm thấy contest.");
  if (c.status !== "published" || contestStatus(c, now) !== "running")
    fail(403, "Contest chưa bắt đầu hoặc đã kết thúc.");
  const entry = c.problems.find((p) => p.problemId === problemId);
  if (!entry) fail(400, "Bài không thuộc contest.");
  return entry;
}
export function createContestJudge({
  repository,
  execute = executeTest,
  grade = gradeSubmission,
  now = Date.now,
  config = {},
}) {
  return async function judge(body, caller, signal) {
    if (!caller?.uid) fail(401, "Cần đăng nhập.");
    const {
      contestId,
      problemId,
      language,
      source,
      mode,
      stdin = "",
    } = body ?? {};
    if (
      !safeId(contestId) ||
      !safeId(problemId) ||
      !["run", "submit"].includes(mode) ||
      typeof source !== "string" ||
      !source.trim() ||
      source.length > 50000 ||
      typeof stdin !== "string" ||
      stdin.length > 20000
    )
      fail(400, "Request không hợp lệ.");
    const [contest, problem, secrets] = await Promise.all([
      repository.get(`contests/${contestId}`),
      repository.get(`problems/${problemId}`),
      repository.get(`problemSecrets/${problemId}`),
    ]);
    const entry = checkContest(contest, problemId, now());
    if (!problem?.published || !secrets?.hiddenTests?.length)
      fail(422, "Bài chưa sẵn sàng để chấm.");
    if (
      !["cpp", "python"].includes(language) ||
      !problem.allowedLanguages.includes(language)
    )
      fail(400, "Ngôn ngữ không được phép.");
    const judgeConfig = {
      ...config,
      source,
      signal,
      languageId: config.languages?.[language] ?? (language === "cpp" ? 2 : 28),
    };
    if (mode === "run") {
      const result = await execute({ ...judgeConfig, input: stdin });
      if (result.statusId >= 13) fail(502, "Máy chấm lỗi nội bộ.");
      return { mode, result };
    }
    const graded = await grade({
      tests: [...problem.samples, ...secrets.hiddenTests],
      publicTestCount: problem.samples.length,
      config: judgeConfig,
    });
    const status =
      graded.score === 100
        ? "Accepted"
        : (graded.results.find((r) => !r.passed)?.status ?? "Wrong Answer");
    // Re-sanitize the judge boundary, including mocked/provider responses.
    const results = graded.results.map((r, i) =>
      i >= problem.samples.length
        ? {
            index: r.index,
            hidden: true,
            passed: r.passed,
            status: r.status,
            time: r.time ?? null,
            memory: r.memory ?? null,
          }
        : { ...r, hidden: false },
    );
    const submittedAt = now();
    const record = {
      uid: caller.uid,
      problemId,
      language,
      score: graded.score,
      earnedPoints: Math.round((entry.points * graded.score) / 100),
      passed: graded.passed,
      total: graded.total,
      status,
      time: Math.max(0, ...results.map((r) => Number(r.time) || 0)),
      memory: Math.max(0, ...results.map((r) => Number(r.memory) || 0)),
      source,
      submittedAt,
    };
    const submissionId = repository.id(`contests/${contestId}/submissions`);
    await repository.transaction(async (tx) => {
      const [current, previous, profile] = await Promise.all([
        tx.get(`contests/${contestId}`),
        tx.get(`contests/${contestId}/scoreboard/${caller.uid}`),
        tx.get(`users/${caller.uid}`),
      ]);
      // Request must still belong to the same published configuration. A request
      // admitted before deadline may finish grading after the deadline.
      if (
        current?.status !== "published" ||
        JSON.stringify(current.problems) !== JSON.stringify(contest.problems) ||
        current.updatedAt !== contest.updatedAt
      )
        fail(409, "Contest đã thay đổi; hãy tải lại.");
      const scoreboard = updateScoreboard(previous, {
        ...record,
        points: entry.points,
        displayName: profile?.displayName || "Học sinh",
      });
      tx.set(`contests/${contestId}/submissions/${submissionId}`, record);
      tx.set(`contests/${contestId}/scoreboard/${caller.uid}`, scoreboard);
    });
    return {
      mode,
      score: graded.score,
      passed: graded.passed,
      total: graded.total,
      stoppedEarly: graded.stoppedEarly,
      results,
      status,
      earnedPoints: record.earnedPoints,
      submissionId,
    };
  };
}
