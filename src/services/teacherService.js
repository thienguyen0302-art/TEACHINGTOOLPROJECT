import { collection, collectionGroup, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { buildClassOverview } from "../utils/teacher";

function parseTimestamp(val) {
  if (!val) return null;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function mapUserDoc(d) {
  const data = d.data();
  const lastActive = parseTimestamp(data.lastActive) || parseTimestamp(data.updatedAt) || parseTimestamp(data.createdAt) || parseTimestamp(data.firstLoginAt);
  return {
    uid: d.id,
    ...data,
    lastActive,
  };
}

function mapProgressDoc(d) {
  const uid = d.ref.parent?.parent?.id;
  return { uid, ...d.data() };
}

// Chỉ tài khoản có users/{uid}.role === "teacher" đọc được (xem firestore.rules).
export async function getClassOverview() {
  const [users, progress] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collectionGroup(db, "progress")).catch((err) => {
      console.warn("[TeacherService] collectionGroup('progress') error:", err);
      return { docs: [] };
    }),
  ]);
  return buildClassOverview(
    users.docs.map(mapUserDoc),
    progress.docs.map(mapProgressDoc),
  );
}

// Lắng nghe dữ liệu học sinh thay đổi theo thời gian thực (Real-time Live Sync)
export function subscribeClassOverview(onUpdate, onError) {
  let usersList = null;
  let progressList = null;
  let isCancelled = false;

  function pushUpdate() {
    if (isCancelled || !usersList || !progressList) return;
    try {
      const overview = buildClassOverview(usersList, progressList);
      onUpdate(overview);
    } catch (err) {
      if (onError) onError(err);
    }
  }

  const unsubUsers = onSnapshot(
    collection(db, "users"),
    (snap) => {
      usersList = snap.docs.map(mapUserDoc);
      pushUpdate();
    },
    (err) => {
      console.warn("[TeacherService] Lỗi lắng nghe users realtime:", err);
      if (onError) onError(err);
    }
  );

  const unsubProgress = onSnapshot(
    collectionGroup(db, "progress"),
    (snap) => {
      progressList = snap.docs.map(mapProgressDoc);
      pushUpdate();
    },
    (err) => {
      console.warn("[TeacherService] Lỗi lắng nghe progress realtime:", err);
      if (!progressList) {
        progressList = [];
        pushUpdate();
      }
      if (onError) onError(err);
    }
  );

  return () => {
    isCancelled = true;
    try { unsubUsers(); } catch { /* bỏ qua: lỗi không ảnh hưởng luồng chính */ }
    try { unsubProgress(); } catch { /* bỏ qua: lỗi không ảnh hưởng luồng chính */ }
  };
}

