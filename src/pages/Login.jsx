import { useState } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  sendEmailVerification, sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../services/firebase";

const ERR = {
  "auth/invalid-credential": "Sai email hoặc mật khẩu.",
  "auth/wrong-password": "Sai mật khẩu.",
  "auth/user-not-found": "Email này chưa đăng ký.",
  "auth/email-already-in-use": "Email này đã đăng ký. Hãy đăng nhập.",
  "auth/weak-password": "Mật khẩu cần ít nhất 6 ký tự.",
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/too-many-requests": "Thử quá nhiều lần. Hãy chờ vài phút hoặc đặt lại mật khẩu.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google.",
};
const RESET_ON = ["auth/invalid-credential", "auth/wrong-password", "auth/too-many-requests"];

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const fail = (e) => {
    setIsErr(true);
    setMsg(ERR[e.code] || "Có lỗi xảy ra: " + e.code);
    if (RESET_ON.includes(e.code)) setShowReset(true);
  };

  async function submit(ev) {
    ev.preventDefault();
    setBusy(true); setMsg(""); setShowReset(false);
    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await sendEmailVerification(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email, pw);
      }
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function google() {
    setMsg("");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { fail(e); }
  }

  async function reset() {
    if (!email) { setIsErr(true); setMsg("Hãy nhập email ở trên trước."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setIsErr(false);
      setMsg("Nếu email này đã đăng ký, bạn sẽ nhận được thư đặt lại mật khẩu. Kiểm tra cả mục Spam.");
    } catch (e) { fail(e); }
  }

  return (
    <div className="box">
      <h2>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h2>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Mật khẩu (từ 6 ký tự)" value={pw}
          onChange={(e) => setPw(e.target.value)} required />
        <button type="submit" disabled={busy}>
          {mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </button>
        <button type="button" onClick={google}>Đăng nhập bằng Google</button>
      </form>
      {msg && <p className={isErr ? "err" : "ok"}>{msg}</p>}
      {showReset && (
        <p>Quên hoặc nhập sai mật khẩu? <button type="button" onClick={reset}>Gửi thư đặt lại mật khẩu</button></p>
      )}
      <p>
        <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); setShowReset(false); }}>
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </p>
    </div>
  );
}