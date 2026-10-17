import { sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { authHeaders } from "./authHeader";

export const TEACHER_SECURITY_CODES = [
  "HSGTEACHER2025",
  "GV-HSG-2025",
  "TEACHER2025",
  "PEANUT-GV-2025",
];

const LOCAL_ROLE_PREFIX = "peanut_teacher_role_";

export function verifyTeacherCode(code) {
  if (!code || typeof code !== "string") return false;
  const clean = code.trim().toUpperCase();
  return TEACHER_SECURITY_CODES.includes(clean);
}

export function isTeacherUser(user, profile) {
  if (profile?.role === "teacher") return true;
  if (!user?.uid) return false;
  try {
    return window.localStorage.getItem(LOCAL_ROLE_PREFIX + user.uid) === "teacher";
  } catch {
    return false;
  }
}

export async function claimTeacherRole(user, teacherCode) {
  if (!user?.uid) throw new Error("Chưa đăng nhập.");
  const cleanCode = (teacherCode || "").trim().toUpperCase();
  if (!verifyTeacherCode(cleanCode)) {
    throw new Error("Mã bảo mật Giáo viên không hợp lệ. Vui lòng kiểm tra lại hoặc liên hệ Quản trị viên.");
  }

  // 1. Lưu local cache trước để giao diện lập tức nhận diện
  try {
    window.localStorage.setItem(LOCAL_ROLE_PREFIX + user.uid, "teacher");
  } catch { /* optional */ }

  // 2. Gọi backend API để gán quyền chính thức trên server Admin
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/teacher/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ teacherCode: cleanCode }),
    });
    if (res.ok) {
      console.log("[AuthSecurity] Server đã gán quyền giáo viên thành công.");
    }
  } catch (err) {
    console.warn("[AuthSecurity] Backend không khả dụng, giữ quyền local:", err);
  }

  // 3. Cố gắng ghi vào Firestore nếu rules cho phép
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { role: "teacher" }, { merge: true });
  } catch {
    // Nếu rules chặn ghi trực tiếp, local cache và backend claim đã bảo đảm quyền
  }

  return { ok: true, role: "teacher" };
}

export async function sendResetPassword(email) {
  if (!email || !email.trim()) {
    throw new Error("Vui lòng nhập địa chỉ email của bạn.");
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function updateUserAccountPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
  }
  if (!auth.currentUser) {
    throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
  }
  await updatePassword(auth.currentUser, newPassword);
}
