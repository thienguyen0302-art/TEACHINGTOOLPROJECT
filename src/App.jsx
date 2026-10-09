import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import Login from "./pages/Login";
import ChooseLang from "./pages/ChooseLang";
import Overview from "./pages/Overview";
import Curriculum from "./pages/Curriculum";
import Lesson from "./pages/Lesson";
import Dashboard from "./pages/Dashboard";
import AppShell from "./components/AppShell";
import useStudyTimer from "./hooks/useStudyTimer";
import useLearningData from "./hooks/useLearningData";

// Phần giao diện sau đăng nhập. Tách riêng để dùng hook dữ liệu (cần uid + lang).
function Learning({ user, lang, onChangeLang }) {
  const data = useLearningData(user.uid, lang);

  return (
    <AppShell user={user} onLogout={() => signOut(auth)}>
      {data.error && (
        <div className="content"><p className="err">{data.error}</p></div>
      )}
      <Routes>
        <Route path="/" element={<Overview user={user} lang={lang} data={data} onChangeLang={onChangeLang} />} />
        <Route path="/curriculum" element={<Curriculum lang={lang} data={data} onChangeLang={onChangeLang} />} />
        <Route path="/lesson/:id" element={<Lesson lang={lang} />} />
        <Route path="/progress" element={<Dashboard user={user} lang={lang} data={data} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState(null);
  const [picking, setPicking] = useState(false); // đang mở hộp chọn ngôn ngữ để đổi
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLang(null);
      setPicking(false);
      try {
        if (u && u.emailVerified) {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) setLang(snap.data().language ?? null);
        }
      } catch (e) {
        console.error("Không đọc được hồ sơ người dùng:", e);
      }
      setReady(true);
    });
  }, []);

  useStudyTimer(user && user.emailVerified && lang ? user.uid : null);

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

  if (!lang || picking) {
    return (
      <ChooseLang
        uid={user.uid}
        current={lang}
        onPick={(l) => { setLang(l); setPicking(false); }}
        onClose={lang ? () => setPicking(false) : undefined}
      />
    );
  }

  return <Learning user={user} lang={lang} onChangeLang={() => setPicking(true)} />;
}
