import { getCodeSubmissionHistory } from "./submissionPersistence";
import { getProblemBySlug } from "./problemService";

export function formatActivityTime(ts) {
  if (!ts) return "Vừa xong";
  const date = ts instanceof Date ? ts : new Date(typeof ts === "number" ? ts : (ts?.toMillis?.() ?? ts));
  if (isNaN(date.getTime())) return "Vừa xong";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;

  const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return `Hôm nay, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Hôm qua, ${timeStr}`;

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getDate()} tháng ${date.getMonth() + 1}, ${timeStr}`;
  }

  return `${date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${timeStr}`;
}

// Tổng hợp lịch sử hoạt động học tập thực tế của cá nhân học viên
export async function fetchRecentActivities(uid, { chapters = [], rows = [], goals = [] } = {}) {
  if (!uid) return [];

  const codeSubs = await getCodeSubmissionHistory(uid).catch(() => []);

  const activities = [];

  // 1. Bài nộp code từ Kho bài tập và bài học
  for (const sub of (codeSubs || [])) {
    const ts = sub.lastSubmittedAt ? new Date(sub.lastSubmittedAt).getTime() : 0;
    if (!ts) continue;

    const problem = sub.slug ? getProblemBySlug(sub.slug) : null;
    const title = problem?.title || sub.problemTitle || (sub.slug ? sub.slug.replace(/[-_]/g, " ") : "Bài tập code");
    const isAccepted = sub.solved || sub.lastStatus === "accepted" || sub.status === "accepted";
    const passed = sub.passed ?? sub.passedCount ?? 0;
    const total = sub.total ?? sub.totalCount ?? 0;

    let badge = isAccepted ? "Đúng 100%" : (total > 0 ? `${passed}/${total} test` : "Đã nộp");
    let statusText = isAccepted ? "Accepted" : (sub.lastStatus === "wrong_answer" ? "Chưa đúng" : (sub.lastStatus || "Đang làm"));

    activities.push({
      id: `code_${sub.id || sub.slug}_${ts}`,
      type: "code",
      icon: "code",
      iconClass: "code",
      title: `Nộp bài “${title}”`,
      subtitle: `${formatActivityTime(ts)} · ${statusText}`,
      badge,
      timestamp: ts,
      link: sub.slug ? `/practice` : `/practice`,
    });
  }

  // 3. Tiến độ chuyên đề / Quiz lý thuyết
  const chapterMap = new Map();
  (chapters || []).forEach((c) => {
    chapterMap.set(c.id, c.title);
  });

  for (const r of (rows || [])) {
    if (!r.attempts && !r.quizScore && !r.completed) continue;

    let ts = 0;
    if (r.updatedAt?.toMillis) ts = r.updatedAt.toMillis();
    else if (r.updatedAt?.seconds) ts = r.updatedAt.seconds * 1000;
    else if (r.updatedAt) ts = new Date(r.updatedAt).getTime();

    const chapterTitle = chapterMap.get(r.chapterId) || `Chương ${r.chapterId}`;
    const correct = r.correct ?? 0;
    const total = r.total ?? 0;
    const scoreText = total > 0 ? `Điểm số ${correct}/${total}` : `Điểm ${r.quizScore || r.bestScore || 0}%`;

    activities.push({
      id: `lesson_${r.chapterId}_${ts || r.chapterId}`,
      type: "lesson",
      icon: "check",
      iconClass: "done",
      title: r.completed ? `Hoàn thành bài “${chapterTitle}”` : `Làm quiz “${chapterTitle}”`,
      subtitle: `${formatActivityTime(ts)} · ${scoreText}`,
      badge: r.completed ? "+30 XP" : `${Math.round(r.quizScore || r.bestScore || 0)}%`,
      timestamp: ts || 1,
      link: `/lesson/${r.chapterId}`,
    });
  }

  // 4. Mục tiêu cá nhân đã hoàn thành
  for (const g of (goals || [])) {
    if (!g.completed) continue;

    let ts = 0;
    if (g.completedAt?.toMillis) ts = g.completedAt.toMillis();
    else if (g.completedAt) ts = new Date(g.completedAt).getTime();
    else if (g.createdAt?.toMillis) ts = g.createdAt.toMillis();
    else if (g.createdAt) ts = new Date(g.createdAt).getTime();

    activities.push({
      id: `goal_${g.id}_${ts || g.id}`,
      type: "goal",
      icon: "trophy",
      iconClass: "badge",
      title: `Hoàn thành mục tiêu “${g.title}”`,
      subtitle: `${formatActivityTime(ts)} · Đạt mục tiêu cá nhân`,
      badge: "Mục tiêu",
      timestamp: ts || 1,
      link: "/progress",
    });
  }

  // Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
  activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return activities;
}
