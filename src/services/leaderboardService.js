import {
  collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query,
  runTransaction, serverTimestamp, updateDoc, where,
} from "firebase/firestore";
import { db } from "./firebase";
import { mergeLeaderboardEntry, profileSnapshot } from "../utils/ranking";

const LANGUAGES = ["cpp", "python"];
const entries = (language) => collection(db, "leaderboards", language, "entries");
const entryRef = (language, uid) => doc(db, "leaderboards", language, "entries", uid);

// Gọi sau khi lưu kết quả thi: giữ điểm cao nhất mỗi đề và cộng tổng.
export async function syncLeaderboard(uid, { language, examId, points }) {
  const ref = entryRef(language, uid);
  await runTransaction(db, async (tx) => {
    const [entrySnap, userSnap] = await Promise.all([tx.get(ref), tx.get(doc(db, "users", uid))]);
    const entry = mergeLeaderboardEntry(entrySnap.exists() ? entrySnap.data() : null, {
      uid, examId, points, profile: userSnap.exists() ? userSnap.data() : {},
    });
    tx.set(ref, { ...entry, updatedAt: serverTimestamp() });
  });
}

// Gọi sau khi đổi hồ sơ: cập nhật tên/trường/lớp đã hiển thị trên bảng xếp hạng (nếu đã có điểm).
export async function syncLeaderboardProfile(uid, profile) {
  const fields = profileSnapshot(profile);
  await Promise.all(LANGUAGES.map(async (language) => {
    const ref = entryRef(language, uid);
    if ((await getDoc(ref)).exists()) await updateDoc(ref, fields);
  }));
}

export async function getLeaderboard(language, max = 100) {
  const snap = await getDocs(query(entries(language), orderBy("total", "desc"), limit(max)));
  return snap.docs.map((d) => ({ ...d.data(), uid: d.id }));
}

export async function getMyEntry(language, uid) {
  const snap = await getDoc(entryRef(language, uid));
  return snap.exists() ? { ...snap.data(), uid } : null;
}

// Hạng thật của một tổng điểm trên toàn hệ thống (kể cả khi nằm ngoài top 100).
export async function getMyRank(language, total) {
  const snap = await getCountFromServer(query(entries(language), where("total", ">", total)));
  return snap.data().count + 1;
}
