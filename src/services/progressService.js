import {
  doc, getDoc, setDoc, getDocs, collection, increment, serverTimestamp,
  writeBatch, query, where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { dateKey } from "../utils/activity";
import { normalizeProfile } from "../utils/profile";

const PASS_SCORE = 70; // điểm tối thiểu để tính là hoàn thành chương

// Hợp đồng với Người 2: saveProgress(uid, chapterId, progressData)
// progressData = { language, chapterId, quizScore, correct, total }
export async function saveProgress(uid, chapterId, progressData) {
  const language = progressData.language;
  const ref = doc(db, "users", uid, "progress", `${language}_${chapterId}`);
  const old = await getDoc(ref);
  const prev = old.exists() ? old.data() : {};
  const quizScore = Number(progressData.quizScore ?? prev.quizScore ?? 0);
  const isCompleted = prev.completed === true || progressData.completed === true || quizScore >= PASS_SCORE;
  const progressPercent = isCompleted
    ? 100
    : Math.max(prev.progressPercent ?? 0, progressData.progressPercent ?? 0);

  await setDoc(ref, {
    language,
    chapterId,
    quizScore,
    correct: progressData.correct ?? prev.correct ?? 0,
    total: progressData.total ?? prev.total ?? 0,
    bestScore: Math.max(prev.bestScore ?? 0, quizScore),
    attempts: (prev.attempts ?? 0) + (progressData.isQuizSubmit ? 1 : 0),
    completed: isCompleted,
    progressPercent,
    lastTab: progressData.lastTab ?? prev.lastTab ?? "overview",
    lastPracticeMode: progressData.lastPracticeMode ?? prev.lastPracticeMode ?? "quiz",
    overviewRead: progressData.overviewRead ?? prev.overviewRead ?? false,
    reflections: progressData.reflections ?? prev.reflections ?? {},
    answers: progressData.answers ?? prev.answers ?? {},
    quizSubmitted: progressData.quizSubmitted ?? prev.quizSubmitted ?? false,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getChapterProgress(uid, language, chapterId) {
  if (!uid) return null;
  const ref = doc(db, "users", uid, "progress", `${language}_${chapterId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export function getLocalChapterState(uid, language, chapterId) {
  try {
    const raw = localStorage.getItem(`lesson_state_${uid || "guest"}_${language}_${chapterId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalChapterState(uid, language, chapterId, state) {
  try {
    localStorage.setItem(
      `lesson_state_${uid || "guest"}_${language}_${chapterId}`,
      JSON.stringify({ ...state, updatedAt: Date.now() })
    );
  } catch {}
}

export function clearLocalChapterState(uid, language, chapterId) {
  try {
    localStorage.removeItem(`lesson_state_${uid || "guest"}_${language}_${chapterId}`);
  } catch {}
}

export async function getAllProgress(uid) {
  const snap = await getDocs(collection(db, "users", uid, "progress"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : {};
}

// Cộng thời gian học vào hồ sơ và vào bản ghi theo ngày (để tính chuỗi ngày + biểu đồ tuần).
export async function addStudySeconds(uid, seconds) {
  if (seconds <= 0) return;
  const today = dateKey();
  const batch = writeBatch(db);
  batch.set(
    doc(db, "users", uid),
    { studySeconds: increment(seconds), lastActive: serverTimestamp() },
    { merge: true }
  );
  batch.set(
    doc(db, "users", uid, "daily", today),
    { date: today, seconds: increment(seconds) },
    { merge: true }
  );
  await batch.commit();
}

// Trả về { "YYYY-MM-DD": số giây } cho `days` ngày gần nhất.
export async function getDailyActivity(uid, days = 35) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const snap = await getDocs(
    query(collection(db, "users", uid, "daily"), where("date", ">=", dateKey(since)))
  );
  return Object.fromEntries(snap.docs.map((d) => [d.data().date, d.data().seconds ?? 0]));
}

// Lưu hồ sơ học viên (tên, trường, lớp, tỉnh, huyện) vào users/{uid}. Không đụng tới `role`.
export async function saveProfile(uid, input, isTeacher = false) {
  const profile = normalizeProfile(input, isTeacher);
  const ref = doc(db, "users", uid);
  try {
    await setDoc(ref, profile, { merge: true });
  } catch (e) {
    if (e.code !== "permission-denied" || !auth.currentUser) throw e;
    // Token có thể còn cũ (chưa có email_verified). Làm mới rồi thử lại một lần.
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    await setDoc(ref, profile, { merge: true });
  }
  return profile;
}
