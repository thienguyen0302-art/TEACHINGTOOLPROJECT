/**
 * bugReportService.js – Thu thập và quản lý Báo lỗi & Góp ý kỹ thuật gửi về đội ngũ xây dựng web
 */
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_STORAGE_BUGS_KEY = "peanut_bug_reports";

function getLocalReports(uid) {
  try {
    const raw = window.localStorage.getItem(
      uid ? `${LOCAL_STORAGE_BUGS_KEY}_${uid}` : LOCAL_STORAGE_BUGS_KEY
    );
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReports(uid, list) {
  try {
    const key = uid ? `${LOCAL_STORAGE_BUGS_KEY}_${uid}` : LOCAL_STORAGE_BUGS_KEY;
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const PUBLISHER_EMAIL = "lythuy84@gmail.com";

export function generateMailLinks({
  title,
  description,
  stepsToReproduce,
  category,
  severity,
  displayName,
  email,
  systemInfo,
}) {
  const severityLabel =
    severity === "critical"
      ? "KHẨN CẤP"
      : severity === "high"
      ? "CAO"
      : severity === "medium"
      ? "TRUNG BÌNH"
      : "THẤP";

  const subject = `[PeanutCode Báo Lỗi] [${severityLabel}] ${title}`;
  const body =
    `Kính gửi Cô Lý Thị Thanh Thúy (Người phát hành nền tảng PeanutCode),\n\n` +
    `Em/tôi xin gửi thông tin báo cáo lỗi kỹ thuật / đóng góp ý kiến như sau:\n\n` +
    `• Người gửi: ${displayName || "Học viên"} ${email ? `<${email}>` : ""}\n` +
    `• Phân loại: ${category}\n` +
    `• Mức độ: ${severityLabel}\n` +
    `• Tiêu đề sự cố: ${title}\n\n` +
    `────────────────────────────────────────\n` +
    `MÔ TẢ CHI TIẾT:\n${description}\n` +
    `────────────────────────────────────────\n\n` +
    (stepsToReproduce
      ? `CÁC BƯỚC TÁI HIỆN:\n${stepsToReproduce}\n\n`
      : "") +
    `THÔNG TIN MÔI TRƯỜNG KỸ THUẬT:\n` +
    `- URL: ${systemInfo?.url || ""}\n` +
    `- Trình duyệt: ${systemInfo?.userAgent || ""}\n` +
    `- Độ phân giải: ${systemInfo?.screenResolution || ""}\n` +
    `- Thời gian gửi: ${new Date().toLocaleString("vi-VN")}\n\n` +
    `Trân trọng cảm ơn Cô!`;

  const mailtoUrl = `mailto:${PUBLISHER_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    PUBLISHER_EMAIL
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { mailtoUrl, gmailUrl, subject, body, recipient: PUBLISHER_EMAIL };
}

/**
 * Gửi báo cáo lỗi kỹ thuật hoặc góp ý xây dựng web
 */
export async function submitBugReport({
  uid,
  displayName,
  email,
  category = "judge",
  severity = "medium",
  title,
  description,
  stepsToReproduce = "",
}) {
  if (!title?.trim()) throw new Error("Vui lòng nhập tóm tắt sự cố");
  if (!description?.trim() || description.trim().length < 10) {
    throw new Error("Mô tả sự cố cần ít nhất 10 ký tự");
  }

  const id = `bug_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // Tự động thu thập thông tin môi trường kỹ thuật
  const systemInfo = {
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    screenResolution:
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight} (Màn hình: ${window.screen?.width}x${window.screen?.height})`
        : "",
    language: typeof navigator !== "undefined" ? navigator.language : "vi-VN",
  };

  const report = {
    id,
    uid: uid || "anonymous",
    displayName: (displayName || "Học viên").trim(),
    email: email || "",
    category,
    severity,
    title: title.trim(),
    description: description.trim(),
    stepsToReproduce: stepsToReproduce.trim(),
    systemInfo,
    status: "new", // 'new' | 'investigating' | 'resolved'
    devNotes: "",
    createdAt: now,
    updatedAt: now,
  };

  // 1. Lưu vào Firestore collection "bugReports"
  try {
    const docRef = doc(db, "bugReports", id);
    await setDoc(docRef, report);
  } catch (err) {
    console.warn("Không lưu được bug report vào Firestore, lưu local cache:", err);
  }

  // 2. Ghi một bản sao vào collection "mail" cho Firebase Trigger Email Extension (nếu đã kích hoạt)
  try {
    const mailDocRef = doc(db, "mail", `mail_${id}`);
    await setDoc(mailDocRef, {
      to: PUBLISHER_EMAIL,
      message: {
        subject: `[PeanutCode Báo Lỗi] [${severity.toUpperCase()}] ${title.trim()}`,
        text: `Người gửi: ${report.displayName} (${report.email})\n\nMô tả:\n${report.description}\n\nCác bước:\n${report.stepsToReproduce}`,
      },
      createdAt: now,
    });
  } catch (err) {
    // Không chặn luồng nếu collection mail không có quyền
  }

  // 3. Gọi backend Node.js gửi email qua SMTP/Nodemailer (nếu server cấu hình)
  let emailDelivery = { sent: false, recipient: PUBLISHER_EMAIL };
  try {
    const resp = await fetch("/api/bug-report/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (resp.ok) {
      const data = await resp.json();
      emailDelivery = { ...emailDelivery, ...data };
    }
  } catch (err) {
    console.warn("Không thể kết nối đến backend gửi email:", err.message);
  }

  // 4. Update local cache
  const cached = getLocalReports(uid);
  cached.unshift(report);
  saveLocalReports(uid, cached);

  // 5. Chuẩn bị sẵn link mở Gmail và mailto
  const mailLinks = generateMailLinks(report);

  return {
    ...report,
    emailDelivery,
    mailLinks,
    recipient: PUBLISHER_EMAIL,
  };
}

/**
 * Lắng nghe danh sách báo lỗi của người dùng hiện tại
 */
export function subscribeUserBugReports(uid, callback) {
  if (!uid) {
    callback([]);
    return () => {};
  }

  try {
    const colRef = collection(db, "bugReports");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.uid === uid);
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        saveLocalReports(uid, items);
        callback(items);
      },
      (error) => {
        console.warn("Lỗi realtime bug reports, dùng local cache:", error.message);
        callback(getLocalReports(uid));
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Không khởi tạo được realtime user bug reports:", err);
    callback(getLocalReports(uid));
    return () => {};
  }
}

/**
 * Dành cho Người xây dựng web / Giáo viên: Lắng nghe toàn bộ báo lỗi
 */
export function subscribeAllBugReports(callback) {
  try {
    const colRef = collection(db, "bugReports");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        saveLocalReports(null, items);
        callback(items);
      },
      (error) => {
        console.warn("Lỗi realtime all bug reports, dùng local cache:", error.message);
        callback(getLocalReports(null));
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Không khởi tạo được realtime all bug reports:", err);
    callback(getLocalReports(null));
    return () => {};
  }
}

/**
 * Cập nhật trạng thái xử lý lỗi (Dành cho Người xây dựng web)
 */
export async function updateBugReportStatus(reportId, status, devNotes = "") {
  if (!reportId || !status) return;
  const now = new Date().toISOString();
  const updateData = {
    status,
    devNotes: devNotes.trim(),
    updatedAt: now,
  };

  try {
    const docRef = doc(db, "bugReports", reportId);
    await setDoc(docRef, updateData, { merge: true });
  } catch (err) {
    console.warn("Lỗi cập nhật bug report Firestore:", err);
  }

  // Update local cache
  const cached = getLocalReports(null);
  const found = cached.find((r) => r.id === reportId);
  if (found) {
    found.status = status;
    if (devNotes) found.devNotes = devNotes;
    found.updatedAt = now;
    saveLocalReports(null, cached);
  }
}
