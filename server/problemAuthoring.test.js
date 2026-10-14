import test from "node:test";
import assert from "node:assert/strict";
import {
  importProblemJson,
  problemTemplate,
  publicProblem,
  slugify,
  validateProblem,
} from "../src/utils/problemAuthoring.js";
import { createAuthoring } from "./authoring.js";
import { memoryRepository } from "./testRepository.js";
const valid = () => ({ ...structuredClone(problemTemplate), published: true });
test("valid problem; Vietnamese slug generation", () => {
  assert.deepEqual(validateProblem(valid()), []);
  assert.equal(slugify("Tổng hai số!"), "tong-hai-so");
});
for (const [label, patch, message] of [
  ["invalid slug", { slug: "Bad Slug" }, /Slug/],
  ["missing title", { title: "" }, /Tên bài/],
  ["bad difficulty", { difficulty: "expert" }, /Độ khó/],
  ["missing statement", { statement: "" }, /Đề bài/],
  ["missing input description", { inputDescription: "" }, /Dữ liệu vào/],
  ["missing output description", { outputDescription: "" }, /Dữ liệu ra/],
  ["missing sample", { samples: [] }, /Sample/],
  ["missing hidden", { hiddenTests: [] }, /Hidden test/],
  [
    "too many samples",
    { samples: Array(11).fill({ input: "", output: "" }) },
    /10/,
  ],
  [
    "too many hidden",
    { hiddenTests: Array(51).fill({ input: "", output: "" }) },
    /50/,
  ],
  [
    "oversized test",
    { hiddenTests: [{ input: "a".repeat(20481), output: "" }] },
    /Hidden test 1: input vượt/,
  ],
  [
    "utf8 size limit",
    { samples: [{ input: "ệ".repeat(8000), output: "" }] },
    /Sample 1: input vượt/,
  ],
  ["bad test type", { samples: [{ input: 1, output: null }] }, /Sample 1/],
  ["invalid language", { allowedLanguages: ["java"] }, /ngôn ngữ/],
  ["no language", { allowedLanguages: [] }, /ngôn ngữ/],
  ["oversized statement", { statement: "a".repeat(100001) }, /Đề bài quá dài/],
])
  test(label, () =>
    assert.match(validateProblem({ ...valid(), ...patch }).join("\n"), message),
  );
test("duplicate slug and editing original slug", () => {
  const p = valid();
  assert.match(
    validateProblem(p, { existingSlugs: [p.slug] }).join(),
    /tồn tại/,
  );
  assert.deepEqual(
    validateProblem(p, { existingSlugs: [p.slug], originalSlug: p.slug }),
    [],
  );
});
test("draft can omit hidden tests; publish cannot", () => {
  assert.deepEqual(
    validateProblem({ ...valid(), published: false, hiddenTests: [] }),
    [],
  );
});
test("JSON import valid populates draft, malformed/invalid fail", () => {
  const p = importProblemJson(JSON.stringify(valid()));
  assert.equal(p.published, false);
  assert.equal(p.hiddenTests.length, 2);
  for (const text of [
    "{oops",
    "null",
    "[]",
    "{}",
    JSON.stringify({ ...valid(), hiddenTests: [] }),
  ])
    assert.throws(() => importProblemJson(text));
});
test("public serializer strips secrets at every level", () => {
  const p = valid();
  p.officialSolution = "secret";
  p.credentials = "secret";
  p.samples[0].hiddenTests = "secret";
  p.starterCode.secret = "secret";
  const out = JSON.stringify(publicProblem(p));
  for (const token of [
    "hiddenTests",
    "officialSolution",
    "credentials",
    "secret",
  ])
    assert.ok(!out.includes(token));
});
const setup = () => {
  const repository = memoryRepository({
    "users/t": { role: "teacher" },
    "users/s": { role: "student" },
  });
  return { repository, save: createAuthoring({ repository, now: () => 1000 }) };
};
test("teacher authoring persists public/private split; student rejected", async () => {
  const { repository, save } = setup();
  await assert.rejects(
    save({ action: "saveProblem", data: valid() }, { uid: "s" }),
    (e) => e.status === 403,
  );
  const { id } = await save(
    { action: "saveProblem", data: valid() },
    { uid: "t" },
  );
  assert.equal((await repository.get(`problems/${id}`)).hiddenTests, undefined);
  assert.equal(
    (await repository.get(`problemSecrets/${id}`)).hiddenTests.length,
    2,
  );
});
test("server reserves unique slugs atomically under concurrent saves", async () => {
  const { repository, save } = setup();
  const outcomes = await Promise.allSettled(
    [1, 2].map(() =>
      save({ action: "saveProblem", data: valid() }, { uid: "t" }),
    ),
  );
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal((await repository.list("problems")).length, 1);
});
test("contest publish validates secret readiness, assigns labels, locks critical edits", async () => {
  const { repository, save } = setup();
  const { id } = await save(
    { action: "saveProblem", data: valid() },
    { uid: "t" },
  );
  const data = {
    title: "Contest",
    description: "",
    status: "published",
    startAt: 2000,
    durationMinutes: 10,
    problems: [{ problemId: id, points: 100 }],
  };
  const { id: cid } = await save({ action: "saveContest", data }, { uid: "t" });
  assert.equal(
    (await repository.get(`contests/${cid}`)).problems[0].label,
    "A",
  );
  assert.equal((await repository.get(`problems/${id}`)).lockedUntil, 602000);
  await assert.rejects(
    save({ action: "saveProblem", id, data: valid() }, { uid: "t" }),
    (e) => e.status === 409,
  );
  const later = createAuthoring({ repository, now: () => 3000 });
  await assert.rejects(
    later({ action: "saveContest", id: cid, data }, { uid: "t" }),
    (e) => e.status === 409,
  );
});
test("publish refuses unpublished problems, missing hidden tests and past start", async () => {
  const { repository, save } = setup();
  const { id } = await save(
    {
      action: "saveProblem",
      data: { ...valid(), published: false, hiddenTests: [] },
    },
    { uid: "t" },
  );
  const data = {
    title: "C",
    status: "published",
    startAt: 2000,
    durationMinutes: 10,
    problems: [{ problemId: id, points: 100 }],
  };
  await assert.rejects(
    save({ action: "saveContest", data }, { uid: "t" }),
    /publish/,
  );
  repository.documents.set(`problems/${id}`, {
    ...(await repository.get(`problems/${id}`)),
    published: true,
  });
  await assert.rejects(
    save({ action: "saveContest", data }, { uid: "t" }),
    /hidden/,
  );
  repository.documents.set(`problemSecrets/${id}`, {
    hiddenTests: [{ input: "0", output: "0" }],
  });
  await assert.rejects(
    save(
      { action: "saveContest", data: { ...data, startAt: 500 } },
      { uid: "t" },
    ),
    /tương lai/,
  );
});
