import { useEffect, useState } from "react";
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../services/firebase";
import Logo from "../components/Logo";
import "../components/EmailVerification.css";
import "./AuthAction.css";

const ERRORS = {
  "auth/expired-action-code": "Liên kết đã hết hạn. Hãy yêu cầu gửi lại thư mới.",
  "auth/invalid-action-code": "Liên kết không hợp lệ hoặc đã được sử dụng. Hãy yêu cầu gửi lại thư mới.",
  "auth/user-disabled": "Tài khoản này đã bị vô hiệu hoá.",
  "auth/user-not-found": "Không tìm thấy tài khoản tương ứng.",
  "auth/weak-password": "Mật khẩu cần ít nhất 6 ký tự.",
};

function goLogin() {
  window.location.assign("/");
}

function Shell({ title, children }) {
  return (
    <div className="email-verify-page">
      <main className="email-verify-card" role="region" aria-label={title}>
        <div className="auth-action-logo"><Logo /></div>
        {children}
      </main>
    </div>
  );
}

function Result({ ok, title, text }) {
  return (
    <Shell title={title}>
      <div className={`auth-action-badge ${ok ? "is-ok" : "is-err"}`} aria-hidden="true">{ok ? "✓" : "!"}</div>
      <h1 className="email-verify-title auth-action-center">{title}</h1>
      <p className="email-verify-desc auth-action-center">{text}</p>
      <button type="button" className="email-verify-btn-primary" onClick={goLogin}>Quay lại trang đăng nhập</button>
    </Shell>
  );
}

export default function AuthAction() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const [state, setState] = useState(code && (mode === "verifyEmail" || mode === "resetPassword") ? "loading" : "invalid");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state !== "loading") return;
    let alive = true;
    (async () => {
      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, code);
          if (alive) setState("verified");
        } else {
          const mail = await verifyPasswordResetCode(auth, code);
          if (alive) { setEmail(mail); setState("form"); }
        }
      } catch (e) {
        if (alive) { setError(ERRORS[e.code] || "Không xử lý được liên kết này. Hãy thử lại."); setState("failed"); }
      }
    })();
    return () => { alive = false; };
  }, [state, mode, code]);

  async function submit(ev) {
    ev.preventDefault();
    if (pw.length < 6) { setError(ERRORS["auth/weak-password"]); return; }
    if (pw !== pw2) { setError("Hai mật khẩu chưa giống nhau."); return; }
    setBusy(true); setError("");
    try {
      await confirmPasswordReset(auth, code, pw);
      setState("reset-done");
    } catch (e) {
      setError(ERRORS[e.code] || "Không đổi được mật khẩu. Hãy thử lại.");
    }
    setBusy(false);
  }

  if (state === "loading") {
    return <Shell title="Đang xử lý"><p className="email-verify-desc auth-action-center">Đang xử lý, vui lòng chờ…</p></Shell>;
  }
  if (state === "verified") {
    return <Result ok title="Xác minh email thành công" text="Tài khoản của bạn đã sẵn sàng. Hãy quay lại trang đăng nhập để sử dụng PeanutCode." />;
  }
  if (state === "reset-done") {
    return <Result ok title="Đã đổi mật khẩu" text="Mật khẩu mới đã được lưu. Hãy đăng nhập bằng mật khẩu mới." />;
  }
  if (state === "invalid" || state === "failed") {
    return <Result ok={false} title="Liên kết không dùng được" text={error || "Liên kết không hợp lệ. Hãy quay lại trang đăng nhập và yêu cầu gửi lại thư."} />;
  }
  return (
    <Shell title="Đặt lại mật khẩu">
      <h1 className="email-verify-title">Đặt lại mật khẩu</h1>
      <p className="email-verify-desc">Nhập mật khẩu mới cho tài khoản <span className="email-verify-email">{email}</span>.</p>
      <form onSubmit={submit} className="email-verify-actions">
        <label className="auth-action-label" htmlFor="aa-pw">Mật khẩu mới</label>
        <input id="aa-pw" className="auth-action-input" type="password" autoComplete="new-password" placeholder="Từ 6 ký tự" value={pw} onChange={(e) => setPw(e.target.value)} />
        <label className="auth-action-label" htmlFor="aa-pw2">Nhập lại mật khẩu</label>
        <input id="aa-pw2" className="auth-action-input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {error && <div className="email-verify-alert alert-error" role="alert"><span className="email-verify-alert-icon" aria-hidden="true">✕</span><span>{error}</span></div>}
        <button type="submit" className="email-verify-btn-primary" disabled={busy}>{busy ? "Đang lưu…" : "Đổi mật khẩu"}</button>
        <button type="button" className="email-verify-btn-secondary" onClick={goLogin}>Huỷ</button>
      </form>
    </Shell>
  );
}
