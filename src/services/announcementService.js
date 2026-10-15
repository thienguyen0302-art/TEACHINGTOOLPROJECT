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
  try {
    const colRef = collection(db, "announcements");
    // Thử lắng nghe realtime
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let createdAt = new Date().toISOString();
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === "string") {
            createdAt = data.createdAt;
          }
          return {
            id: docSnap.id,
            ...data,
            createdAt,
          };
        });

        // Sắp xếp: ghim lên đầu, sau đó theo thời gian giảm dần
        items.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Lưu cache cục bộ
        if (items.length > 0) {
          try {
            window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(items));
          } catch { /* Local cache is optional. */ }
          callback(items);
        } else {
          callback(DEFAULT_ANNOUNCEMENTS);
        }
      },
      (error) => {
        console.warn("Không thể tải realtime thông báo Firestore, dùng dữ liệu cache:", error);
        loadLocalFallback(callback);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Lỗi khởi tạo lắng nghe thông báo:", err);
    loadLocalFallback(callback);
    return () => {};
  }
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

  const payload = {
    title: cleanTitle,
    content: cleanContent,
    type,
    pinned: Boolean(pinned),
    authorName: authorName || "Giáo viên",
    authorUid: authorUid || "",
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, "announcements"), payload);
    return { id: docRef.id, ...payload, createdAt: new Date().toISOString() };
  } catch (err) {
    console.error("Lỗi khi thêm thông báo vào Firestore:", err);
    // Nếu gặp lỗi mạng hoặc rules, lưu tạm vào local cache để test
    const newId = "local-" + Date.now();
    const localItem = { ...payload, id: newId, createdAt: new Date().toISOString() };
    try {
      const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
      const updated = [localItem, ...cached];
      window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
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
