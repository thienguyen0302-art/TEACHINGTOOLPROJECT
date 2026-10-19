import {
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "./firebase";
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

export async function claimTeacherRole(user, teacherCode) {
  if (!user?.uid) throw new Error("Chưa đăng nhập.");
  const code = String(teacherCode || "").trim();
  if (!verifyTeacherCode(code)) {
    throw new Error("Hãy nhập mã bảo mật giáo viên do quản trị viên cấp.");
  }
  const headers = await authHeaders();
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

export async function sendResetPassword(email) {
  if (!email || !email.trim()) {
    throw new Error("Vui lòng nhập địa chỉ email của bạn.");
  }
  await sendPasswordResetEmail(auth, email.trim());
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
      throw new Error("Mật khẩu cũ không chính xác. Vui lòng kiểm tra lại.");
    }
    if (err.code === "auth/too-many-requests") {
      throw new Error("Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau vài phút.");
    }
    throw err;
  }

  // 2. Mật khẩu cũ đúng -> Cập nhật sang mật khẩu mới
  await updatePassword(user, newPassword);
}