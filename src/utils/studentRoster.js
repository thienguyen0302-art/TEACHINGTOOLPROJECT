// Logic dùng chung của trang "Quản trị lớp học" (/teacher) và "Quản lý học sinh" (/teacher/students).
import { LANG_LABEL } from "./format.js";

export const chapterName = (c) =>
  `${LANG_LABEL[c.language] ?? c.language} · Chương ${Number(String(c.chapterId).slice(2))}`;

export function lastSeenText(ms) {
  if (!ms) return { text: "Chưa vào học", isRecent: false, days: 999 };
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return { text: "Hôm nay", isRecent: true, days: 0 };
  if (days === 1) return { text: "Hôm qua", isRecent: true, days: 1 };
  return { text: `${days} ngày trước`, isRecent: false, days };
}

export const isGood = (s) => s.avgScore >= 75 && s.weakChapters.length === 0;
export const isWarning = (s) => s.weakChapters.length > 0 || (s.chaptersTried > 0 && s.avgScore < 70);
export const isInactive = (s) => !s.lastActive || lastSeenText(s.lastActive).days > 7;

export function filterStudents(students, { search = "", lang = "all", status = "all" } = {}) {
  const q = search.toLowerCase();
  return students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(q)
      || (s.className && s.className.toLowerCase().includes(q))
      || (s.school && s.school.toLowerCase().includes(q));
    const matchLang = lang === "all" || s.language === lang;
    let matchStatus = true;
    if (status === "good") matchStatus = isGood(s);
    else if (status === "warning") matchStatus = isWarning(s);
    else if (status === "inactive") matchStatus = isInactive(s);
    return matchSearch && matchLang && matchStatus;
  });
}

export function studentCounts(students) {
  return {
    good: students.filter(isGood).length,
    warning: students.filter(isWarning).length,
    inactive: students.filter(isInactive).length,
  };
}

const q = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

export function buildStudentsCsv(students) {
  const header = ["STT", "Học sinh", "Lớp", "Trường", "Ngôn ngữ", "Chương hoàn thành", "% lộ trình", "Điểm bài tập TB (%)", "Thời gian học (phút)", "Hoạt động", "Chuyên đề yếu"];
  const rows = students.map((s, i) => [
    i + 1, q(s.name), q(s.className), q(s.school),
    LANG_LABEL[s.language] || s.language || "Chưa chọn",
    q(`${s.chaptersCompleted}/${s.chaptersTotal}`),
    s.overallPercent ?? 0,
    s.avgScore,
    Math.round((s.studySeconds || 0) / 60),
    lastSeenText(s.lastActive).text,
    q(s.weakChapters.map(chapterName).join("; ")),
  ]);
  return "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadStudentsCsv(students) {
  const blob = new Blob([buildStudentsCsv(students)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Bao_cao_doi_tuyen_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
