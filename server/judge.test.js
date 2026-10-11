import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { executeTest, gradeResult, normalizeOutput } from './judge.js';

test('compare whitespace while preserving numeric values and token boundaries', () => {
  assert.equal(normalizeOutput(' 3\n2 \n'), '3 2');
  const result = { statusId: 3, status: 'Accepted', stdout: '3\n2\n', time: '0.01', memory: 100 };
  assert.equal(gradeResult(result, { input: '17 5', output: '3 2' }, 0, false).passed, true);
  assert.equal(gradeResult(result, { input: '17 5', output: '32' }, 0, false).passed, false);
  assert.equal(gradeResult({ ...result, statusId: 6 }, { output: '3 2' }, 0, false).passed, false);
});

test('hidden results never disclose inputs, outputs or diagnostics', () => {
  const result = gradeResult({ statusId: 6, status: 'Compilation Error', stdout: 'secret', stderr: 'secret', compileOutput: 'secret' }, { input: 'secret', output: 'secret' }, 2, true);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('Judge0 encodes Unicode, polls queued work and decodes results', async () => {
  const calls = [];
  const responses = [{ token: 'abc' }, { status: { id: 2 } }, { status: { id: 3, description: 'Accepted' }, stdout: Buffer.from('xin chào\n').toString('base64') }];
  const result = await executeTest({ source: 'print("xin chào")', languageId: 71, input: 'Việt', baseUrl: 'https://judge.example/',
    fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => responses.shift() }; } });
  assert.equal(result.stdout, 'xin chào\n');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(Buffer.from(body.stdin, 'base64').toString(), 'Việt');
  assert.equal(body.enable_network, false);
  assert.equal(calls.length, 3);
});

test('upstream HTTP errors and malformed responses fail clearly', async () => {
  await assert.rejects(executeTest({ baseUrl: 'https://judge.example', source: 'x', input: '', fetchImpl: async () => ({ ok: false, status: 429 }) }), /429/);
  await assert.rejects(executeTest({ baseUrl: 'https://judge.example', source: 'x', input: '', fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }), /submission/);
});

import { loadLessonProblems } from './lessonProblems.js';
test('chapter exercises have distinct language/section IDs and deduplicated server tests', () => {
  const problems = loadLessonProblems();
  assert.equal(problems.size, 76);
  const python = problems.get('lesson/python/ch01/practice/practice01');
  const cpp = problems.get('lesson/cpp/ch01/practice/practice01');
  assert.equal(python.language, 'python');
  assert.equal(cpp.language, 'cpp');
  assert.notDeepEqual(python.samples, cpp.samples);
  for (const problem of problems.values()) {
    assert.ok(problem.samples.length > 0);
    assert.equal(new Set(problem.samples.map((sample) => JSON.stringify(sample))).size, problem.samples.length);
    for (const sample of problem.samples) {
      assert.equal(typeof sample.input, 'string');
      assert.equal(typeof sample.output, 'string');
    }
  }
});

import { gradeSubmission, compareOutputTokens } from './judge.js';
test('token comparison does not treat numeric representations as equal', () => {
  assert.equal(compareOutputTokens('01', '1'), false);
  assert.equal(compareOutputTokens('a\nb', 'a b'), true);
});
test('compilation errors stop submission; wrong answers retain full breakdown', async () => {
  const tests = [{ input: '1', output: '1' }, { input: '2', output: '2' }];
  let calls = 0;
  const compiled = await gradeSubmission({ tests, publicTestCount: 1, execute: async () => { calls++; return { statusId: 6, status: 'Compilation Error', compileOutput: 'bad code' }; } });
  assert.equal(calls, 1);
  assert.equal(compiled.stoppedEarly, true);
  assert.equal(compiled.total, 2);
  assert.equal(compiled.score, 0);
  const wrong = await gradeSubmission({ tests, publicTestCount: 1, execute: async () => ({ statusId: 3, stdout: '1', status: 'Accepted' }) });
  assert.equal(wrong.results.length, 2);
  assert.equal(wrong.score, 50);
  assert.equal(wrong.stoppedEarly, false);
  assert.deepEqual(Object.keys(wrong.results[1]).sort(), ['index','hidden','passed','status','time','memory'].sort());
});
test('infrastructure failures do not produce a score', async () => {
  for (const statusId of [13,14]) {
    await assert.rejects(gradeSubmission({ tests: [{ input: '', output: '' }], publicTestCount: 1, execute: async () => ({ statusId, status: 'Internal Error' }) }), /nội bộ/);
  }
});
test('runtime and time limit failures remain failed tests', () => {
  for (const statusId of [5,7,8,9,10,11,12]) assert.equal(gradeResult({statusId, status:'Execution failed', stdout:'1'}, {output:'1'}, 0, false).passed, false);
});
