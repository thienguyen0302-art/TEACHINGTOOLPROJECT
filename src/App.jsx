import Contests from "./pages/Contests";
import Contest from "./pages/Contest";
import ContestProblem from "./pages/ContestProblem";
import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";
import Login from "./pages/Login";
import ChooseLang from "./pages/ChooseLang";
import Overview from "./pages/Overview";
import Curriculum from "./pages/Curriculum";
import Dashboard from "./pages/Dashboard";
import Teacher from "./pages/Teacher";
import TeacherStudents from "./pages/TeacherStudents";
import SubmissionHistory from "./pages/SubmissionHistory";
import Feedback from "./pages/Feedback";
import Profile, { ProfileForm } from "./pages/Profile";
import Schedule from "./pages/Schedule";
import Ranking from "./pages/Ranking";
import AppShell from "./components/AppShell";
import EmailVerification from "./components/EmailVerification";
import useStudyTimer from "./hooks/useStudyTimer";
import useLearningData from "./hooks/useLearningData";
import { setSubmissionPersistenceAdapter } from "./services/submissionProgressService";
import { persistSubmission } from "./services/submissionPersistence";
import { saveProfile } from "./services/progressService";
import { isProfileComplete } from "./utils/profile";
import { weekSummary } from "./utils/activity";
import { isTeacherUser } from "./services/authSecurityService";
import { setStudentFirstLoginAt } from "./services/announcementService";

const TeacherProblems = lazy(() => import("./pages/TeacherProblems"));
const TeacherProblemEditor = lazy(() => import("./pages/TeacherProblems").then((module) => ({ default: module.TeacherProblemEditor })));
const TeacherContests = lazy(() => import("./pages/TeacherContests"));
const TeacherContestEditor = lazy(() => import("./pages/TeacherContests").then((module) => ({ default: module.TeacherContestEditor })));
const TeacherContestHistory = lazy(() => import("./pages/TeacherContestHistory"));
const TeacherReviews = lazy(() => import("./pages/TeacherReviews"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Practice = lazy(() => import("./pages/Practice"));
const Problem = lazy(() => import("./pages/Problem"));
const PracticeBank = lazy(() => import("./pages/PracticeBank"));

// Phần giao diện sau đăng nhập. Tách riêng để dùng hook dữ liệu (cần uid + lang).
function Learning({ user, lang, onChangeLang }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inContest = pathname.startsWith("/contest") || pathname.startsWith("/teacher");
  const data = useLearningData(user.uid, lang, !inContest);
  const isTeacher = isTeacherUser(user, data.profile);
  const week = weekSummary(data.daily);
  const teacherOnly = (element) => data.loading ? <div className="content">Đang tải...</div> : isTeacher ? element : <Navigate to="/" replace />;
  // Tên hiển thị ưu tiên hồ sơ học viên đã nhập, sau đó mới tới tên tài khoản.
  const viewUser = { displayName: data.profile.displayName || user.displayName, email: user.email, uid: user.uid };

  // Chuyển hướng sau đăng nhập nếu người dùng đã bấm "Chia sẻ trải nghiệm của bạn"
  useEffect(() => {
    const redirect = window.sessionStorage.getItem("peanut_redirect_after_login");
    if (redirect) {
      window.sessionStorage.removeItem("peanut_redirect_after_login");
      navigate(redirect);
    }
  }, [navigate]);

  // Nối bài nộp code (Judge) với Firestore; gỡ adapter khi đăng xuất.
  useEffect(() => {
    setSubmissionPersistenceAdapter(persistSubmission);
    return () => setSubmissionPersistenceAdapter(null);
  }, []);

  return (
    <AppShell key={user.uid} user={viewUser} isTeacher={isTeacher} weekActive={week.activeCount} onLogout={() => signOut(auth)}>
      {data.error && (
        <div className="content"><p className="err">{data.error}</p></div>
      )}
      <Suspense fallback={<div className="content">Đang tải trang…</div>}><Routes>
        <Route
          path="/"
          element={isTeacher
            ? <Navigate to="/teacher" replace />
            : <Overview user={viewUser} lang={lang} data={data} onChangeLang={onChangeLang} />}
        />
        <Route path="/curriculum" element={isTeacher ? <Navigate to="/teacher" replace /> : <Curriculum lang={lang} data={data} onChangeLang={onChangeLang} />} />
        <Route path="/lesson/:id" element={isTeacher ? <Navigate to="/teacher" replace /> : <Lesson lang={lang} />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice-bank" element={<PracticeBank />} />
        <Route path="/practice/problem/:problemId" element={<Problem lang={lang} />} />
        <Route path="/problem/:slug" element={<Problem lang={lang} />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/contest/:contestId" element={<Contest user={user} />} />
        <Route path="/contest/:contestId/problem/:problemId" element={<ContestProblem lang={lang} />} />
        <Route path="/contest/:contestId/scoreboard" element={<Contest user={user} view="scoreboard" />} />
        <Route path="/contest/:contestId/submissions" element={<Contest user={user} view="submissions" />} />
        <Route path="/teacher/problems" element={teacherOnly(<TeacherProblems />)} />
        <Route path="/teacher/problems/new" element={teacherOnly(<TeacherProblemEditor />)} />
        <Route path="/teacher/problems/:problemId/edit" element={teacherOnly(<TeacherProblemEditor />)} />
        <Route path="/teacher/contests" element={teacherOnly(<TeacherContests />)} />
        <Route path="/teacher/contests/new" element={teacherOnly(<TeacherContestEditor />)} />
        <Route path="/teacher/contests/:contestId/edit" element={teacherOnly(<TeacherContestEditor />)} />
        <Route path="/teacher/contests/:contestId/monitor" element={teacherOnly(<Contest user={user} teacher />)} />

        <Route path="/exam/*" element={<Navigate to="/contests" replace />} />
        <Route path="/exam-history" element={<Navigate to="/submissions" replace />} />
        <Route path="/submissions" element={isTeacher ? <Navigate to="/teacher" replace /> : <SubmissionHistory />} />
        <Route
          path="/progress"
          element={isTeacher ? <Navigate to="/teacher" replace /> : <Dashboard user={viewUser} lang={lang} data={data} />}
        />
        <Route path="/ranking" element={<Ranking key={lang} uid={user.uid} lang={lang} isTeacher={isTeacher} />} />
        <Route
          path="/calendar"
          element={isTeacher ? <Navigate to="/teacher" replace /> : <Schedule user={viewUser} data={data} />}
        />
        <Route path="/profile" element={<Profile user={viewUser} uid={user.uid} lang={lang} data={data} />} />
        <Route path="/feedback" element={<Feedback user={viewUser} uid={user.uid} data={data} />} />
        <Route
          path="/teacher"
          element={data.loading
            ? <div className="content">Đang tải...</div>
            : isTeacher ? <Teacher /> : <Navigate to="/" replace />}
        />
        <Route
          path="/teacher/students"
          element={data.loading
            ? <div className="content">Đang tải...</div>
            : isTeacher ? <TeacherStudents /> : <Navigate to="/" replace />}
        />
        <Route
          path="/teacher/contest-history"
          element={data.loading
            ? <div className="content">Đang tải...</div>
            : isTeacher ? <TeacherContestHistory /> : <Navigate to="/" replace />}
        />
        <Route
          path="/teacher/reviews"
          element={data.loading
            ? <div className="content">Đang tải...</div>
            : isTeacher ? <TeacherReviews /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to={isTeacher ? "/teacher" : "/"} replace />} />
      </Routes></Suspense>
    </AppShell>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lang, setLang] = useState(null);
  const [picking, setPicking] = useState(false); // đang mở hộp chọn ngôn ngữ để đổi
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLang(null);
      setProfile(null);
      setPicking(false);
      try {
        if (u && u.emailVerified) {
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          const userData = snap.exists() ? snap.data() : {};
          setProfile(userData);
          if (snap.exists() && userData.language) setLang(userData.language);
          // Ghi nhận chính xác ngày đăng nhập / tạo tài khoản lần đầu của học viên
          const creationIso = u.metadata?.creationTime
            ? new Date(u.metadata.creationTime).toISOString()
            : new Date().toISOString();
          const firstLoginAt = userData.firstLoginAt || userData.createdAt || creationIso;
          setStudentFirstLoginAt(u.uid, firstLoginAt);

          // Lưu tên/email để Teacher Dashboard hiển thị được học sinh.
          // Không ghi đè displayName nếu học sinh đã tự nhập tên trong hồ sơ.
          const patch = {};
          if (!userData.firstLoginAt) patch.firstLoginAt = firstLoginAt;
          if (!userData.createdAt) patch.createdAt = firstLoginAt;
          if (userData.email !== u.email) patch.email = u.email;
          if (!userData.displayName && u.displayName) patch.displayName = u.displayName;
          if (Object.keys(patch).length) {
            setDoc(ref, patch, { merge: true }).catch(() => {});
            setProfile((prev) => ({ ...(prev || {}), ...patch }));
          }
        }
      } catch (e) {
        console.error("Không đọc được hồ sơ người dùng:", e);
      }
      setReady(true);
    });
  }, []);

  const isTeacher = isTeacherUser(user, profile);
  const activeLang = lang || (isTeacher ? "cpp" : null);

  useStudyTimer(user && user.emailVerified && !isTeacher && activeLang ? user.uid : null);

  if (!ready) return <div className="box">Đang tải...</div>;
  if (!user) return <Login />;

  if (!user.emailVerified) {
    return (
      <EmailVerification
        user={user}
        onVerified={() => window.location.reload()}
        onLogout={() => signOut(auth)}
      />
    );
  }

  // Bước 1: Bắt buộc hoàn tất thông tin cá nhân (họ tên, tỉnh, trường, lớp) nếu chưa đủ (chỉ áp dụng cho học sinh)
  if (!isProfileComplete(profile, isTeacher)) {
    return (
      <main className="dashboard-shell">
        <ProfileForm
          initial={profile || { displayName: user.displayName || "" }}
          isMandatory={true}
          isTeacher={isTeacher}
          onLogout={() => signOut(auth)}
          onSave={async (formData) => {
            const saved = await saveProfile(user.uid, formData, isTeacher);
            setProfile((prev) => ({ ...(prev || {}), ...saved }));
          }}
        />
      </main>
    );
  }

  // Bước 2: Sau khi có đầy đủ hồ sơ, bắt buộc chọn ngôn ngữ lập trình nếu chưa chọn (chỉ áp dụng cho học sinh)
  if (!isTeacher && (!lang || picking)) {
    return (
      <ChooseLang
        uid={user.uid}
        current={lang}
        onPick={(l) => { setLang(l); setPicking(false); }}
        onClose={lang ? () => setPicking(false) : undefined}
      />
    );
  }

  // Bước 3: Đã đủ thông tin hồ sơ và ngôn ngữ -> Vào trang học tập
  return <Learning user={user} lang={activeLang} onChangeLang={() => setPicking(true)} />;
}
