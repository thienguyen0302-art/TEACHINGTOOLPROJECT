import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { createAuthGuard } from './auth.js';
import { executeTest, gradeSubmission } from './judge.js';
import { getContestRepository } from './contestRepository.js';
import { AuthoringError, bytes, requireValue, serializePublicProblem, validId, validateProblem } from '../src/utils/problemAuthoring.js';
import { contestPhase, rankScoreboard, validateContest } from '../src/utils/contest.js';


// Hàm dùng chung: so khớp mã giáo viên với biến môi trường, so sánh thời gian cố định.
function teacherCodeMatches(given, secret) {
  const a = Buffer.from(String(given ?? '').trim());
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeContest(contest, problemId, language, now) {
  requireValue(contest?.status === 'published', 'Không tìm thấy contest.', 404);
  requireValue(contestPhase(contest, now) === 'running', 'Contest chưa bắt đầu hoặc đã kết thúc.', 403);
  const entry = contest.problems.find((p) => p.problemId === problemId);
  requireValue(entry, 'Bài không thuộc contest.', 403);
  requireValue(['cpp', 'python'].includes(language), 'Ngôn ngữ không hợp lệ.');
  return entry;
}
export function safeGrade(grade, publicTestCount) {
  const hiddenKeys = ['index', 'hidden', 'passed', 'status', 'time', 'memory'];
  const publicKeys = [...hiddenKeys, 'input', 'expected', 'stdout', 'stderr', 'compileOutput', 'message'];
  return { passed: grade.passed, total: grade.total, score: grade.score, stoppedEarly: grade.stoppedEarly === true,
    results: grade.results.map((raw, index) => {
      const result = { ...raw, hidden: publicTestCount === undefined ? raw.hidden : index >= publicTestCount };
      return Object.fromEntries((result.hidden ? hiddenKeys : publicKeys).filter((key) => result[key] !== undefined).map((key) => [key, result[key]]));
    }) };
}
function summarize(graded) {
  const failed = graded.results.find((r) => /Compilation Error|Runtime Error/.test(r.status)) ?? graded.results.find((r) => !r.passed);
  const metric = (key) => {
    const values = graded.results.map((r) => r[key]).filter((v) => v !== null && v !== undefined).map(Number).filter(Number.isFinite);
    return values.length ? Math.max(...values) : null;
  };
  return { status: graded.passed === graded.total ? 'Accepted' : failed?.status ?? 'Wrong Answer', time: metric('time'), memory: metric('memory') };
}
export function createContestService({ repository, execute = executeTest, grade = gradeSubmission, clock = Date.now, judgeConfig = () => ({}) }) {
  return {
    async judge(body, uid, profile, signal, practice = false) {
      requireValue(body && (practice || validId(body.contestId)) && validId(body.problemId), 'ID contest/bài không hợp lệ.');
      const { contestId, problemId, language, source, mode, stdin = '' } = body;
      requireValue(['run', 'submit'].includes(mode) && typeof source === 'string' && source.trim() && bytes(source) <= 50000 && typeof stdin === 'string' && bytes(stdin) <= 20 * 1024, 'Code, mode hoặc input không hợp lệ.');
      const now = clock();
      const contest = practice ? null : await repository.getContest(contestId);
      const entry = practice ? {points:100} : authorizeContest(contest, problemId, language, now);
      requireValue(['cpp','python'].includes(language), 'Ngôn ngữ không hợp lệ.');
      const problem = await repository.getProblem(problemId);
      requireValue(problem?.status === 'published', 'Bài chưa được publish.', 404);
      if (practice) requireValue(problem.practicePublished === true && !((await repository.getProblemLock(problemId))?.until > now), 'Bài chưa mở trong kho luyện tập hoặc đang được dùng cho contest.', 403);
      requireValue(problem.allowedLanguages.includes(language), 'Ngôn ngữ không được phép.', 403);
      const config = { ...judgeConfig(language), source, signal };
      if (mode === 'run') {
        const result = await execute({ ...config, input: stdin });
        requireValue(result.statusId < 13, 'Máy chấm gặp lỗi nội bộ.', 502);
        return { mode, result };
      }
      const secrets = await repository.getSecrets(problemId);
      // Revalidate stored teacher data before executing any tests.
      validateProblem({ ...problem, hiddenTests: secrets?.hiddenTests }, { status: 'published' });
      const graded = safeGrade(await grade({ tests: [...problem.samples, ...secrets.hiddenTests], publicTestCount: problem.samples.length, config }), problem.samples.length);
      // Derive everything from backend Judge totals; ignore all client score/points/uid fields.
      graded.score = Math.round(graded.passed / graded.total * 100);
      const earnedPoints = Math.round(entry.points * graded.score / 100);
      const summary = summarize(graded);
      const submission = { uid, problemId, language, score: graded.score, earnedPoints, passed: graded.passed, total: graded.total, ...summary, source, submittedAt: now };
      if (practice) return {mode,...graded,...summary};
      const submissionId = await repository.recordSubmission(contestId, submission, profile?.displayName || `Học sinh ${uid.slice(0, 6)}`);
      return { mode, ...graded, ...summary, earnedPoints, submissionId };
    },
  };
}
async function readBody(req, limit) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    requireValue(size <= limit, 'Request quá lớn.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AuthoringError('JSON không hợp lệ.'); }
}
// All new routes require verified Firebase auth, even when legacy dev Judge auth is disabled.
export function createContestHandler({ repository, authenticate = createAuthGuard({ projectId: process.env.FIREBASE_PROJECT_ID, required: true }),
  // Kích hoạt quyền giáo viên không cần email đã xác minh: tài khoản vừa đăng ký chưa kịp bấm link xác minh.
  authenticateClaim = createAuthGuard({ projectId: process.env.FIREBASE_PROJECT_ID, required: true, requireVerified: false }),
  execute, grade, clock = Date.now, judgeConfig } = {}) {
  let active = 0;
  return async (req, reply) => {
    // Kiểm tra mã giáo viên TRƯỚC khi tạo tài khoản (công khai, giới hạn theo IP).
    if (req.method === 'POST' && req.url === '/api/teacher/verify-code') {
      try {
        const secret = (process.env.TEACHER_SECURITY_CODE || '').trim();
        requireValue(secret.length >= 8, 'Máy chủ chưa cấu hình mã giáo viên.', 503);
        const body = await readBody(req, 10000);
        requireValue(teacherCodeMatches(body?.teacherCode, secret), 'Mã bảo mật giáo viên không chính xác.', 403);
        return reply(200, { ok: true });
      } catch (error) {
        return reply(error instanceof AuthoringError ? error.status : 503, { error: error instanceof AuthoringError ? error.message : 'Không kiểm tra được mã lúc này. Hãy thử lại.' });
      }
    }
    const isClaim = req.method === 'POST' && req.url === '/api/teacher/claim';
    const caller = await (isClaim ? authenticateClaim : authenticate)(req);
    if (!caller.ok) return reply(caller.status, { error: caller.error });
    try {
      const repo = repository ?? getContestRepository();
      const profile = await repo.getProfile(caller.uid);
      const teacher = profile?.role === 'teacher';
      const parts = req.url.split('?')[0].split('/').filter(Boolean);
      if (req.method === 'POST' && req.url === '/api/teacher/claim') {
        // Mã giáo viên CHỈ nằm trong biến môi trường của server, không có trong mã nguồn.
        const secret = (process.env.TEACHER_SECURITY_CODE || '').trim();
        requireValue(secret.length >= 8, 'Máy chủ chưa cấu hình mã giáo viên.', 503);

        // Chặn không cho tài khoản học sinh đổi qua giáo viên
        const existing = await repo.getProfile(caller.uid);
        requireValue(
          !existing || existing.role === 'teacher' || (!existing.firstLoginAt && !existing.province && !existing.school),
          'Tài khoản này đã được đăng ký là Học sinh, không thể chuyển đổi sang Giáo viên.',
          403
        );

        const body = await readBody(req, 10000);
        requireValue(teacherCodeMatches(body?.teacherCode, secret), 'Mã bảo mật giáo viên không chính xác.', 403);
        await repo.setTeacherRole(caller.uid);
        return reply(200, { ok: true, role: 'teacher' });
      }
      const teacherRoute = parts[1] === 'teacher';
      if (teacherRoute) requireValue(teacher, 'Chỉ giáo viên được dùng chức năng này.', 403);
      const now = clock();
      if (parts[1] === 'practice' && req.method === 'GET') {
        const visible = async p => p?.status === 'published' && p.practicePublished === true && !((await repo.getProblemLock(p.id))?.until > now);
        if (parts[2]) {
          requireValue(validId(parts[2]), 'ID không hợp lệ.');
          const p = await repo.getProblem(parts[2]);
          requireValue(await visible(p), 'Bài chưa mở trong kho luyện tập hoặc đang được dùng cho contest.', 404);
          return reply(200, {id:p.id,...serializePublicProblem(p)});
        }
        const items = await Promise.all((await repo.listProblems()).map(async p => await visible(p) ? {id:p.id,...serializePublicProblem(p)} : null));
        return reply(200, items.filter(Boolean));
      }
      if (req.method === 'POST' && ['/api/contest/judge','/api/practice/judge'].includes(req.url)) {
        requireValue(active < 2, 'Máy chấm đang bận. Hãy thử lại.', 429);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);
        active++;
        req.res?.on('close', () => controller.abort());
        try {
          const body = await readBody(req, 100000);
          const service = createContestService({ repository: repo, execute, grade, clock, judgeConfig });
          return reply(200, await service.judge(body, caller.uid, profile, controller.signal, req.url === '/api/practice/judge'));
        } finally { active--; clearTimeout(timer); }
      }
      if (teacherRoute && parts[2] === 'problems') {
        const id = parts[3];
        if (id) requireValue(validId(id), 'ID không hợp lệ.');
        if (parts[4] === 'practice' && req.method === 'PUT') {
          const body = await readBody(req, 10000);
          requireValue(typeof body.published === 'boolean', 'Trạng thái kho không hợp lệ.');
          return reply(200, {id:await repo.setPracticePublished(id, body.published, caller.uid, now)});
        }
        if (req.method === 'GET') {
          const problems = id ? [await repo.getProblem(id)] : await repo.listProblems();
          requireValue(!id || problems[0], 'Không tìm thấy bài.', 404);
          const items = await Promise.all(problems.map(async (p) => {
            const [secret, lock] = await Promise.all([repo.getSecrets(p.id), repo.getProblemLock(p.id)]);
            return { id: p.id, ...serializePublicProblem(p), hiddenTestCount: secret?.hiddenTests?.length ?? 0, lockedUntil: lock?.until ?? null, ...(id ? { hiddenTests: secret?.hiddenTests ?? [] } : {}) };
          }));
          return reply(200, id ? items[0] : items);
        }
        requireValue(req.method === (id ? 'PUT' : 'POST'), 'Method không hợp lệ.', 405);
        const body = await readBody(req, 2 * 1024 * 1024);
        const problem = validateProblem(body, { status: body?.status });
        return reply(200, { id: await repo.saveProblem(id, problem, caller.uid, now) });
      }
      if (teacherRoute && parts[2] === 'contests') {
        const id = parts[3];
        if (id) requireValue(validId(id), 'ID không hợp lệ.');
        if (req.method === 'GET') {
          const value = id ? await repo.getContest(id) : await repo.listContests(true);
          requireValue(value, 'Không tìm thấy contest.', 404);
          return reply(200, value);
        }
        if (req.method === 'DELETE') {
          requireValue(id, 'Thiếu ID contest để xóa.', 400);
          await repo.deleteContest(id, caller.uid);
          return reply(200, { success: true, id });
        }
        requireValue(req.method === (id ? 'PUT' : 'POST'), 'Method không hợp lệ.', 405);
        const body = await readBody(req, 100000);
        const contest = validateContest(body, { status: body?.status });
        return reply(200, { id: await repo.saveContest(id, contest, caller.uid, now) });
      }
      if (req.method === 'GET' && parts[1] === 'contests') {
        const id = parts[2];
        if (!id) return reply(200, await repo.listContests(teacher));
        requireValue(validId(id), 'ID không hợp lệ.');
        const contest = await repo.getContest(id);
        requireValue(contest && (teacher || contest.status === 'published'), 'Không tìm thấy contest.', 404);
        if (parts[3] === 'scoreboard') return reply(200, rankScoreboard(await repo.listScoreboard(id)));
        if (parts[3] === 'submissions') return reply(200, (await repo.listSubmissions(id, teacher ? null : caller.uid)).sort((a, b) => b.submittedAt - a.submittedAt));
        if (parts[3] === 'problems') {
          requireValue(teacher || contestPhase(contest, now) !== 'upcoming', 'Đề bài mở khi contest bắt đầu.', 403);
          const problemId = parts[4];
          requireValue(contest.problems.some((entry) => entry.problemId === problemId), 'Bài không thuộc contest.', 404);
          const problem = await repo.getProblem(problemId);
          requireValue(problem?.status === 'published', 'Không tìm thấy bài.', 404);
          return reply(200, { id: problemId, ...serializePublicProblem(problem) });
        }
        const problems = await Promise.all(contest.problems.map(async (entry) => {
          const problem = await repo.getProblem(entry.problemId);
          return { ...entry, title: problem?.title ?? entry.problemId };
        }));
        return reply(200, { ...contest, problems, serverNow: now });
      }
      return reply(404, { error: 'Không tìm thấy API.' });
    } catch (error) {
      // Never reflect raw Admin/Judge errors: they may contain private test data.
      return reply(error instanceof AuthoringError ? error.status : 503, { error: error instanceof AuthoringError ? error.message : 'Dịch vụ contest tạm thời không khả dụng. Kiểm tra cấu hình backend hoặc thử lại.' });
    }
  };
}