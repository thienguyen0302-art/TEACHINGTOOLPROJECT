import { createTutorHandler } from './aiTutor.js';
import http from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { executeTest, gradeSubmission } from './judge.js';
import { loadLessonProblems } from './lessonProblems.js';

const bankRoot = new URL('../src/content/problems/', import.meta.url);
const problems = new Map();
for (const chapter of readdirSync(bankRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  for (const file of readdirSync(new URL(`${chapter.name}/`, bankRoot)).filter((name) => name.endsWith('.json') && !name.startsWith('_'))) {
    const problem = JSON.parse(readFileSync(new URL(`${chapter.name}/${file}`, bankRoot), 'utf8'));
    problems.set(problem.slug, problem);
  }
}
const lessonProblems = loadLessonProblems();
const hiddenTests = JSON.parse(readFileSync(new URL('./testcases.json', import.meta.url), 'utf8'));
const languages = { cpp: Number(process.env.JUDGE0_CPP_ID || 2), python: Number(process.env.JUDGE0_PYTHON_ID || 28) };
let active = 0;
const tutorHandler = createTutorHandler();

const server = http.createServer(async (req, res) => {
  const reply = (status, data) => { if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); } };
  if (!['/api/judge', '/api/ai/tutor'].includes(req.url) || req.method !== 'POST') return reply(404, { error: 'Không tìm thấy API.' });
  // The development service is localhost-only; reject cross-origin browser requests.
  if (req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin) && req.headers.origin !== process.env.APP_ORIGIN) return reply(403, { error: 'Origin không được phép.' });
  if (req.url === '/api/ai/tutor') return tutorHandler(req, res);
  if (!process.env.JUDGE0_URL) return reply(503, { error: 'Chưa cấu hình JUDGE0_URL cho backend.' });
  if (active >= 2) return reply(429, { error: 'Máy chấm đang bận. Hãy thử lại sau.' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  res.on('close', () => controller.abort());
  active++;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 100000) { reply(413, { error: 'Code và input vượt giới hạn 100 KB.' }); return; }
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return reply(400, { error: 'Dữ liệu JSON không hợp lệ.' }); }
    const { slug, source, language, mode, stdin = '' } = body ?? {};
    const lessonProblem = lessonProblems.get(slug);
    const problem = lessonProblem ?? problems.get(slug);
    if (!problem || (lessonProblem && lessonProblem.language !== language) || !Object.hasOwn(languages, language) || !['run', 'submit'].includes(mode) ||
        typeof source !== 'string' || !source.trim() || typeof stdin !== 'string' || stdin.length > 10000) {
      return reply(400, { error: 'Bài tập, ngôn ngữ, code hoặc input không hợp lệ.' });
    }
    if (mode === 'submit' && !lessonProblem && !hiddenTests[slug]?.length) return reply(422, { error: 'Bài này chưa có bộ test chấm.' });
    const headers = {};
    if (process.env.JUDGE0_API_KEY) headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    if (process.env.JUDGE0_API_HOST) headers['X-RapidAPI-Host'] = process.env.JUDGE0_API_HOST;
    if (process.env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN;
    const config = { source, languageId: languages[language], signal: controller.signal, baseUrl: process.env.JUDGE0_URL, headers };
    if (mode === 'run') {
      const result = await executeTest({ ...config, input: stdin });
      if (result.statusId >= 13) throw new Error('Máy chấm gặp lỗi nội bộ. Hãy thử lại.');
      return reply(200, { mode, result });
    }
    const tests = [...problem.samples, ...(lessonProblem ? [] : hiddenTests[slug])];
    const graded = await gradeSubmission({ tests, publicTestCount: problem.samples.length, config });
    reply(200, { mode, ...graded });
  } catch (error) {
    reply(502, { error: controller.signal.aborted ? 'Hết thời gian chờ máy chấm. Hãy thử lại.' : error.message });
  } finally { clearTimeout(timer); active--; }
});
server.listen(Number(process.env.JUDGE_PORT || 3001), '127.0.0.1', () => console.log('Judge API: http://127.0.0.1:3001'));
