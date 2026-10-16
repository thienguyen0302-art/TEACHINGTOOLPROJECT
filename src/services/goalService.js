/**
 * goalService.js – Quản lý mục tiêu học tập tự đặt của học sinh & nhắc nhở
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_STORAGE_GOALS_KEY = "peanut_study_goals";

function getLocalGoals(uid) {
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_GOALS_KEY}_${uid || "guest"}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGoals(uid, list) {
  try {
    window.localStorage.setItem(`${LOCAL_STORAGE_GOALS_KEY}_${uid || "guest"}`, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Lắng nghe realtime danh sách mục tiêu của học sinh
 */
export function subscribeGoals(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  try {
    const colRef = collection(db, "users", uid, "goals");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        // Sắp xếp: chưa hoàn thành trước, sau đó theo targetDate
        items.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return (a.targetDate || "").localeCompare(b.targetDate || "");
        });
        saveLocalGoals(uid, items);
        callback(items);
      },
      (error) => {
        console.warn("Lỗi Firestore realtime goals, dùng local cache:", error.message);
        callback(getLocalGoals(uid));
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Không khởi tạo được realtime goals:", err);
    callback(getLocalGoals(uid));
    return () => {};
  }
}

/**
 * Lấy danh sách mục tiêu
 */
export async function getGoals(uid) {
  if (!uid) return [];
  try {
    const colRef = collection(db, "users", uid, "goals");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.targetDate || "").localeCompare(b.targetDate || "");
      });
      saveLocalGoals(uid, items);
      return items;
    }
  } catch (err) {
    console.warn("Lỗi tải goals từ Firestore:", err);
  }
  return getLocalGoals(uid);
}

/**
 * Thêm hoặc cập nhật mục tiêu học tập
 */
export async function saveGoal(uid, goal) {
  if (!uid) throw new Error("Chưa đăng nhập");
  if (!goal.title?.trim()) throw new Error("Vui lòng nhập tiêu đề mục tiêu");

  const id = goal.id || `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const payload = {
    id,
    uid,
    title: goal.title.trim(),
    targetDate: goal.targetDate || new Date().toISOString().slice(0, 10),
    targetType: goal.targetType || "practice",
    targetValue: goal.targetValue || "",
    notes: (goal.notes || "").trim(),
    completed: Boolean(goal.completed),
    createdAt: goal.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, "users", uid, "goals", id);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn("Không lưu được goal vào Firestore, lưu local:", err);
  }

  // Cập nhật local cache
  const cached = getLocalGoals(uid);
  const idx = cached.findIndex((g) => g.id === id);
  if (idx >= 0) cached[idx] = payload;
  else cached.unshift(payload);
  saveLocalGoals(uid, cached);

  return payload;
}

/**
 * Chuyển trạng thái hoàn thành của mục tiêu
 */
export async function toggleGoalCompleted(uid, goalId, completed) {
  if (!uid || !goalId) return;
  const now = new Date().toISOString();
  const updateData = {
    completed,
    completedAt: completed ? now : null,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, "users", uid, "goals", goalId);
    await setDoc(docRef, updateData, { merge: true });
  } catch (err) {
    console.warn("Lỗi toggle goal Firestore:", err);
  }

  const cached = getLocalGoals(uid);
  const found = cached.find((g) => g.id === goalId);
  if (found) {
    found.completed = completed;
    found.completedAt = completed ? now : null;
    saveLocalGoals(uid, cached);
  }
}

/**
 * Xóa mục tiêu
 */
export async function deleteGoal(uid, goalId) {
  if (!uid || !goalId) return;
  try {
    await deleteDoc(doc(db, "users", uid, "goals", goalId));
  } catch (err) {
    console.warn("Lỗi xóa goal Firestore:", err);
  }
  const cached = getLocalGoals(uid).filter((g) => g.id !== goalId);
  saveLocalGoals(uid, cached);
}

/**
 * Lấy các mục tiêu đến hạn hôm nay hoặc quá hạn (chưa hoàn thành)
 */
export function getDueGoals(goals = []) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return goals.filter((g) => {
    if (g.completed) return false;
    return g.targetDate && g.targetDate <= todayStr;
  });
}
