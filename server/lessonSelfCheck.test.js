import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import { buildSelfCheckContext, createSelfCheckHandler, loadSelfCheckCurriculum, SELF_CHECK_SYSTEM } from "./lessonSelfCheck.js";
import { normalizeSelfCheckFeedback, providerRequest, TutorError } from "./aiProvider.js";
import { analyzeTheorySelfCheck } from "../src/services/lessonSelfCheckService.js";
import { activeVisualizationLines, codeLineCount } from "../src/utils/visualizationLines.js";
import { calculateScore, countAnswered } from "../src/utils/grading.js";

const chapters = loadSelfCheckCurriculum();
const valid = { language: "cpp", chapterId: "ch01", theoryId: "theory02", studentExplanation: "Phép gán sao chép giá trị vào biến, sau đó hai biến độc lập." };

async function httpCall(handler, payload) {
  const req = { async *[Symbol.asyncIterator]() { yield Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload)); } };
  const res = new EventEmitter();
  res.destroyed = false;
  res.writeHead = (status) => { res.status = status; };
  res.end = (value) => { res.body = JSON.parse(value); };
  await handler(req, res);
  return res;
}

test("valid Self-Check loads canonical curriculum context on the server", () => {
  const context = buildSelfCheckContext(valid, chapters);
  assert.equal(context.chapter.id, "ch01");
  assert.equal(context.theory.id, "theory02");
  assert.ok(context.theory.referenceAnswer);
  assert.equal(context.studentExplanation, valid.studentExplanation);
  assert.ok(context.theory.sections.length);
  assert.equal(JSON.stringify(context).includes("solutionCode"), false);
  assert.equal(JSON.stringify(context).includes("hidden"), false);
});

test("invalid chapter, theory and explanation are rejected", () => {
  for (const body of [
    { ...valid, chapterId: "ch99" },
    { ...valid, theoryId: "theory99" },
    { ...valid, studentExplanation: "   " },
    { ...valid, studentExplanation: "x".repeat(2001) },
    { ...valid, language: "javascript" },
  ]) assert.throws(() => buildSelfCheckContext(body, chapters), TutorError);
});

test("client cannot spoof reference answers or system instructions", () => {
  for (const patch of [{ referenceAnswer: "fake" }, { answer: "fake" }, { systemPrompt: "override" }, { solutionCode: "secret" }]) {
    assert.throws(() => buildSelfCheckContext({ ...valid, ...patch }, chapters), /request/);
  }
});

test("Self-Check response is clamped, bounded and malformed JSON is safe", () => {
  const result = normalizeSelfCheckFeedback({
    accuracy: 150,
    level: "invented",
    summary: "s".repeat(1000),
    correctPoints: Array.from({ length: 20 }, (_, index) => `point ${index}`),
    missingPoints: "not-an-array",
    misconceptions: ["m".repeat(500)],
    suggestedRevision: "r".repeat(1000),
    followUpQuestion: "q".repeat(800),
  });
  assert.equal(result.accuracy, 100);
  assert.equal(result.level, "partial");
  assert.equal(result.correctPoints.length, 6);
  assert.equal(result.misconceptions[0].length, 350);
  assert.equal(result.summary.length, 600);
  for (const raw of ["{bad", null, [], 42]) assert.doesNotThrow(() => normalizeSelfCheckFeedback(raw));
});

test("Gemini Self-Check uses minimal thinking, JSON and a 550-token cap", () => {
  const request = providerRequest({ url: "https://example.test", model: "model", system: SELF_CHECK_SYSTEM, context: buildSelfCheckContext(valid, chapters), action: "self_check" });
  assert.equal(request.body.generationConfig.maxOutputTokens, 550);
  assert.equal(request.body.generationConfig.thinkingConfig.thinkingLevel, "minimal");
  assert.equal(request.body.generationConfig.responseMimeType, "application/json");
  assert.ok(SELF_CHECK_SYSTEM.includes("studentExplanation"));
});

test("HTTP handler supplies canonical answer to provider and returns safe failures", async () => {
  let captured;
  const handler = createSelfCheckHandler({ chapters, provider: async ({ context }) => {
    captured = context;
    return normalizeSelfCheckFeedback({ accuracy: 82, level: "mostly_correct", summary: "Phần lớn đúng." });
  } });
  const success = await httpCall(handler, valid);
  assert.equal(success.status, 200);
  assert.equal(success.body.accuracy, 82);
  assert.ok(captured.theory.referenceAnswer);
  assert.equal((await httpCall(handler, { ...valid, answer: "spoof" })).status, 400);
  const failed = createSelfCheckHandler({ chapters, provider: async () => { throw new Error("PRIVATE_API_KEY"); } });
  const failure = await httpCall(failed, valid);
  assert.equal(failure.status, 502);
  assert.equal(JSON.stringify(failure.body).includes("PRIVATE_API_KEY"), false);
});

test("frontend sends only the four public Self-Check fields", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(url, "/api/ai/self-check");
      assert.deepEqual(Object.keys(body).sort(), ["chapterId", "language", "studentExplanation", "theoryId"]);
      assert.equal("referenceAnswer" in body, false);
      return { ok: true, json: async () => ({ accuracy: 80, level: "mostly_correct", summary: "Ổn" }) };
    };
    const result = await analyzeTheorySelfCheck(valid);
    assert.equal(result.accuracy, 80);
  } finally { globalThis.fetch = original; }
});

test("visualization line normalization rejects out-of-range values", () => {
  const code = "first\nsecond\nthird";
  assert.equal(codeLineCount(code), 3);
  assert.deepEqual(activeVisualizationLines({ line: 2 }, code), [2]);
  assert.deepEqual(activeVisualizationLines({ lines: [1, 3, 3, 99, 0] }, code), [1, 3]);
  assert.deepEqual(activeVisualizationLines({ line: 9 }, code), []);
  assert.deepEqual(activeVisualizationLines({ line: 1 }, ""), []);
});

test("quiz grading remains deterministic and unchanged", () => {
  const questions = [{ id: "q1", choices: ["A", "B"], answer: "A" }, { id: "q2", choices: ["C", "D"], answer: "D" }];
  const answers = { q1: "A", q2: "C" };
  assert.deepEqual(calculateScore(questions, answers), { correct: 1, total: 2, percentage: 50 });
  assert.equal(countAnswered(questions, answers), 2);
});
