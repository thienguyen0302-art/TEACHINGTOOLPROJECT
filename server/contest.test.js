import test from "node:test";
import assert from "node:assert/strict";
import {
  contestStatus,
  problemLabel,
  sortScoreboard,
  updateScoreboard,
  validateContest,
} from "../src/utils/contest.js";
import { createContestJudge } from "./contest.js";
import { gradeSubmission } from "./judge.js";
import { memoryRepository } from "./testRepository.js";
const contest = {
  id: "c",
  title: "HSG",
  status: "published",
  startAt: 1000,
  durationMinutes: 1,
  updatedAt: 10,
  problems: [
    { problemId: "p", label: "A", points: 200 },
    { problemId: "q", label: "B", points: 150 },
  ],
};
const problem = {
  id: "p",
  published: true,
  allowedLanguages: ["cpp", "python"],
  samples: [{ input: "public", output: "5" }],
};
const body = {
  contestId: "c",
  problemId: "p",
  language: "cpp",
  source: "code",
  mode: "submit",
};
function setup({
  now = () => 2000,
  execute = async () => ({
    statusId: 3,
    status: "Accepted",
    stdout: "5",
    time: "0.1",
    memory: 100,
  }),
} = {}) {
  const repository = memoryRepository({
    "contests/c": contest,
    "problems/p": problem,
    "problems/q": { ...problem, id: "q" },
    "problemSecrets/p": { hiddenTests: [{ input: "TOP-SECRET", output: "5" }] },
    "problemSecrets/q": { hiddenTests: [{ input: "TOP-SECRET", output: "5" }] },
    "users/u": { displayName: "An" },
  });
  const judge = createContestJudge({
    repository,
    now,
    execute,
    grade: (options) => gradeSubmission({ ...options, execute }),
  });
  return { repository, judge };
}
test("status boundaries use timestamps; labels A/B/C", () => {
  assert.equal(contestStatus(contest, 999), "upcoming");
  assert.equal(contestStatus(contest, 1000), "running");
  assert.equal(contestStatus(contest, 60999), "running");
  assert.equal(contestStatus(contest, 61000), "ended");
  assert.deepEqual([0, 1, 2].map(problemLabel), ["A", "B", "C"]);
  assert.equal(
    contestStatus({ ...contest, startAt: { seconds: 1 } }, 1000),
    "running",
  );
});
test("contest validation rejects zero problems, bad duration, duplicate problems, unpublished and missing secrets", () => {
  const catalog = [
    { id: "p", published: true, hasHiddenTests: true },
    { id: "q", published: true, hasHiddenTests: true },
  ];
  assert.deepEqual(validateContest(contest, catalog), []);
  for (const patch of [
    { problems: [] },
    { durationMinutes: 0 },
    { durationMinutes: -1 },
    { startAt: "bad" },
    { problems: [contest.problems[0], contest.problems[0]] },
    { problems: [{ problemId: "missing", points: 100 }] },
    { problems: [{ problemId: "p", points: 0 }] },
  ])
    assert.ok(validateContest({ ...contest, ...patch }, catalog).length);
  assert.ok(
    validateContest(contest, [
      { id: "p", published: true, hasHiddenTests: false },
    ]).length,
  );
});
for (const [label, request, now, status] of [
  ["before start", body, 999, 403],
  ["at end", body, 61000, 403],
  ["after end", body, 70000, 403],
  ["problem not in contest", { ...body, problemId: "other" }, 2000, 400],
  ["invalid language", { ...body, language: "java" }, 2000, 400],
  ["empty source", { ...body, source: " " }, 2000, 400],
  ["bad mode", { ...body, mode: "hack" }, 2000, 400],
  ["path traversal", { ...body, problemId: "../p" }, 2000, 400],
])
  test(`judge rejects ${label}`, async () => {
    const { judge } = setup({ now: () => now });
    await assert.rejects(
      judge(request, { uid: "u" }),
      (e) => e.status === status,
    );
  });
test("auth required even when UID supplied in body", async () => {
  const { judge } = setup();
  await assert.rejects(
    judge({ ...body, uid: "u" }, {}),
    (e) => e.status === 401,
  );
});
test("draft contest, absent problem and missing secrets rejected", async () => {
  for (const [path, value, status] of [
    ["contests/c", { ...contest, status: "draft" }, 403],
    ["problems/p", null, 422],
    ["problemSecrets/p", null, 422],
  ]) {
    const { repository, judge } = setup();
    repository.documents.set(path, value);
    await assert.rejects(judge(body, { uid: "u" }), (e) => e.status === status);
  }
});
test("run uses custom stdin without writes, attempts or scores", async () => {
  let seen;
  const { repository, judge } = setup({
    execute: async (c) => {
      seen = c;
      return { statusId: 3, stdout: "hello" };
    },
  });
  const before = structuredClone([...repository.documents]);
  const r = await judge(
    { ...body, mode: "run", stdin: "custom" },
    { uid: "u" },
  );
  assert.equal(seen.input, "custom");
  assert.equal(r.mode, "run");
  assert.deepEqual([...repository.documents], before);
});
test("submit partial scoring, server UID/score authority, hidden boundary", async () => {
  const { repository, judge } = setup({
    execute: async (c) => ({
      statusId: 3,
      status: "Accepted",
      stdout: c.input === "public" ? "5" : "WRONG SECRET STDOUT",
      stderr: c.input === "public" ? "" : "SECRET STDERR",
      time: "0.1",
      memory: 100,
    }),
  });
  repository.documents.set("problemSecrets/p", {
    hiddenTests: [{ input: "TOP-SECRET", output: "HIDDEN-EXPECTED-OUTPUT" }],
  });
  const r = await judge(
    {
      ...body,
      uid: "victim",
      score: 100,
      totalScore: 999,
      hiddenTests: [{ input: "fake", output: "WRONG SECRET STDOUT" }],
    },
    { uid: "u" },
  );
  assert.equal(r.score, 50);
  assert.equal(r.earnedPoints, 100);
  assert.equal(r.status, "Wrong Answer");
  assert.deepEqual(Object.keys(r.results[1]).sort(), [
    "hidden",
    "index",
    "memory",
    "passed",
    "status",
    "time",
  ]);
  const json = JSON.stringify(r);
  for (const token of [
    "TOP-SECRET",
    "HIDDEN-EXPECTED-OUTPUT",
    "WRONG SECRET STDOUT",
    "SECRET STDERR",
  ])
    assert.ok(!json.includes(token));
  const row = await repository.get("contests/c/scoreboard/u");
  assert.equal(row.totalScore, 100);
  assert.equal(row.problems.p.attempts, 1);
  assert.equal(await repository.get("contests/c/scoreboard/victim"), null);
  const submissions = await repository.list("contests/c/submissions");
  assert.equal(submissions[0].uid, "u");
  assert.equal(submissions[0].source, "code");
  assert.ok(!JSON.stringify(submissions).includes("TOP-SECRET"));
});
test("monotonic best score, accepted sticky, attempts and total across problems", async () => {
  let wrong = false;
  const { repository, judge } = setup({
    execute: async () => ({
      statusId: 3,
      status: "Accepted",
      stdout: wrong ? "bad" : "5",
    }),
  });
  await judge(body, { uid: "u" });
  wrong = true;
  await judge(body, { uid: "u" });
  wrong = false;
  await judge({ ...body, problemId: "q" }, { uid: "u" });
  const s = await repository.get("contests/c/scoreboard/u");
  assert.equal(s.problems.p.attempts, 2);
  assert.equal(s.problems.p.bestScore, 100);
  assert.equal(s.problems.p.accepted, true);
  assert.equal(s.problems.p.lastStatus, "Wrong Answer");
  assert.equal(s.totalScore, 350);
});
test("parallel requests atomically append submissions and increment scoreboard", async () => {
  const { repository, judge } = setup();
  await Promise.all(
    Array.from({ length: 20 }, () => judge(body, { uid: "u" })),
  );
  assert.equal(
    (await repository.get("contests/c/scoreboard/u")).problems.p.attempts,
    20,
  );
  assert.equal((await repository.list("contests/c/submissions")).length, 20);
  assert.equal(
    (await repository.get("contests/c/scoreboard/u")).totalScore,
    200,
  );
});
test("server transaction conflict does not leave orphan submission", async () => {
  const { repository, judge } = setup({
    execute: async () => {
      repository.documents.set("contests/c", { ...contest, updatedAt: 11 });
      return { statusId: 3, stdout: "5" };
    },
  });
  await assert.rejects(judge(body, { uid: "u" }), (e) => e.status === 409);
  assert.equal((await repository.list("contests/c/submissions")).length, 0);
});
test("submission admitted before end may finish afterwards", async () => {
  let time = 2000;
  const { repository, judge } = setup({
    now: () => time,
    execute: async () => {
      time = 70000;
      return { statusId: 3, stdout: "5" };
    },
  });
  await judge(body, { uid: "u" });
  assert.equal(
    (await repository.get("contests/c/scoreboard/u")).totalScore,
    200,
  );
});
for (const [id, status] of [
  [4, "Wrong Answer"],
  [5, "Time Limit Exceeded"],
  [6, "Compilation Error"],
  [11, "Runtime Error (NZEC)"],
])
  test(`verdict ${status}`, async () => {
    const { judge } = setup({
      execute: async () => ({
        statusId: id,
        status,
        stdout: "",
        stderr: "private",
        compileOutput: "private",
      }),
    });
    const r = await judge(body, { uid: "u" });
    assert.equal(r.status, status);
    assert.equal(r.score, 0);
    if (r.results[1]) assert.equal(r.results[1].stderr, undefined);
  });
test("score math rounds partial points and leaderboard ties use earliest submission", () => {
  const s = updateScoreboard(null, {
    uid: "u",
    problemId: "p",
    points: 200,
    score: 65,
    status: "Wrong Answer",
    submittedAt: 1,
    displayName: "A",
  });
  assert.equal(s.totalScore, 130);
  assert.deepEqual(
    sortScoreboard([
      { uid: "a", totalScore: 1, lastSubmissionAt: 3 },
      { uid: "b", totalScore: 2, lastSubmissionAt: 4 },
      { uid: "c", totalScore: 1, lastSubmissionAt: 2 },
    ]).map((x) => x.uid),
    ["b", "c", "a"],
  );
});
