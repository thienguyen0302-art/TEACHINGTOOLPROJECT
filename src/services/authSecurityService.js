import {
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { authHeaders } from "./authHeader";

// Mã giáo viên KHÔNG được lưu trong mã nguồn trình duyệt: ai mở DevTools cũng đọc được.
// Việc kiểm tra mã và gán vai trò chỉ diễn ra ở server (POST /api/teacher/claim).

/** Chỉ kiểm tra hình thức để báo lỗi sớm; đúng/sai do server quyết định. */
export function verifyTeacherCode(code) {
  return typeof code === "string" && code.trim().length >= 8;
}

/** Vai trò giáo viên chỉ lấy từ hồ sơ Firestore (do server ghi), không tin localStorage. */
export function isTeacherUser(user, profile) {
  return Boolean(user?.uid) && profile?.role === "teacher";
}

/** Kiểm tra mã giáo viên ở server TRƯỚC khi tạo tài khoản. Ném lỗi nếu sai. */
export async function verifyTeacherCodeRemote(teacherCode) {
  const code = String(teacherCode || "").trim();
  if (!verifyTeacherCode(code)) {
    throw new Error("Hãy nhập mã bảo mật giáo viên do quản trị viên cấp.");
  }
  let res;
  try {
    res = await fetch("/api/teacher/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherCode: code }),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Hãy thử lại sau.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Mã bảo mật giáo viên không chính xác.");
  }
  return true;
}

export async function claimTeacherRole(user, teacherCode) {
  if (!user?.uid) throw new Error("Chưa đăng nhập.");
  const code = String(teacherCode || "").trim();
  if (!verifyTeacherCode(code)) {
    throw new Error("Hãy nhập mã bảo mật giáo viên do quản trị viên cấp.");
  }
  // Lấy token trực tiếp từ user vừa đăng nhập (không phụ thuộc auth.currentUser) và báo lỗi rõ nếu không lấy được.
  let token;
  try {
    token = await user.getIdToken();
  } catch {
    throw new Error("Không lấy được phiên đăng nhập. Hãy tải lại trang và đăng nhập lại.");
  }
  const headers = { Authorization: `Bearer ${token}` };
  let res;
  try {
    res = await fetch("/api/teacher/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ teacherCode: code }),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Hãy thử lại sau.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Mã bảo mật giáo viên không chính xác.");
  }
  return { ok: true, role: "teacher" };
}

/**
 * Gửi email đặt lại mật khẩu với giao diện chuẩn PeanutCode (tiêu đề và người gửi luôn là PeanutCode).
 * Tự động ưu tiên backend SMTP để gửi mẫu thư HTML đẹp, và dự phòng Firebase Authentication nếu backend chưa sẵn sàng.
 */
export async function sendResetPassword(email) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) {
    throw new Error("Vui lòng nhập địa chỉ email của bạn.");
  }

  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  };

  // 1. Thử gửi qua endpoint server PeanutCode (chứa mẫu HTML thương hiệu PeanutCode và tựa đề PeanutCode)
  try {
    const res = await fetch("/api/auth/send-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, origin: window.location.origin }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, method: "server", message: data.message };
    }
  } catch {
    // Dự phòng tự động nếu không gọi được server
  }

  // 2. Dự phòng an toàn qua Firebase Client SDK
  await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
  return { ok: true, method: "firebase" };
}

/**
 * Gửi email xác minh tài khoản với giao diện chuẩn PeanutCode (tiêu đề và người gửi luôn là PeanutCode).
 * Tự động ưu tiên backend SMTP để gửi mẫu thư HTML đẹp, và dự phòng Firebase Authentication nếu backend chưa sẵn sàng.
 */
export async function sendVerificationEmail(user) {
  const targetUser = user || auth.currentUser;
  const cleanEmail = targetUser?.email ? String(targetUser.email).trim() : "";
  if (!cleanEmail) {
    throw new Error("Không tìm thấy thông tin email của tài khoản.");
  }

  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false,
  };

  // 1. Thử gửi qua endpoint server PeanutCode (chứa mẫu HTML thương hiệu PeanutCode và tựa đề PeanutCode)
  try {
    const res = await fetch("/api/auth/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, origin: window.location.origin }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, method: "server", message: data.message };
    }
  } catch {
    // Dự phòng tự động nếu không gọi được server
  }

  // 2. Dự phòng an toàn qua Firebase Client SDK
  if (targetUser) {
    await sendEmailVerification(targetUser, actionCodeSettings);
    return { ok: true, method: "firebase" };
  }
  throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
}

export async function updateUserAccountPassword(oldPassword, newPassword) {
  if (!oldPassword || !oldPassword.trim()) {
    throw new Error("Vui lòng nhập mật khẩu hiện tại (mật khẩu cũ).");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
  }
  if (oldPassword === newPassword) {
    throw new Error("Mật khẩu mới không được trùng với mật khẩu cũ.");
  }
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }

  // 1. Xác thực mật khẩu cũ trước khi cho phép đổi
  try {
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    if (
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-credential" ||
      err.code === "auth/invalid-login-credentials"
    ) {
      throw new Error("Mật khẩu cũ không chính xác. Vui lòng kiểm tra lại.", { cause: err });
    }
    if (err.code === "auth/too-many-requests") {
      throw new Error("Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau vài phút.", { cause: err });
    }
    throw err;
  }

  // 2. Mật khẩu cũ đúng -> Cập nhật sang mật khẩu mới
  await updatePassword(user, newPassword);
}

/**
 * Xoá sạch toàn bộ dữ liệu lưu trữ cục bộ (LocalStorage & SessionStorage) của người dùng trên trình duyệt.
 */
export function purgeUserLocalData(uid) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        !uid ||
        key.includes(uid) ||
        key.startsWith("lesson_state_") ||
        key.startsWith("teacher_note_") ||
        key.startsWith("notification_settings_") ||
        key.startsWith("peanut_") ||
        key.startsWith("announcements_") ||
        key.startsWith("firebase:")
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    sessionStorage.clear();
  } catch (e) {
    console.warn("Lỗi khi dọn dẹp storage:", e);
  }
}

/**
 * Xoá toàn bộ dữ liệu người dùng trên Firestore (subcollections & document chính).
 */
export async function purgeUserDataFromFirestore(uid) {
  if (!uid) return;

  const subcollections = [
    "progress",
    "submissions",
    "daily",
    "goals",
    "contestHistory",
    "contestSubmissions",
  ];

  // Xoá tất cả tài liệu trong các subcollections của người dùng
  for (const colName of subcollections) {
    try {
      const colRef = collection(db, "users", uid, colName);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const deletes = snap.docs.map((d) => deleteDoc(d.ref).catch(() => {}));
        await Promise.all(deletes);
      }
    } catch (e) {
      console.warn(`Lỗi khi dọn dẹp subcollection ${colName}:`, e);
    }
  }

  // Xoá bài đánh giá cá nhân reviews/{uid} nếu có
  try {
    await deleteDoc(doc(db, "reviews", uid));
  } catch (e) {
    console.warn("Lỗi khi dọn dẹp reviews:", e);
  }

  // Xoá tài liệu chính users/{uid}
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch (e) {
    console.warn("Lỗi khi xoá doc users/${uid}, thực hiện reset trắng dữ liệu:", e);
    // Dự phòng an toàn: nếu rules chặn xoá document, ta ghi đè rỗng dữ liệu
    try {
      await setDoc(doc(db, "users", uid), {
        displayName: "",
        school: "",
        className: "",
        province: "",
        language: null,
        studySeconds: 0,
        deletedAt: new Date().toISOString(),
      });
    } catch { /* bỏ qua: lỗi không ảnh hưởng luồng chính */ }
  }
}

/**
 * Xoá hoàn toàn tài khoản người dùng và toàn bộ dữ liệu học tập trên PeanutCode.
 * Sau khi xoá thành công, tài khoản bị xoá khỏi Firebase Authentication và dữ liệu bị xoá sạch.
 * Khi người dùng đăng nhập lại lần sau, họ sẽ được coi như một người dùng mới hoàn toàn.
 */
export async function deleteUserAccount({ password = "" } = {}) {
  const user = auth.currentUser;
  if (!user || !user.uid) {
    throw new Error("Không tìm thấy phiên làm việc. Vui lòng tải lại trang hoặc đăng nhập lại.");
  }
  const uid = user.uid;
  const isPasswordUser = (user.providerData || []).some(
    (p) => p.providerId === "password"
  );
  const isGoogleUser = (user.providerData || []).some(
    (p) => p.providerId === "google.com"
  );

  // 1. Xác thực lại mật khẩu đối với tài khoản đăng nhập bằng Email / Mật khẩu
  if (isPasswordUser) {
    if (!password || !password.trim()) {
      throw new Error("Vui lòng nhập mật khẩu hiện tại để xác nhận xoá tài khoản.");
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/invalid-login-credentials"
      ) {
        throw new Error("Mật khẩu xác nhận không chính xác. Vui lòng kiểm tra lại.", { cause: err });
      }
      if (err.code === "auth/too-many-requests") {
        throw new Error("Bạn đã thử sai quá nhiều lần. Vui lòng thử lại sau vài phút.", { cause: err });
      }
      throw err;
    }
  }

  // 2. Dọn dẹp toàn bộ dữ liệu người dùng trên Firestore
  await purgeUserDataFromFirestore(uid);

  // 3. Yêu cầu backend Admin xoá tài khoản trên Google Firebase Auth (nếu có cấu hình)
  try {
    const headers = await authHeaders();
    await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    }).catch(() => {});
  } catch { /* bỏ qua: lỗi không ảnh hưởng luồng chính */ }

  // 4. Dọn dẹp toàn bộ dữ liệu người dùng trên LocalStorage và SessionStorage
  purgeUserLocalData(uid);

  // 5. Xoá tài khoản xác thực trong Firebase Client Authentication
  try {
    await deleteUser(user);
  } catch (err) {
    if (err.code === "auth/requires-recent-login") {
      if (isGoogleUser) {
        // Đối với Google, mở popup xác thực lại rồi thử xoá tiếp
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
        await deleteUser(user);
      } else {
        throw new Error("Vì lý do bảo mật, phiên đăng nhập đã quá hạn. Vui lòng đăng nhập lại rồi thực hiện xoá tài khoản.", { cause: err });
      }
    } else if (err.code !== "auth/user-not-found") {
      throw err;
    }
  }

  // 6. Đăng xuất an toàn khỏi ứng dụng
  try {
    await signOut(auth);
  } catch { /* bỏ qua: lỗi không ảnh hưởng luồng chính */ }

  return { ok: true };
}