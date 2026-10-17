/**
 * goalService.js – Quản lý mục tiêu học tập tự đặt của học sinh & nhắc nhở
 * - Hỗ trợ lưu trữ offline / local cache tức thời
 * - Cơ chế broadcast subscriber để cập nhật UI ngay lập tức khi thêm/sửa/xóa mục tiêu
 * - Đồng bộ hai chiều với Firestore collection users/{uid}/goals
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "./firebase";

const LOCAL_STORAGE_GOALS_KEY = "peanut_study_goals";

// Quản lý các subscriber đang lắng nghe theo uid
const listenersByUid = new Map();

function getSafeUid(uid) {
  return uid || auth?.currentUser?.uid || "guest";
}

function sortGoals(items) {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.targetDate || "").localeCompare(b.targetDate || "");
  });
}

function notifySubscribers(uid, items) {
  const safeUid = getSafeUid(uid);
  const subs = listenersByUid.get(safeUid);
  if (subs) {
    const sorted = sortGoals(items);
    subs.forEach((cb) => {
      try {
        cb(sorted);
      } catch (err) {
        console.error("Lỗi callback goal subscriber:", err);
      }
    });
  }
}

export function getLocalGoals(uid) {
  const safeUid = getSafeUid(uid);
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_GOALS_KEY}_${safeUid}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sortGoals(parsed) : [];
  } catch {
    return [];
  }
}

export function saveLocalGoals(uid, list) {
  const safeUid = getSafeUid(uid);
  try {
    window.localStorage.setItem(`${LOCAL_STORAGE_GOALS_KEY}_${safeUid}`, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Lắng nghe realtime danh sách mục tiêu của học sinh
 * Trả về ngay lập tức dữ liệu từ local cache để UI không bị delay
 */
export function subscribeGoals(uid, callback) {
  const safeUid = getSafeUid(uid);
  if (!safeUid) {
    callback([]);
    return () => {};
  }

  // 1. Phục vụ ngay danh sách từ local cache
  const initial = getLocalGoals(safeUid);
  callback(initial);

  // 2. Đăng ký listener vào bộ broadcast
  if (!listenersByUid.has(safeUid)) {
    listenersByUid.set(safeUid, new Set());
  }
  listenersByUid.get(safeUid).add(callback);

  // 3. Kết nối Firestore Realtime nếu có kết nối
  let firestoreUnsub = null;
  try {
    if (db && safeUid !== "guest") {
      const colRef = collection(db, "users", safeUid, "goals");
      firestoreUnsub = onSnapshot(
        colRef,
        (snapshot) => {
          const firestoreItems = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          const currentLocal = getLocalGoals(safeUid);
          const mergedMap = new Map();

          // 1. Nếu Firestore có dữ liệu, đưa vào map
          firestoreItems.forEach((item) => mergedMap.set(item.id, item));

          // 2. Bảo toàn các mục tiêu cục bộ chưa kịp đồng bộ hoặc khi Firestore rỗng
          currentLocal.forEach((item) => {
            if (!mergedMap.has(item.id)) {
              mergedMap.set(item.id, item);
              // Tự động đẩy ngược lên Firestore để bảo toàn dữ liệu
              if (db && safeUid !== "guest") {
                setDoc(doc(db, "users", safeUid, "goals", item.id), item, { merge: true }).catch(() => {});
              }
            }
          });

          const sorted = sortGoals(Array.from(mergedMap.values()));
          saveLocalGoals(safeUid, sorted);
          notifySubscribers(safeUid, sorted);
        },
        (error) => {
          console.warn("Firestore realtime goals cảnh báo (dùng local cache):", error.message);
          // Vẫn phục vụ local cache nếu Firestore chưa sẵn sàng
          const fallback = getLocalGoals(safeUid);
          callback(fallback);
        }
      );
    }
  } catch (err) {
    console.warn("Không khởi tạo được realtime Firestore goals:", err);
  }

  return () => {
    const subs = listenersByUid.get(safeUid);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        listenersByUid.delete(safeUid);
      }
    }
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch {
        // ignore
      }
    }
  };
}

/**
 * Lấy danh sách mục tiêu
 */
export async function getGoals(uid) {
  const safeUid = getSafeUid(uid);
  try {
    if (db && safeUid !== "guest") {
      const colRef = collection(db, "users", safeUid, "goals");
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const sorted = sortGoals(items);
        saveLocalGoals(safeUid, sorted);
        return sorted;
      }
    }
  } catch (err) {
    console.warn("Lỗi tải goals từ Firestore:", err);
  }
  return getLocalGoals(safeUid);
}

/**
 * Thêm hoặc cập nhật mục tiêu học tập
 * - Lưu ngay lập tức vào LocalStorage và thông báo ngay đến toàn bộ UI
 * - Đồng bộ ngầm lên Firestore
 */
export async function saveGoal(uid, goal) {
  const safeUid = getSafeUid(uid);
  if (!goal.title?.trim()) throw new Error("Vui lòng nhập tên mục tiêu");

  const id = goal.id || `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const payload = {
    id,
    uid: safeUid,
    title: goal.title.trim(),
    targetDate: goal.targetDate || new Date().toISOString().slice(0, 10),
    targetType: goal.targetType || "practice",
    targetValue: goal.targetValue || "",
    notes: (goal.notes || "").trim(),
    completed: Boolean(goal.completed),
    createdAt: goal.createdAt || now,
    updatedAt: now,
  };

  // 1. Cập nhật ngay local cache và phát thông báo tức thì đến React Component
  const cached = getLocalGoals(safeUid);
  const idx = cached.findIndex((g) => g.id === id);
  let updatedList;
  if (idx >= 0) {
    updatedList = cached.map((g, i) => (i === idx ? payload : g));
  } else {
    updatedList = [payload, ...cached];
  }
  updatedList = sortGoals(updatedList);
  saveLocalGoals(safeUid, updatedList);
  notifySubscribers(safeUid, updatedList);

  // 2. Lưu đồng bộ lên Firestore
  try {
    if (db && safeUid !== "guest") {
      const docRef = doc(db, "users", safeUid, "goals", id);
      await setDoc(docRef, payload, { merge: true });
    }
  } catch (err) {
    console.warn("Không thể lưu goal lên Firestore (đã lưu an toàn trên máy):", err);
  }

  return payload;
}

/**
 * Chuyển trạng thái hoàn thành của mục tiêu
 */
export async function toggleGoalCompleted(uid, goalId, completed) {
  const safeUid = getSafeUid(uid);
  if (!goalId) return;
  const now = new Date().toISOString();
  const updateData = {
    completed,
    completedAt: completed ? now : null,
    updatedAt: now,
  };

  // Cập nhật local ngay lập tức
  const cached = getLocalGoals(safeUid);
  const updatedList = cached.map((g) =>
    g.id === goalId ? { ...g, ...updateData } : g
  );
  saveLocalGoals(safeUid, updatedList);
  notifySubscribers(safeUid, updatedList);

  // Lưu Firestore ngầm
  try {
    if (db && safeUid !== "guest") {
      const docRef = doc(db, "users", safeUid, "goals", goalId);
      await setDoc(docRef, updateData, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi toggle goal Firestore:", err);
  }
}

/**
 * Xóa mục tiêu
 */
export async function deleteGoal(uid, goalId) {
  const safeUid = getSafeUid(uid);
  if (!goalId) return;

  // Xóa local ngay lập tức
  const cached = getLocalGoals(safeUid).filter((g) => g.id !== goalId);
  saveLocalGoals(safeUid, cached);
  notifySubscribers(safeUid, cached);

  // Xóa Firestore ngầm
  try {
    if (db && safeUid !== "guest") {
      await deleteDoc(doc(db, "users", safeUid, "goals", goalId));
    }
  } catch (err) {
    console.warn("Lỗi xóa goal Firestore:", err);
  }
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
