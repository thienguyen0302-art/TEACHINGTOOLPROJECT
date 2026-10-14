import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import Login from "./pages/Login";
import ChooseLang from "./pages/ChooseLang";
import Overview from "./pages/Overview";
import Curriculum from "./pages/Curriculum";
import Lesson from "./pages/Lesson";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Problem from "./pages/Problem";
import Teacher from "./pages/Teacher";
import Profile from "./pages/Profile";
import Schedule from "./pages/Schedule";
import Ranking from "./pages/Ranking";
import Exam from "./pages/Exam";
import { saveExamResult } from "./services/examService";
import AppShell from "./components/AppShell";
import useStudyTimer from "./hooks/useStudyTimer";
import useLearningData from "./hooks/useLearningData";
import { setSubmissionPersistenceAdapter } from "./services/submissionProgressService";
import { persistSubmission } from "./services/submissionPersistence";
import { weekSummary } from "./utils/activity";

// Phần giao diện sau đăng nhập. Tách riêng để dùng hook dữ liệu (cần uid + lang).
function Learning({ user, lang, onChangeLang }) {
  const data = useLearningData(user.uid, lang);
  const isTeacher = data.profile.role === "teacher";
  const week = weekSummary(data.daily);
  // Tên hiển thị ưu tiên hồ sơ học viên đã nhập, sau đó mới tới tên tài khoản.
  const viewUser = { displayName: data.profile.displayName || user.displayName, email: user.email };

  // Chỉ khi chạy dev: cho phép thử bảng xếp hạng bằng Console trình duyệt khi Exam chưa xong.
  // Ví dụ: await peanutDev.saveExamResult({ examId: "HSG-QN-24", language: "cpp", correct: 18, total: 20, durationSec: 3000 })
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.peanutDev = { saveExamResult: (result) => saveExamResult(user.uid, result) };
    return () => { delete window.peanutDev; };
  }, [user.uid]);

  // Nối bài nộp code (Judge) với Firestore; gỡ adapter khi đăng xuất.
  useEffect(() => {
    setSubmissionPersistenceAdapter(persistSubmission);
    return () => setSubmissionPersistenceAdapter(null);
  }, []);

  return (
    <AppShell user={viewUser} isTeacher={isTeacher} weekActive={week.activeCount} onLogout={() => signOut(auth)}>
      {data.error && (
        <div className="content"><p className="err">{data.error}</p></div>
      )}
      <Routes>
        <Route
          path="/"
          element={isTeacher
            ? <Navigate to="/teacher" replace />
            : <Overview user={viewUser} lang={lang} data={data} onChangeLang={onChangeLang} />}
        />
        <Route path="/curriculum" element={<Curriculum lang={lang} data={data} onChangeLang={onChangeLang} />} />
        <Route path="/lesson/:id" element={<Lesson lang={lang} />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/problem/:slug" element={<Problem lang={lang} />} />
        <Route path="/exam" element={<Exam lang={lang} />} />
        <Route path="/exam/:examId" element={<Exam lang={lang} />} />
        <Route
          path="/progress"
          element={isTeacher ? <Navigate to="/teacher" replace /> : <Dashboard user={viewUser} lang={lang} data={data} />}
        />
        <Route path="/ranking" element={<Ranking key={lang} uid={user.uid} lang={lang} />} />
        <Route
          path="/calendar"
          element={isTeacher ? <Navigate to="/teacher" replace /> : <Schedule user={viewUser} data={data} />}
        />
        <Route path="/profile" element={<Profile user={viewUser} uid={user.uid} lang={lang} data={data} />} />
        <Route
          path="/teacher"
          element={data.loading
            ? <div className="content">Đang tải...</div>
            : isTeacher ? <Teacher /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to={isTeacher ? "/teacher" : "/"} replace />} />
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
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) setLang(snap.data().language ?? null);
          // Lưu tên/email để Teacher Dashboard hiển thị được học sinh.
          const profile = snap.exists() ? snap.data() : {};
          // Không ghi đè displayName nếu học sinh đã tự nhập tên trong hồ sơ.
          const patch = {};
          if (profile.email !== u.email) patch.email = u.email;
          if (!profile.displayName && u.displayName) patch.displayName = u.displayName;
          if (Object.keys(patch).length) setDoc(ref, patch, { merge: true }).catch(() => {});
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
