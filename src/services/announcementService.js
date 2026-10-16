import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_STORAGE_KEY_PREFIX = "peanut_read_announcements_";
const LOCAL_ANNOUNCEMENTS_KEY = "peanut_local_announcements_cache";

export const ANNOUNCEMENT_TYPES = {
  general: { label: "Thông báo chung", badge: "Chung", color: "blue", icon: "megaphone" },
  exam: { label: "Lịch thi HSG", badge: "Đề thi", color: "purple", icon: "trophy" },
  reminder: { label: "Nhắc nhở học tập", badge: "Nhắc nhở", color: "orange", icon: "clock" },
  urgent: { label: "Tin quan trọng", badge: "Quan trọng", color: "red", icon: "fire" },
};

// Mẫu thông báo mặc định ban đầu nếu hệ thống chưa có thông báo nào
export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "welcome-system",
    title: "Chào mừng đến với nền tảng ôn thi HSG PeanutCode!",
    content: "Các em hãy chủ động hoàn thành các chuyên đề theo lộ trình và luyện tập tại Kho bài tập. Giáo viên sẽ thường xuyên gửi thông báo lịch kiểm tra và đề thi thử mới tại đây.",
    type: "general",
    authorName: "Ban quản trị PeanutCode",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    pinned: true,
  },
];

// Lắng nghe realtime danh sách thông báo
export function subscribeAnnouncements(callback) {
  let isCancelled = false;
  let retryTimer = null;
  let unsubscribeFirestore = () => {};

  function connect() {
    if (isCancelled) return;
    try {
      const colRef = collection(db, "announcements");
      unsubscribeFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let createdAt = new Date().toISOString();
            if (data.createdAt?.toDate) {
              createdAt = data.createdAt.toDate().toISOString();
            } else if (data.createdAt?.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
            } else if (typeof data.createdAt === "string") {
              createdAt = data.createdAt;
            }
            return {
              id: docSnap.id,
              ...data,
              createdAt,
            };
          });

          // Sắp xếp: thông báo ghim lên đầu, sau đó theo thời gian TỪ MỚI ĐẾN CŨ
          items.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          if (items.length > 0) {
            try {
              window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(items));
            } catch { /* Local cache is optional. */ }
            callback(items);
          } else {
            // Nếu Firestore trống: kiểm tra cache local trước, nếu không thì dùng mặc định
            try {
              const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
              if (Array.isArray(cached) && cached.length > 0) {
                callback(cached);
                return;
              }
            } catch { /* Local cache is optional. */ }
            callback(DEFAULT_ANNOUNCEMENTS);
          }
        },
        (error) => {
          console.warn("[Announcement] Không thể tải realtime Firestore, dùng dữ liệu cache:", error);
          loadLocalFallback(callback);
          // Tự động thử kết nối lại sau 3s nếu bị gián đoạn mạng
          if (!isCancelled) {
            retryTimer = setTimeout(connect, 3000);
          }
        }
      );
    } catch (err) {
      console.warn("[Announcement] Lỗi khởi tạo lắng nghe Firestore:", err);
      loadLocalFallback(callback);
      if (!isCancelled) {
        retryTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  // Lắng nghe sự kiện local cập nhật tức thì trên cùng tab/browser
  function onLocalUpdate(e) {
    if (Array.isArray(e.detail) && e.detail.length > 0) {
      callback(e.detail);
    }
  }
  window.addEventListener("peanut:announcements:updated", onLocalUpdate);

  return () => {
    isCancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    try { unsubscribeFirestore(); } catch {}
    window.removeEventListener("peanut:announcements:updated", onLocalUpdate);
  };
}

function loadLocalFallback(callback) {
  try {
    const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
    if (Array.isArray(cached) && cached.length > 0) {
      callback(cached);
      return;
    }
  } catch { /* Local cache is optional. */ }
  callback(DEFAULT_ANNOUNCEMENTS);
}

// Giáo viên đăng thông báo mới
export async function createAnnouncement({ title, content, type = "general", pinned = false, authorName = "Giáo viên", authorUid = "" }) {
  const cleanTitle = String(title || "").trim();
  const cleanContent = String(content || "").trim();
  if (!cleanTitle) throw new Error("Tiêu đề thông báo không được để trống.");
  if (!cleanContent) throw new Error("Nội dung thông báo không được để trống.");

  const currentUid = authorUid || (typeof db !== "undefined" && db?.app?.auth ? db.app.auth().currentUser?.uid : "");
  const payload = {
    title: cleanTitle,
    content: cleanContent,
    type,
    pinned: Boolean(pinned),
    authorName: authorName || "Giáo viên",
    authorUid: currentUid || "",
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, "announcements"), payload);
    console.log("[Announcement] Đã đăng thành công lên Firestore:", docRef.id);
    const resultItem = {
      id: docRef.id,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    // Đồng thời cập nhật cache và phát event để hiển thị tức thì
    try {
      const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
      const updated = [resultItem, ...cached.filter((x) => x.id !== resultItem.id)].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("peanut:announcements:updated", { detail: updated }));
    } catch {}
    return resultItem;
  } catch (err) {
    console.error("[Announcement] Lỗi khi thêm vào Firestore:", err.code, err.message);
    // Nếu gặp lỗi mạng hoặc rules, lưu tạm vào local cache để vẫn hiển thị được
    const newId = "local-" + Date.now();
    const localItem = { ...payload, id: newId, createdAt: new Date().toISOString() };
    try {
      const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
      const updated = [localItem, ...cached].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("peanut:announcements:updated", { detail: updated }));
    } catch { /* Local cache is optional. */ }
    return localItem;
  }
}


// Giáo viên xóa thông báo
export async function deleteAnnouncement(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, "announcements", id));
  } catch (err) {
    console.warn("Không xóa được từ Firestore, cập nhật cache:", err);
  }
  try {
    const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
    const updated = cached.filter((item) => item.id !== id);
    window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
  } catch { /* Local cache is optional. */ }
}

// Lấy danh sách ID thông báo đã đọc của học sinh
export function getReadNotificationIds(uid) {
  const key = LOCAL_STORAGE_KEY_PREFIX + (uid || "guest");
  try {
    const data = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Đánh dấu 1 thông báo là đã đọc
export function markNotificationAsRead(uid, announcementId) {
  if (!announcementId) return;
  const key = LOCAL_STORAGE_KEY_PREFIX + (uid || "guest");
  try {
    const current = getReadNotificationIds(uid);
    if (!current.includes(announcementId)) {
      const next = [...current, announcementId];
      window.localStorage.setItem(key, JSON.stringify(next));
    }
  } catch { /* Local cache is optional. */ }
}

// Đánh dấu tất cả thông báo hiện tại là đã đọc
export function markAllNotificationsAsRead(uid, announcementIds = []) {
  const key = LOCAL_STORAGE_KEY_PREFIX + (uid || "guest");
  try {
    const current = getReadNotificationIds(uid);
    const set = new Set([...current, ...announcementIds]);
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch { /* Local cache is optional. */ }
}
