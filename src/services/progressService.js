import {
  doc, getDoc, setDoc, getDocs, collection, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const PASS_SCORE = 70; // điểm tối thiểu để tính là hoàn thành chương

// Hợp đồng với Người 2: saveProgress(uid, chapterId, progressData)
// progressData = { language, chapterId, quizScore, correct, total }
export async function saveProgress(uid, chapterId, progressData) {
  const language = progressData.language;
  const ref = doc(db, "users", uid, "progress", `${language}_${chapterId}`);
  const old = await getDoc(ref);
  const prev = old.exists() ? old.data() : {};
  const quizScore = Number(progressData.quizScore ?? 0);

  await setDoc(ref, {
    language,
    chapterId,
    quizScore,
    correct: progressData.correct ?? 0,
    total: progressData.total ?? 0,
    bestScore: Math.max(prev.bestScore ?? 0, quizScore),
    attempts: (prev.attempts ?? 0) + 1,
    completed: prev.completed === true || quizScore >= PASS_SCORE,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getAllProgress(uid) {
  const snap = await getDocs(collection(db, "users", uid, "progress"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : {};
}

export async function addStudySeconds(uid, seconds) {
  if (seconds <= 0) return;
  await setDoc(
    doc(db, "users", uid),
    { studySeconds: increment(seconds), lastActive: serverTimestamp() },
    { merge: true }
  );
}