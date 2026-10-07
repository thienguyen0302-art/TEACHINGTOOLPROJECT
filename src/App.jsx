import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Login from "./pages/Login";
import ChooseLang from "./pages/ChooseLang";

export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLang(null);
      if (u && u.emailVerified) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setLang(snap.data().language ?? null);
      }
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="box">Đang tải...</div>;
  if (!user) return <Login />;

  if (!user.emailVerified) {
    return (
      <div className="box">
        <h2>Hãy xác minh email</h2>
        <p>Chúng tôi đã gửi thư xác minh tới <b>{user.email}</b>. Bấm vào link trong thư (xem cả mục Spam), rồi bấm nút bên dưới.</p>
        <button onClick={async () => { await auth.currentUser.reload(); window.location.reload(); }}>
          Tôi đã xác minh
        </button>
        <button onClick={async () => {
          try { await sendEmailVerification(auth.currentUser); setMsg("Đã gửi lại thư."); }
          catch { setMsg("Gửi quá nhiều lần, hãy chờ vài phút."); }
        }}>Gửi lại thư</button>
        <button onClick={() => signOut(auth)}>Đăng xuất</button>
        {msg && <p>{msg}</p>}
      </div>
    );
  }

  if (!lang) return <ChooseLang uid={user.uid} onPick={setLang} />;

  return (
    <div className="box">
      <h2>Xin chào {user.email}</h2>
      <p>Bạn đang học: <b>{lang === "cpp" ? "C++" : "Python"}</b></p>
      <button onClick={() => setLang(null)}>Đổi ngôn ngữ</button>
      <button onClick={() => signOut(auth)}>Đăng xuất</button>
    </div>
  );
}