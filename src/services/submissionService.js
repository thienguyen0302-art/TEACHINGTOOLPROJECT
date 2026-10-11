// Progress contains metadata and Judge totals only, never source or test diagnostics.
export function buildSubmissionResult(metadata, judge, submittedAt = Date.now()) {
  if (judge?.mode !== 'submit') return null;
  const { passed, total, score, results } = judge;
  if (!Number.isInteger(total) || total <= 0 || !Number.isInteger(passed) || passed < 0 || passed > total ||
      !Number.isFinite(score) || score < 0 || score > 100 || !Array.isArray(results) || !results.length ||
      score !== Math.round(passed / total * 100) || results.length > total ||
      results.some((r) => !r || typeof r.passed !== 'boolean' || !/^(Accepted|Wrong Answer|Compilation Error|Time Limit Exceeded|Memory Limit Exceeded|Runtime Error(?: \((?:SIGSEGV|SIGXFSZ|SIGFPE|SIGABRT|NZEC|Other)\))?|Exec Format Error)$/.test(r.status)) ||
      results.some((r) => r.passed !== (r.status === 'Accepted')) ||
      (results.length < total && !(judge.stoppedEarly === true && results.at(-1).status === 'Compilation Error')) ||
      results.filter((r) => r.passed).length !== passed) {
    throw new Error('Kết quả Submit không hợp lệ để ghi tiến độ.');
  }
  const { slug, language, chapterId } = metadata;
  if (!slug || !chapterId || !['cpp', 'python'].includes(language)) throw new Error('Metadata submission không hợp lệ.');
  const lesson = /^lesson\/(cpp|python)\/(ch\d+)\/(practice|advanced)\/([^/]+)$/.exec(slug);
  if (slug.startsWith('lesson/') && (!lesson || lesson[1] !== language || lesson[2] !== chapterId)) throw new Error('Metadata Lesson không khớp.');
  // A rounded 100 is not sufficient: every test must have passed.
  const accepted = results.length === total && passed === total && results.every((r) => r.passed === true && r.status === 'Accepted');
  const failed = results.find((r) => /Compilation Error|Runtime Error/.test(r.status)) ?? results.find((r) => !r.passed);
  const metric = (name) => {
    const values = results.map((r) => r[name]).filter((v) => v !== null && v !== undefined && v !== '').map(Number).filter((v) => Number.isFinite(v) && v >= 0);
    return values.length ? Math.max(...values) : null;
  };
  return { problemId: lesson ? lesson[4] : metadata.problemId ?? slug, slug, chapterId,
    sourceType: lesson ? 'lesson' : 'problem-bank', section: lesson ? lesson[3] : null, language,
    status: accepted ? 'accepted' : 'attempted', judgeStatus: accepted ? 'Accepted' : failed?.status ?? 'Wrong Answer',
    score, passed, total, time: metric('time'), memory: metric('memory'), submittedAt };
}

export function updateSubmissionStats(previous, submission) {
  if (!submission) return previous;
  return { attempts: (previous?.attempts ?? 0) + 1, bestScore: Math.max(previous?.bestScore ?? 0, submission.score),
    lastScore: submission.score, solved: previous?.solved === true || submission.status === 'accepted', lastStatus: submission.status };
}

export function buildProgressContract(submission, stats) {
  const { problemId, slug, chapterId, sourceType, section, language, status, score, passed, total, submittedAt } = submission;
  const { attempts, bestScore, solved } = stats;
  return { problemId, slug, chapterId, sourceType, section, language, status, score, passed, total, attempts, bestScore, solved, submittedAt };
}

export function currentJudgeResult(judge, source, language) {
  return judge?.judgedSource === source && judge?.language === language ? judge : null;
}
