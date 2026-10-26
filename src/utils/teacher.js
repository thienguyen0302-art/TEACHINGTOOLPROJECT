// Tổng hợp số liệu lớp học cho Teacher Dashboard (hàm thuần, dễ test).

const WEEK_MS = 7 * 24 * 3600 * 1000;

import { normalizeChapterRow, summarizeChapters, TOTAL_CHAPTERS } from "./chapterProgress.js";

export { TOTAL_CHAPTERS };

export function buildClassOverview(users, progressRows, { passScore = 70, now = Date.now() } = {}) {
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
      const n = normalizeChapterRow(p);
      if (n.score === null || !(n.completed || n.quizSubmitted)) continue;
      const key = `${p.language}_${p.chapterId}`;
      const st = chapterStats.get(key) ?? { key, language: p.language, chapterId: p.chapterId, students: 0, sum: 0, below: 0 };
      st.students += 1;
      st.sum += n.score;
      if (n.score < passScore) st.below += 1;
      chapterStats.set(key, st);
    }

    // Ngôn ngữ chính: ngôn ngữ đã chọn, nếu chưa chọn thì ngôn ngữ có nhiều tiến độ nhất.
    const langCount = mine.reduce((m, p) => ({ ...m, [p.language]: (m[p.language] ?? 0) + 1 }), {});
    const mainLang = u.language ?? Object.keys(langCount).sort((a, b) => langCount[b] - langCount[a])[0] ?? null;
    const sum = summarizeChapters(mine, mainLang, { passScore });
    return {
      uid: u.uid,
      name: u.displayName || u.email || `HS ${u.uid.slice(0, 6)}`,
      language: u.language ?? null,
      school: u.school ?? "",
      className: u.className ?? "",
      studySeconds: u.studySeconds ?? 0,
      lastActive: u.lastActive ?? null,
      chaptersTotal: mainLang ? sum.total : TOTAL_CHAPTERS,
      chaptersCompleted: sum.completedCount,
      chaptersTried: sum.chapters.filter((c) => c.started).length,
      overallPercent: sum.overallPercent,
      chapterProgress: mainLang ? sum.chapters : [],
      avgScore: sum.avgScore,
      weakChapters: sum.weakChapters,
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
