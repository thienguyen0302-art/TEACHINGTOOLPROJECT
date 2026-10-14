import { createTutorHandler } from './aiTutor.js';
import { createAuthGuard } from './auth.js';
import { createRepository } from './firebaseAdmin.js';
import { createContestJudge } from './contest.js';
import { createAuthoring } from './authoring.js';
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
// Production: đặt REQUIRE_AUTH=true và FIREBASE_PROJECT_ID để chỉ người đã đăng nhập mới gọi được Judge/AI.
const authGuard = createAuthGuard({ projectId: process.env.FIREBASE_PROJECT_ID, required: process.env.REQUIRE_AUTH === 'true' });

const contestAuth = createAuthGuard({ projectId: process.env.FIREBASE_PROJECT_ID, required: true });
const repository = createRepository();
const authoring = createAuthoring({ repository });
const contestJudge = createContestJudge({ repository, config: { languages, baseUrl: process.env.JUDGE0_URL, headers: {
  ...(process.env.JUDGE0_API_KEY ? { 'X-RapidAPI-Key': process.env.JUDGE0_API_KEY } : {}),
  ...(process.env.JUDGE0_API_HOST ? { 'X-RapidAPI-Host': process.env.JUDGE0_API_HOST } : {}),
  ...(process.env.JUDGE0_AUTH_TOKEN ? { 'X-Auth-Token': process.env.JUDGE0_AUTH_TOKEN } : {}),
} } });

const server = http.createServer(async (req, res) => {
  const reply = (status, data) => { if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); } };
  if (!['/api/judge', '/api/ai/tutor', '/api/contest/judge', '/api/authoring'].includes(req.url) || req.method !== 'POST') return reply(404, { error: 'Không tìm thấy API.' });
  // The development service is localhost-only; reject cross-origin browser requests.
  if (req.headers.origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin) && req.headers.origin !== process.env.APP_ORIGIN) return reply(403, { error: 'Origin không được phép.' });
  const caller = await (['/api/contest/judge', '/api/authoring'].includes(req.url) ? contestAuth : authGuard)(req);
  if (!caller.ok) return reply(caller.status, { error: caller.error });
  if (req.url === '/api/ai/tutor') return tutorHandler(req, res);
  if (req.url !== '/api/authoring' && !process.env.JUDGE0_URL) return reply(503, { error: 'Chưa cấu hình JUDGE0_URL cho backend.' });
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
      if (size > (req.url === '/api/authoring' ? 3500000 : 100000)) { reply(413, { error: req.url === '/api/authoring' ? 'Dữ liệu bài tập vượt giới hạn 3.5 MB.' : 'Code và input vượt giới hạn 100 KB.' }); return; }
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return reply(400, { error: 'Dữ liệu JSON không hợp lệ.' }); }
    if (req.url === '/api/authoring') return reply(200, await authoring(body, caller));
    if (req.url === '/api/contest/judge') return reply(200, await contestJudge(body, caller, controller.signal));
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
    reply(error.status || 502, { error: controller.signal.aborted ? 'Hết thời gian chờ máy chấm. Hãy thử lại.' : error.message });
  } finally { clearTimeout(timer); active--; }
});
const port = Number(process.env.PORT || process.env.JUDGE_PORT || 3001);
const host = process.env.HOST || '127.0.0.1'; // Cloud Run/Docker đặt HOST=0.0.0.0
server.listen(port, host, () => console.log(`Judge API: http://${host}:${port}`));
