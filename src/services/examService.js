import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { buildExamRecord } from "../utils/persistence";
import { syncLeaderboard } from "./leaderboardService";

// Hợp đồng với Người 2 (xem Checklist/contract-nguoi1-nguoi2.md):
// saveExamResult(uid, { examId, language, correct, total, durationSec, maxScore?, autoSubmitted?, chapterIds? })
// Lưu lịch sử thi, rồi cập nhật bảng xếp hạng (mỗi đề giữ điểm cao nhất).
export async function saveExamResult(uid, result) {
  const record = buildExamRecord(result);
  const ref = await addDoc(collection(db, "users", uid, "exams"), { ...record, takenAt: serverTimestamp() });
  let rankingError = null;
  try {
    await syncLeaderboard(uid, record);
  } catch (e) {
    rankingError = e.code || e.message; // lịch sử đã lưu; chỉ phần xếp hạng chưa đồng bộ
  }
  return { id: ref.id, ...record, rankingError };
}

export async function getExamHistory(uid, max = 20) {
  const snap = await getDocs(query(collection(db, "users", uid, "exams"), orderBy("takenAt", "desc"), limit(max)));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, takenAt: data.takenAt?.toMillis?.() ?? null };
  });
}
