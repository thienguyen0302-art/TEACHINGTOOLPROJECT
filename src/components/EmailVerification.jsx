import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { sendVerificationEmail } from "../services/authSecurityService";
import "./EmailVerification.css";

const COUNTDOWN_STORAGE_KEY = "peanut_email_resend_expiry";

export default function EmailVerification({ user, onVerified, onLogout }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'warning' | 'error', message: '' }
  
  // Khởi tạo thời gian đếm ngược từ localStorage nếu trước đó người dùng đã bấm gửi lại thư
  const [countdown, setCountdown] = useState(() => {
    try {
      const expiry = Number(localStorage.getItem(COUNTDOWN_STORAGE_KEY) || 0);
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  });

  const timerRef = useRef(null);

  // Quản lý đồng hồ đếm ngược
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      try { localStorage.removeItem(COUNTDOWN_STORAGE_KEY); } catch {}
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          try { localStorage.removeItem(COUNTDOWN_STORAGE_KEY); } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  // Xử lý nút: "Tôi đã xác minh"
  const handleCheckVerification = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setFeedback(null);

    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }

      if (auth.currentUser?.emailVerified) {
        setFeedback({
          type: "success",
          message: "Email đã được xác minh thành công! Đang chuyển tiếp...",
        });
        setTimeout(() => {
          if (onVerified) {
            onVerified();
          } else {
            window.location.reload();
          }
        }, 600);
      } else {
        setFeedback({
          type: "warning",
          message:
            "Email của bạn chưa được xác minh. Bấm vào link trong thư (xem cả mục Spam), rồi bấm nút bên dưới.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Không thể kiểm tra trạng thái xác minh lúc này. Vui lòng thử lại.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Xử lý nút: "Gửi lại thư"
  const handleResendEmail = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setFeedback(null);

    try {
      if (!auth.currentUser) {
        throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
      }

      await sendVerificationEmail(auth.currentUser);

      const seconds = 60;
      setCountdown(seconds);
      try {
        localStorage.setItem(COUNTDOWN_STORAGE_KEY, String(Date.now() + seconds * 1000));
      } catch {}

      setFeedback({
        type: "success",
        message: `Đã gửi lại thư xác minh từ PeanutCode tới ${user?.email || "email của bạn"}. Vui lòng kiểm tra hộp thư (kể cả mục Spam).`,
      });
    } catch (err) {
      if (err.code === "auth/too-many-requests") {
        setFeedback({
          type: "warning",
          message: "Hệ thống đã gửi thư gần đây. Vui lòng chờ ít phút trước khi thử gửi lại.",
        });
      } else {
        setFeedback({
          type: "error",
          message: err.message || "Không gửi lại được thư xác minh lúc này. Hãy kiểm tra kết nối mạng.",
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  // Xử lý nút: "Đăng xuất"
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      signOut(auth);
    }
  };

  const userEmail = user?.email || auth.currentUser?.email || "email của bạn";

  return (
    <div className="email-verify-page">
      <main className="email-verify-card" role="region" aria-labelledby="verify-heading">
        <header className="email-verify-header">
          <h1 id="verify-heading" className="email-verify-title">
            Hãy xác minh email
          </h1>
        </header>

        <p className="email-verify-desc">
          Chúng tôi đã gửi thư xác minh tới <span className="email-verify-email">{userEmail}</span>. Bấm vào link trong thư (xem cả mục Spam), rồi bấm nút bên dưới.
        </p>

        {feedback && (
          <div
            className={`email-verify-alert alert-${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            <span className="email-verify-alert-icon" aria-hidden="true">
              {feedback.type === "success" ? "✓" : feedback.type === "warning" ? "!" : "✕"}
            </span>
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="email-verify-actions">
          {/* Nút chính: Tôi đã xác minh */}
          <button
            type="button"
            className="email-verify-btn-primary"
            onClick={handleCheckVerification}
            disabled={isVerifying}
          >
            {isVerifying && <span className="email-verify-spinner" aria-hidden="true" />}
            <span>{isVerifying ? "Đang kiểm tra..." : "Tôi đã xác minh"}</span>
          </button>

          {/* Nút phụ: Gửi lại thư */}
          <button
            type="button"
            className="email-verify-btn-secondary"
            onClick={handleResendEmail}
            disabled={countdown > 0 || isResending}
          >
            {isResending && <span className="email-verify-spinner" aria-hidden="true" />}
            <span>
              {isResending
                ? "Đang gửi..."
                : countdown > 0
                ? `Gửi lại thư (${countdown}s)`
                : "Gửi lại thư"}
            </span>
          </button>

          {/* Nút đăng xuất: đặt ở hàng bên dưới */}
          <div className="email-verify-logout-row">
            <button
              type="button"
              className="email-verify-btn-logout"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
