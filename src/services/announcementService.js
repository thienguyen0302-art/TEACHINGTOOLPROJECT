import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";

const LOCAL_STORAGE_KEY_PREFIX = "peanut_read_announcements_";
const LOCAL_ANNOUNCEMENTS_KEY = "peanut_local_announcements_cache";

export const ANNOUNCEMENT_TYPES = {
  general: { label: "Thông báo chung", badge: "Chung", color: "blue", icon: "megaphone" },
  exam: { label: "Lịch contest", badge: "Contest", color: "purple", icon: "trophy" },
  reminder: { label: "Nhắc nhở học tập", badge: "Nhắc nhở", color: "orange", icon: "clock" },
  urgent: { label: "Tin quan trọng", badge: "Quan trọng", color: "red", icon: "fire" },
};

// Lấy ngày học viên đăng nhập lần đầu tiên (hoặc tạo tài khoản) để hiển thị thông báo chào mừng chính xác
export function getFirstLoginDate(uid) {
  const currentUid = uid || (typeof auth !== "undefined" && auth?.currentUser?.uid);
  const storageKey = "peanut_first_login_" + (currentUid || "guest");

  // 1. Kiểm tra cache localStorage của tài khoản
  try {
    const cached = window.localStorage.getItem(storageKey);
    if (cached) {
      const d = new Date(cached);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch { /* Local storage is optional */ }

  // 2. Kiểm tra creationTime từ Firebase Auth metadata
  try {
    const currentAuthUser = auth?.currentUser;
    if (currentAuthUser && (!currentUid || currentAuthUser.uid === currentUid) && currentAuthUser.metadata?.creationTime) {
      const creationDate = new Date(currentAuthUser.metadata.creationTime);
      if (!isNaN(creationDate.getTime())) {
        const iso = creationDate.toISOString();
        try {
          window.localStorage.setItem(storageKey, iso);
        } catch { /* Local storage is optional */ }
        return iso;
      }
    }
  } catch { /* Auth check fallback */ }

  // 3. Kiểm tra key fallback chung
  try {
    const fallbackCurrent = window.localStorage.getItem("peanut_first_login_current");
    if (fallbackCurrent) {
      const d = new Date(fallbackCurrent);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch { /* Local storage is optional */ }

  // 4. Mặc định là thời điểm hiện tại (lần đầu đăng nhập) và lưu lại để dùng cho các phiên sau
  const nowIso = new Date().toISOString();
  try {
    window.localStorage.setItem(storageKey, nowIso);
    window.localStorage.setItem("peanut_first_login_current", nowIso);
  } catch { /* Local storage is optional */ }
  return nowIso;
}

// Lưu trữ ngày đăng nhập lần đầu của học viên từ hồ sơ Firestore / Auth
export function setStudentFirstLoginAt(uid, isoString) {
  if (!isoString) return;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return;
  const validIso = d.toISOString();
  const currentUid = uid || (typeof auth !== "undefined" && auth?.currentUser?.uid);
  const storageKey = "peanut_first_login_" + (currentUid || "guest");
  try {
    window.localStorage.setItem(storageKey, validIso);
    window.localStorage.setItem("peanut_first_login_current", validIso);
  } catch { /* Local storage is optional */ }
}

// Tạo thông báo chào mừng mặc định với ngày tạo khớp chính xác ngày học viên đăng nhập lần đầu
export function getWelcomeAnnouncement(uid) {
  return {
    id: "welcome-system",
    title: "Chào mừng đến với nền tảng ôn thi HSG PeanutCode!",
    content: "Các em hãy chủ động hoàn thành các chuyên đề theo lộ trình và luyện tập tại Kho bài tập. Giáo viên sẽ thường xuyên gửi thông báo lịch kiểm tra và đề thi thử mới tại đây.",
    type: "general",
    authorName: "Ban quản trị PeanutCode",
    createdAt: getFirstLoginDate(uid),
    pinned: true,
  };
}

// Mẫu thông báo mặc định ban đầu nếu hệ thống chưa có thông báo nào
export const DEFAULT_ANNOUNCEMENTS = [
  getWelcomeAnnouncement(),
];

// Lắng nghe realtime danh sách thông báo
export function subscribeAnnouncements(callback, options = {}) {
  let uid = "";
  let isTeacher = false;
  if (typeof options === "string") {
    uid = options;
  } else if (options && typeof options === "object") {
    uid = options.uid || "";
    isTeacher = Boolean(options.isTeacher);
  }

  let isCancelled = false;
  let retryTimer = null;
  let unsubscribeFirestore = () => {};

  function normalizeAnnouncements(items) {
    const welcomeDate = getFirstLoginDate(uid);
    let normalized = items.map((item) => {
      if (item.id === "welcome-system" || item.title?.includes("Chào mừng đến với nền tảng ôn thi HSG")) {
        return {
          ...item,
          createdAt: welcomeDate,
        };
      }
      return item;
    });

    // Đối với học viên, luôn đảm bảo có thông báo chào mừng ngày đăng nhập lần đầu
    if (!isTeacher && !normalized.some((x) => x.id === "welcome-system" || x.title?.includes("Chào mừng đến với nền tảng ôn thi HSG"))) {
      normalized = [getWelcomeAnnouncement(uid), ...normalized];
    }

    // Sắp xếp: thông báo ghim lên đầu, sau đó theo thời gian TỪ MỚI ĐẾN CŨ
    normalized.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return normalized;
  }

  function connect() {
    if (isCancelled) return;
    try {
      const colRef = collection(db, "announcements");
      unsubscribeFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          const rawItems = snapshot.docs.map((docSnap) => {
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

          if (rawItems.length > 0) {
            const finalItems = normalizeAnnouncements(rawItems);
            try {
              window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(finalItems));
            } catch { /* Local cache is optional. */ }
            callback(finalItems);
          } else {
            // Nếu Firestore trống: kiểm tra cache local trước, nếu không thì dùng mặc định
            try {
              const raw = window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY);
              if (raw) {
                const cached = JSON.parse(raw);
                if (Array.isArray(cached) && cached.length > 0) {
                  const finalCached = normalizeAnnouncements(cached);
                  callback(finalCached);
                  return;
                }
              }
            } catch { /* Local cache is optional. */ }
            const defaultList = isTeacher ? [] : [getWelcomeAnnouncement(uid)];
            callback(defaultList);
          }
        },
        (error) => {
          console.warn("[Announcement] Không thể tải realtime Firestore, dùng dữ liệu cache:", error);
          loadLocalFallback(callback, uid, isTeacher);
          // Tự động thử kết nối lại sau 3s nếu bị gián đoạn mạng
          if (!isCancelled) {
            retryTimer = setTimeout(connect, 3000);
          }
        }
      );
    } catch (err) {
      console.warn("[Announcement] Lỗi khởi tạo lắng nghe Firestore:", err);
      loadLocalFallback(callback, uid, isTeacher);
      if (!isCancelled) {
        retryTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  // Lắng nghe sự kiện local cập nhật tức thì trên cùng tab/browser
  function onLocalUpdate(e) {
    if (Array.isArray(e.detail) && e.detail.length > 0) {
      callback(normalizeAnnouncements(e.detail));
    }
  }
  window.addEventListener("peanut:announcements:updated", onLocalUpdate);

  return () => {
    isCancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    try { unsubscribeFirestore(); } catch (e) { console.warn(e); }
    window.removeEventListener("peanut:announcements:updated", onLocalUpdate);
  };
}

function loadLocalFallback(callback, uid, isTeacher) {
  try {
    const raw = window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Array.isArray(cached) && cached.length > 0) {
        const welcomeDate = getFirstLoginDate(uid);
        let normalized = cached.map((item) => {
          if (item.id === "welcome-system" || item.title?.includes("Chào mừng đến với nền tảng ôn thi HSG")) {
            return { ...item, createdAt: welcomeDate };
          }
          return item;
        });
        if (!isTeacher && !normalized.some((x) => x.id === "welcome-system" || x.title?.includes("Chào mừng đến với nền tảng ôn thi HSG"))) {
          normalized = [getWelcomeAnnouncement(uid), ...normalized];
        }
        normalized.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        callback(normalized);
        return;
      }
    }
  } catch { /* Local cache is optional. */ }
  const defaultList = isTeacher ? [] : [getWelcomeAnnouncement(uid)];
  callback(defaultList);
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
    } catch (e) { console.warn(e); }
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


// Giáo viên cập nhật nội dung thông báo
export async function updateAnnouncement(id, updates) {
  if (!id || !updates) return;
  const payload = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof updates.title === "string") payload.title = updates.title.trim();
  if (typeof updates.content === "string") payload.content = updates.content.trim();
  if (updates.type) payload.type = updates.type;
  if (typeof updates.pinned === "boolean") payload.pinned = updates.pinned;

  try {
    await updateDoc(doc(db, "announcements", id), payload);
  } catch (err) {
    console.warn("Không cập nhật được trên Firestore, cập nhật cache local:", err);
  }

  try {
    const cached = JSON.parse(window.localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY) || "[]");
    const updated = cached.map((item) => (item.id === id ? { ...item, ...payload } : item)).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    window.localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("peanut:announcements:updated", { detail: updated }));
  } catch { /* Local cache is optional. */ }
}

// Giáo viên ghim / bỏ ghim thông báo nhanh
export async function togglePinAnnouncement(id, currentPinned) {
  return updateAnnouncement(id, { pinned: !currentPinned });
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
    window.dispatchEvent(new CustomEvent("peanut:announcements:updated", { detail: updated }));
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
