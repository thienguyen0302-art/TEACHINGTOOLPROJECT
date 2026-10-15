import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_STORAGE_REVIEWS_KEY = "peanut_local_reviews_cache";

function getLocalCache() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCache(list) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Lắng nghe realtime danh sách đánh giá công khai đã được duyệt.
 * Chỉ trả về đánh giá có status === "approved" và isPublicConsent === true.
 */
export function subscribePublicReviews(callback) {
  try {
    const q = query(
      collection(db, "reviews"),
      where("status", "==", "approved"),
      where("isPublicConsent", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        // Sắp xếp mới nhất lên đầu
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        saveLocalCache(items);
        callback(items);
      },
      (error) => {
        console.warn("Lỗi Firestore realtime reviews, dùng cache:", error.message);
        const cached = getLocalCache().filter(
          (r) => r.status === "approved" && r.isPublicConsent === true
        );
        callback(cached);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("Không khởi tạo được realtime reviews:", err);
    const cached = getLocalCache().filter(
      (r) => r.status === "approved" && r.isPublicConsent === true
    );
    callback(cached);
    return () => {};
  }
}

/**
 * Lấy đánh giá của một học viên cụ thể (theo uid)
 */
export async function getUserReview(uid) {
  if (!uid) return null;
  try {
    const docRef = doc(db, "reviews", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.warn("Lỗi đọc đánh giá người dùng từ Firestore, tìm trong cache:", err);
  }

  // Fallback cache
  const cached = getLocalCache();
  return cached.find((r) => r.uid === uid) || null;
}

/**
 * Gửi hoặc cập nhật đánh giá của học viên.
 * Mỗi tài khoản chỉ có 1 đánh giá (docId = uid).
 * Mỗi lần chỉnh sửa nội dung sẽ tự động chuyển về trạng thái 'pending' (chờ duyệt).
 */
export async function submitUserReview({
  uid,
  displayName,
  rating,
  content,
  isPublicConsent = false,
  isVerifiedLearner = false,
}) {
  if (!uid) throw new Error("Chưa đăng nhập");
  if (!rating || rating < 1 || rating > 5) throw new Error("Vui lòng chọn số sao từ 1 đến 5");
  if (!content || content.trim().length < 10) {
    throw new Error("Nội dung đánh giá cần ít nhất 10 ký tự");
  }

  const now = new Date().toISOString();
  const existing = await getUserReview(uid).catch(() => null);

  const reviewData = {
    uid,
    displayName: (displayName || "").trim() || "Học viên PeanutCode",
    rating: Number(rating),
    content: content.trim(),
    isPublicConsent: Boolean(isPublicConsent),
    status: "pending", // Tự động về chờ duyệt khi tạo mới hoặc sửa
    isVerifiedLearner: Boolean(isVerifiedLearner || existing?.isVerifiedLearner),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, "reviews", uid);
    await setDoc(docRef, reviewData, { merge: true });
  } catch (err) {
    console.warn("Không lưu được vào Firestore, lưu vào local cache:", err);
  }

  // Cập nhật local cache
  const cached = getLocalCache();
  const idx = cached.findIndex((r) => r.uid === uid);
  if (idx >= 0) cached[idx] = reviewData;
  else cached.unshift(reviewData);
  saveLocalCache(cached);

  return reviewData;
}

/**
 * Rút lại hoặc xóa đánh giá của người dùng
 */
export async function deleteUserReview(uid) {
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "reviews", uid));
  } catch (err) {
    console.warn("Lỗi xóa review Firestore:", err);
  }
  const cached = getLocalCache().filter((r) => r.uid !== uid);
  saveLocalCache(cached);
}

/**
 * Dành cho Giáo viên / Quản trị viên: Kiểm duyệt đánh giá ('approved' | 'rejected' | 'hidden')
 */
export async function moderateReview(uid, status) {
  if (!uid || !status) return;
  const now = new Date().toISOString();
  try {
    const docRef = doc(db, "reviews", uid);
    await setDoc(docRef, { status, updatedAt: now }, { merge: true });
  } catch (err) {
    console.warn("Lỗi duyệt review:", err);
  }

  const cached = getLocalCache();
  const found = cached.find((r) => r.uid === uid);
  if (found) {
    found.status = status;
    found.updatedAt = now;
    saveLocalCache(cached);
  }
}
