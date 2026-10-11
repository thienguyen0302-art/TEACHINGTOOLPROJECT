// Tổng hợp số liệu lớp học cho Teacher Dashboard (hàm thuần, dễ test).
const WEEK_MS = 7 * 24 * 3600 * 1000;

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
      const key = `${p.language}_${p.chapterId}`;
      const s = chapterStats.get(key) ?? { key, language: p.language, chapterId: p.chapterId, students: 0, sum: 0, below: 0 };
      s.students += 1;
      s.sum += p.bestScore ?? 0;
      if ((p.bestScore ?? 0) < passScore) s.below += 1;
      chapterStats.set(key, s);
    }
    const best = mine.map((p) => p.bestScore ?? 0);
    return {
      uid: u.uid,
      name: u.displayName || u.email || `HS ${u.uid.slice(0, 6)}`,
      language: u.language ?? null,
      studySeconds: u.studySeconds ?? 0,
      lastActive: u.lastActive ?? null,
      chaptersTried: mine.length,
      chaptersCompleted: mine.filter((p) => p.completed === true).length,
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
