// Tổng hợp số liệu lớp học cho Teacher Dashboard (hàm thuần, dễ test).
import { curriculum } from "../data/curriculum.js";

const WEEK_MS = 7 * 24 * 3600 * 1000;

// Tổng số chương hiển thị cho học sinh (theo curriculum: 14 chương/ngôn ngữ).
export const TOTAL_CHAPTERS = Math.max(...Object.values(curriculum).map((list) => list.length));
const CURRICULUM_BY_LANG = { cpp: curriculum["C++"], python: curriculum.Python };

// % hoàn thành 1 chương: đã hoàn thành = 100, còn lại lấy progressPercent
// (đã được tính bằng computeLessonProgress khi học sinh học và lưu lên Firestore).
export function chapterPercent(row) {
  if (!row) return 0;
  if (row.completed === true) return 100;
  const v = Number(row.progressPercent);
  return Number.isFinite(v) ? Math.max(0, Math.min(99, Math.round(v))) : 0;
}

// Danh sách đủ các chương (1..total) của ngôn ngữ, chương chưa học = 0%.
export function buildChapterProgress(mine, language, total = TOTAL_CHAPTERS) {
  const byKey = new Map(mine.map((p) => [`${p.language}_${Number(String(p.chapterId).slice(2))}`, p]));
  return Array.from({ length: total }, (_, i) => {
    const order = i + 1;
    const row = byKey.get(`${language}_${order}`);
    return {
      language,
      chapterId: `ch${String(order).padStart(2, "0")}`,
      order,
      title: CURRICULUM_BY_LANG[language]?.[i]?.title ?? "",
      percent: chapterPercent(row),
      completed: row?.completed === true,
    };
  });
}

export function buildClassOverview(users, progressRows, { passScore = 70, now = Date.now(), totalChapters = TOTAL_CHAPTERS } = {}) {
  const students = users.filter((u) => u.role !== "teacher");
  const byUid = new Map();
  for (const row of progressRows) {
    if (!byUid.has(row.uid)) byUid.set(row.uid, []);
    byUid.get(row.uid).push(row);
  }

  const chapterStats = new Map(); // `${language}_${chapterId}` -> tổng hợp cả lớp
  const rows = students.map((u) => {
    const mine = byUid.get(u.uid) ?? [];
    for (const p of mine) {
      const key = `${p.language}_${p.chapterId}`;
      const s = chapterStats.get(key) ?? { key, language: p.language, chapterId: p.chapterId, students: 0, sum: 0, below: 0 };
      s.students += 1;
      s.sum += p.bestScore ?? 0;
      if ((p.bestScore ?? 0) < passScore) s.below += 1;
      chapterStats.set(key, s);
    }
    const best = mine.map((p) => p.bestScore ?? 0);
    // Ngôn ngữ chính: ngôn ngữ đã chọn, nếu chưa chọn thì lấy ngôn ngữ có nhiều tiến độ nhất.
    const langCount = mine.reduce((m, p) => ({ ...m, [p.language]: (m[p.language] ?? 0) + 1 }), {});
    const mainLang = u.language ?? Object.keys(langCount).sort((a, b) => langCount[b] - langCount[a])[0] ?? null;
    const chapterProgress = mainLang && CURRICULUM_BY_LANG[mainLang] ? buildChapterProgress(mine, mainLang, totalChapters) : [];
    return {
      uid: u.uid,
      name: u.displayName || u.email || `HS ${u.uid.slice(0, 6)}`,
      language: u.language ?? null,
      school: u.school ?? "",
      className: u.className ?? "",
      studySeconds: u.studySeconds ?? 0,
      lastActive: u.lastActive ?? null,
      chaptersTried: mine.length,
      chaptersCompleted: chapterProgress.filter((c) => c.completed).length,
      chaptersTotal: totalChapters,
      chapterProgress,
      avgScore: best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : 0,
      weakChapters: mine
        .filter((p) => (p.bestScore ?? 0) < passScore)
        .sort((a, b) => (a.bestScore ?? 0) - (b.bestScore ?? 0))
        .map((p) => ({ language: p.language, chapterId: p.chapterId, bestScore: p.bestScore ?? 0 })),
    };
  });

  const weakChapters = [...chapterStats.values()]
    .map((s) => ({ ...s, avgScore: Math.round(s.sum / s.students) }))
    .filter((s) => s.avgScore < passScore)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  const withScores = rows.filter((r) => r.chaptersTried > 0);
  return {
    studentCount: rows.length,
    activeLast7d: rows.filter((r) => r.lastActive && now - r.lastActive <= WEEK_MS).length,
    avgScore: withScores.length ? Math.round(withScores.reduce((a, r) => a + r.avgScore, 0) / withScores.length) : 0,
    students: rows.sort((a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0)),
    weakChapters,
  };
}
