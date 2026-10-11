import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { buildExamRecord } from "../utils/persistence";

// Hợp đồng với Người 2 (xem Checklist/contract-nguoi1-nguoi2.md):
// saveExamResult(uid, { examId, language, correct, total, durationSec, autoSubmitted, chapterIds })
export async function saveExamResult(uid, result) {
  const record = buildExamRecord(result);
  const ref = await addDoc(collection(db, "users", uid, "exams"), { ...record, takenAt: serverTimestamp() });
  return { id: ref.id, ...record };
}

export async function getExamHistory(uid, max = 20) {
  const snap = await getDocs(query(collection(db, "users", uid, "exams"), orderBy("takenAt", "desc"), limit(max)));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, takenAt: data.takenAt?.toMillis?.() ?? null };
  });
}
