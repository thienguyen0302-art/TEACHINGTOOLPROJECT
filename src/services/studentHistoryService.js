import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { loadChapter } from "./contentService";
import { listTeacherContests, loadContestSubmissions } from "./contestService";

// Dữ liệu gốc cho trang "Lịch sử nộp bài" của giáo viên (rules cho phép role teacher đọc users/{uid}/*).
export async function loadStudentRecords(uid) {
  const [progressSnap, submissionSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "progress")),
    getDocs(collection(db, "users", uid, "submissions")),
  ]);
  const progress = progressSnap.docs.map((d) => d.data());
  const submissions = submissionSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Nạp nội dung chương có Self-Check đã viết để hiện tiêu đề câu hỏi (lỗi từng chương thì bỏ qua).
  const chapters = {};
  await Promise.all(
    progress
      .filter((p) => Object.values(p.reflections ?? {}).some((t) => String(t ?? "").trim()))
      .map(async (p) => {
        try {
          chapters[`${p.language}_${p.chapterId}`] = await loadChapter(p.language, p.chapterId);
        } catch { /* thiếu nội dung chương: vẫn hiện câu trả lời, tiêu đề dùng mã câu hỏi */ }
      }),
  );
  return { progress, submissions, chapters };
}

// Từng lần nộp trong tất cả kỳ thi (server trả bài của mọi học sinh cho giáo viên; lọc theo uid ở client).
export async function loadContestRecords() {
  const contests = await listTeacherContests().catch(() => []);
  const submissionsByContest = {};
  await Promise.all(
    contests.map(async (c) => {
      submissionsByContest[c.id] = await loadContestSubmissions(c.id).catch(() => []);
    }),
  );
  return { contests, submissionsByContest };
}
