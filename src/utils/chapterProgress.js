// Hàm thuần (không import Firebase). NGUỒN DUY NHẤT để đọc tiến độ/điểm chương:
// trang học sinh (Dashboard, Curriculum, Overview, Profile) và trang giáo viên đều dùng file này,
// nên không thể lệch nhau nữa.
import { curriculum } from "../data/curriculum.js";

export const PASS_SCORE = 70;
const CURRICULUM_BY_LANG = { cpp: curriculum["C++"], python: curriculum.Python };

// Số chương của lộ trình (theo curriculum.js, khớp số file nội dung).
export function totalChapters(language) {
  if (language && CURRICULUM_BY_LANG[language]) return CURRICULUM_BY_LANG[language].length;
  return Math.max(...Object.values(CURRICULUM_BY_LANG).map((l) => l.length));
}
export const TOTAL_CHAPTERS = totalChapters();

export function chapterNumber(chapterId) {
  const n = Number(String(chapterId ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Ghép bản lưu trong trình duyệt (có thể mới hơn Firestore) vào bản trên Firestore.
export function mergeLocalState(remote, local) {
  if (!local) return remote;
  if (remote?.completed) return remote;
  const newer = !remote || local.completed || (local.progressPercent ?? 0) > (remote.progressPercent ?? 0);
  return newer ? { ...remote, ...local } : remote;
}

// Chuẩn hoá 1 bản ghi users/{uid}/progress/{...} (kể cả bản ghi cũ chưa có trường mới).
export function normalizeChapterRow(row = {}) {
  const completed = row.completed === true;
  const raw = Number(row.progressPercent);
  const percent = completed ? 100 : Number.isFinite(raw) ? Math.max(0, Math.min(99, Math.round(raw))) : 0;

  const attempts = row.attempts ?? 0;
  const codeSolved = row.codeSolved ?? 0;
  const quizSubmitted = row.quizSubmitted === true || attempts > 0 || (row.schemaVersion === undefined && (row.bestScore ?? 0) > 0);
  // Chương chỉ có điểm khi học sinh đã thật sự làm bài (nộp quiz hoặc có bài code Accepted).
  const hasWork = completed || quizSubmitted || codeSolved > 0;
  let score = null;
  if (hasWork) {
    const v = row.chapterScore ?? row.bestScore ?? row.quizScore ?? 0;
    score = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  }

  return {
    chapterId: row.chapterId,
    language: row.language,
    order: chapterNumber(row.chapterId),
    percent,
    completed,
    score,
    quizSubmitted,
    quizCorrect: row.correct ?? 0,
    quizTotal: row.total ?? 0,
    codeSolved,
    codeTotal: row.codeTotal ?? 0,
    started: hasWork || percent > 0,
  };
}

// Gộp tiến độ tất cả chương của 1 học sinh theo 1 ngôn ngữ.
export function summarizeChapters(rows = [], language, { passScore = PASS_SCORE } = {}) {
  const total = totalChapters(language);
  const list = CURRICULUM_BY_LANG[language] ?? [];
  const byOrder = new Map();
  for (const r of rows) {
    if (language && r.language !== language) continue;
    const n = normalizeChapterRow(r);
    if (n.order < 1 || n.order > total) continue;
    const old = byOrder.get(n.order);
    if (!old || n.percent > old.percent) byOrder.set(n.order, n);
  }

  const chapters = Array.from({ length: total }, (_, i) => {
    const order = i + 1;
    const base = byOrder.get(order) ?? {
      language, order, percent: 0, completed: false, score: null, started: false,
      quizSubmitted: false, quizCorrect: 0, quizTotal: 0, codeSolved: 0, codeTotal: 0,
    };
    return { ...base, order, chapterId: `ch${String(order).padStart(2, "0")}`, title: list[i]?.title ?? "" };
  });

  const completedCount = chapters.filter((c) => c.completed).length;
  // % cả lộ trình = trung bình % của TẤT CẢ chương (chương chưa học tính 0).
  const overallPercent = total ? Math.round(chapters.reduce((s, c) => s + c.percent, 0) / total) : 0;
  const scored = chapters.filter((c) => c.score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length) : 0;
  const weakChapters = chapters
    .filter((c) => c.score !== null && (c.completed || c.quizSubmitted) && c.score < passScore)
    .sort((a, b) => a.score - b.score)
    .map((c) => ({ language: c.language, chapterId: c.chapterId, bestScore: c.score }));

  return { chapters, total, completedCount, overallPercent, avgScore, scoredCount: scored.length, weakChapters };
}

// Dùng cho trang học sinh: % + trạng thái 1 chương, đã ghép bản lưu trong trình duyệt.
export function resolveChapterProgress(remoteRow, localRow) {
  const n = normalizeChapterRow(mergeLocalState(remoteRow, localRow) ?? {});
  return { progress: n.percent, completed: n.completed, started: n.started, score: n.score };
}

// Điểm trung bình các chương đã làm bài (bỏ qua chương mới chỉ xem, không tính 0 điểm oan).
export function averageChapterScore(rows = []) {
  const scores = rows.map((r) => normalizeChapterRow(r).score).filter((v) => v !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}
