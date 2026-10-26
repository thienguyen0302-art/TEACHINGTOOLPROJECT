// Hàm thuần (không import Firebase) dựng "Lịch sử nộp bài" của 1 học sinh cho giáo viên.
// Chia 3 nhóm:
//   theory   = Lý thuyết: câu tự giải thích (Self-Check) học sinh đã viết trong từng chương
//   exercise = Bài tập: quiz từng chương + bài code (thực hành, nâng cao HSG, kho bài tập)
//   contest  = Contest: từng lần nộp bài trong các kỳ thi
//
// Lưu ý dữ liệu: bài code ở bài học và quiz chỉ lưu bản TỔNG HỢP theo từng bài (số lần nộp, điểm cao nhất,
// lần nộp cuối), không lưu từng lần. Chỉ Contest lưu từng lần nộp kèm mã nguồn.

export const CATEGORIES = [
  { id: "theory", label: "Lý thuyết" },
  { id: "exercise", label: "Bài tập" },
  { id: "contest", label: "Contest" },
];

const toMs = (v) => (v?.toMillis?.() ?? (typeof v === "number" ? v : null));
export const chapterOrder = (id) => Number(String(id ?? "").replace(/\D/g, "")) || 0;

export const CODE_KIND_LABEL = {
  practice: "Thực hành bài học",
  advanced: "Nâng cao HSG",
  "problem-bank": "Kho bài tập",
};

export function codeKind(sub) {
  if (sub.sourceType === "lesson") return sub.section === "advanced" ? "advanced" : "practice";
  return "problem-bank";
}

// ── Lý thuyết ──────────────────────────────────────────────
// progressDocs: các bản ghi users/{uid}/progress. chapters: { "cpp_ch01": chapterJson } (có thể thiếu).
export function buildTheoryRows(progressDocs = [], chapters = {}) {
  const rows = [];
  for (const p of progressDocs) {
    const reflections = p.reflections ?? {};
    const key = `${p.language}_${p.chapterId}`;
    const theory = chapters[key]?.theory ?? [];
    const checks = theory.filter((t) => t.selfCheck);
    const answered = Object.entries(reflections).filter(([, text]) => String(text ?? "").trim());
    if (answered.length === 0) continue;
    const titleOf = (id) => theory.find((t) => t.id === id)?.title ?? id;
    for (const [theoryId, text] of answered) {
      rows.push({
        id: `${key}__${theoryId}`,
        category: "theory",
        language: p.language,
        chapterId: p.chapterId,
        chapterOrder: chapterOrder(p.chapterId),
        theoryId,
        title: titleOf(theoryId),
        answer: String(text).trim(),
        answeredInChapter: answered.length,
        totalInChapter: checks.length || null,
        at: toMs(p.updatedAt),
      });
    }
  }
  return rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0) || a.chapterOrder - b.chapterOrder);
}

// ── Bài tập ────────────────────────────────────────────────
export function buildExerciseRows(progressDocs = [], submissions = []) {
  const rows = [];
  for (const p of progressDocs) {
    const submitted = p.quizSubmitted === true || (p.attempts ?? 0) > 0;
    if (!submitted) continue;
    rows.push({
      id: `quiz__${p.language}_${p.chapterId}`,
      category: "exercise",
      kind: "quiz",
      kindLabel: "Quiz chương",
      language: p.language,
      chapterId: p.chapterId,
      chapterOrder: chapterOrder(p.chapterId),
      title: `Quiz chương ${chapterOrder(p.chapterId)}`,
      attempts: p.attempts ?? 0,
      score: Math.round(Number(p.quizScore ?? p.bestScore ?? 0)),
      detail: p.total ? `${p.correct ?? 0}/${p.total} câu đúng` : "",
      solved: Number(p.quizScore ?? 0) >= 70,
      at: toMs(p.updatedAt),
    });
  }
  for (const s of submissions) {
    const kind = codeKind(s);
    rows.push({
      id: `code__${s.id ?? s.slug}`,
      category: "exercise",
      kind,
      kindLabel: CODE_KIND_LABEL[kind],
      language: s.language,
      chapterId: s.chapterId ?? null,
      chapterOrder: chapterOrder(s.chapterId),
      title: s.problemId ?? s.slug,
      attempts: s.attempts ?? 0,
      score: Math.round(Number(s.bestScore ?? 0)),
      detail: s.total ? `Lần cuối ${s.passed ?? 0}/${s.total} test` : "",
      solved: s.solved === true,
      at: toMs(s.lastSubmittedAt),
    });
  }
  return rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

// ── Contest ────────────────────────────────────────────────
// submissionsByContest: { [contestId]: [submission, ...] } (từng lần nộp, mọi học sinh).
export function buildContestRows(uid, contests = [], submissionsByContest = {}) {
  const rows = [];
  for (const c of contests) {
    for (const s of submissionsByContest[c.id] ?? []) {
      if (s.uid !== uid) continue;
      rows.push({
        id: `contest__${c.id}__${s.id ?? s.submittedAt}`,
        category: "contest",
        contestId: c.id,
        contestTitle: c.title,
        problemId: s.problemId,
        language: s.language,
        status: s.status ?? (s.passed === s.total ? "Accepted" : "Chưa đạt"),
        accepted: s.status ? s.status === "Accepted" : s.passed === s.total,
        score: Math.round(Number(s.score ?? 0)),
        earnedPoints: s.earnedPoints ?? 0,
        passed: s.passed ?? 0,
        total: s.total ?? 0,
        source: typeof s.source === "string" ? s.source : "",
        at: toMs(s.submittedAt),
      });
    }
  }
  return rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

// ── Tổng hợp & lọc ─────────────────────────────────────────
export function summarizeHistory({ theory = [], exercise = [], contest = [] }) {
  const chaptersWithTheory = new Set(theory.map((r) => `${r.language}_${r.chapterId}`)).size;
  return {
    theory: { count: theory.length, chapters: chaptersWithTheory },
    exercise: {
      count: exercise.length,
      solved: exercise.filter((r) => r.solved).length,
      attempts: exercise.reduce((s, r) => s + r.attempts, 0),
    },
    contest: {
      count: contest.length,
      accepted: contest.filter((r) => r.accepted).length,
      contests: new Set(contest.map((r) => r.contestId)).size,
    },
  };
}

export function filterRows(rows, { search = "", language = "all", status = "all", kind = "all", contestId = "all" } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (language !== "all" && r.language !== language) return false;
    if (kind !== "all" && r.kind !== kind) return false;
    if (contestId !== "all" && r.contestId !== contestId) return false;
    if (status === "done" && !(r.solved ?? r.accepted)) return false;
    if (status === "notyet" && (r.solved ?? r.accepted)) return false;
    if (!q) return true;
    return [r.title, r.problemId, r.contestTitle, r.answer, r.kindLabel, r.chapterId]
      .some((v) => String(v ?? "").toLowerCase().includes(q));
  });
}
