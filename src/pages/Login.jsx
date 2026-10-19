import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  sendEmailVerification, sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../services/firebase";
import Logo from "../components/Logo";
import { subscribePublicReviews } from "../services/reviewService";
import { verifyTeacherCode, claimTeacherRole } from "../services/authSecurityService";

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

const benefits = [
  "Ôn học sinh giỏi từ cơ bản đến nâng cao",
  "Nắm vững cấu trúc dữ liệu và thuật toán",
  "Tham gia các kỳ thi lập trình Contest HSG",
];

const platformHighlights = [
  {
    number: "01",
    label: "Lĩnh vực ứng dụng",
    title: "Bồi dưỡng đội tuyển mũi nhọn",
    description:
      "Hỗ trợ hoạt động giảng dạy, luyện tập, kiểm tra và đánh giá đội tuyển học sinh giỏi Tin học.",
    details: ["Lộ trình theo từng chuyên đề", "Theo dõi tiến độ theo thời gian"],
    result: "Dành cho giáo viên & học sinh",
  },
  {
    number: "02",
    label: "Vấn đề thực tiễn",
    title: "Hiểu đúng nguyên nhân bài làm sai",
    description:
      "Giúp học sinh nhận ra nguyên nhân gây Wrong Answer, Time Limit Exceeded và những lỗi tư duy khó phát hiện.",
    details: ["Phân tích WA, TLE, Runtime Error", "Chỉ ra trường hợp biên còn thiếu"],
    result: "Biến lỗi sai thành bài học",
  },
  {
    number: "03",
    label: "Giải pháp AI",
    title: "Phân tích thay vì cho sẵn đáp án",
    description:
      "Trợ lý AI đánh giá thuật toán, độ phức tạp Big-O, gợi ý edge cases còn thiếu và định hướng cách tối ưu tốt hơn.",
    details: ["Đánh giá thời gian và bộ nhớ", "Gợi mở hướng tối ưu phù hợp"],
    result: "Học cách tư duy độc lập",
  },
  {
    number: "04",
    label: "Tính năng đột phá",
    title: "Cá nhân hóa quá trình ôn luyện",
    description:
      "Tự động sinh bộ test biên độc lập và trực quan hóa sự phát triển năng lực tư duy thuật toán của từng học sinh.",
    details: ["Sinh testcase theo từng đề bài", "Biểu đồ năng lực cá nhân"],
    result: "Đo lường tiến bộ rõ ràng",
  },
];


function EyeIcon({ crossed = false }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      {crossed && (
        <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeedbackPublicCard({ feedback }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = feedback.content && feedback.content.length > 150;
  const initial = (feedback.displayName || "H")[0].toUpperCase();
  const dateStr = feedback.createdAt
    ? new Date(feedback.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  return (
    <article className="feedback-card">
      <div className="feedback-card-top">
        <div className="student-avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="student-info">
          <h3>
            {feedback.displayName || "Học viên ẩn danh"}
            {feedback.isVerifiedLearner && (
              <span className="verified-badge">Đã xác thực</span>
            )}
          </h3>
          <p>Học viên PeanutCode</p>
        </div>
        {dateStr && <time>{dateStr}</time>}
      </div>
      <div
        className="feedback-stars"
        aria-label={`Đánh giá ${feedback.rating} trên 5 sao`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span className={star <= feedback.rating ? "filled" : ""} key={star} />
        ))}
      </div>
      <blockquote className="feedback-card-quote">
        “{isLong && !expanded ? `${feedback.content.slice(0, 140)}…` : feedback.content}”
      </blockquote>
      {isLong && (
        <button
          type="button"
          className="feedback-btn-more"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </article>
  );
}

export default function Login() {
  const [targetRole, setTargetRole] = useState("student"); // "student" | "teacher"
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [showTeacherClaim, setShowTeacherClaim] = useState(false);
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    const unsub = subscribePublicReviews((items) => {
      setFeedbacks(items);
    });
    return () => unsub?.();
  }, []);

  function handleGoToShare() {
    window.sessionStorage.setItem("peanut_redirect_after_login", "/feedback");
    const emailInput = document.getElementById("email") || document.querySelector("input[type=email]");
    if (emailInput) {
      emailInput.scrollIntoView({ behavior: "smooth", block: "center" });
      emailInput.focus();
    }
  }

  const fail = (e) => {
    setIsErr(true);
    setMsg(e.customMessage || ERR[e.code] || "Có lỗi xảy ra: " + (e.message || e.code));
    if (RESET_ON.includes(e.code)) setShowReset(true);
  };

  async function submit(ev) {
    ev.preventDefault();
    setBusy(true); setMsg(""); setShowReset(false); setIsErr(false);

    if (targetRole === "teacher" && mode === "register") {
      if (!teacherCode.trim()) {
        fail({ customMessage: "Vui lòng nhập Mã bảo mật Giáo viên để kích hoạt quyền Giáo viên." });
        setBusy(false);
        return;
      }
      if (!verifyTeacherCode(teacherCode)) {
        fail({ customMessage: "Mã bảo mật Giáo viên không hợp lệ. Vui lòng kiểm tra lại hoặc liên hệ Quản trị viên." });
        setBusy(false);
        return;
      }
    }

    try {
      if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        if (targetRole === "teacher" && teacherCode.trim()) {
          await claimTeacherRole(cred.user, teacherCode);
        }
        await sendEmailVerification(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, pw);
        if (targetRole === "teacher" && teacherCode.trim()) {
          await claimTeacherRole(cred.user, teacherCode);
        }
      }
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function google() {
    setMsg(""); setIsErr(false);
    if (targetRole === "teacher" && mode === "register" && !verifyTeacherCode(teacherCode)) {
      fail({ customMessage: "Vui lòng nhập Mã bảo mật Giáo viên trước khi đăng ký bằng Google." });
      return;
    }
    try {
      const res = await signInWithPopup(auth, new GoogleAuthProvider());
      if (targetRole === "teacher" && teacherCode.trim()) {
        await claimTeacherRole(res.user, teacherCode);
      }
    }
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
    <main className="app-shell">
      <nav className="navbar" aria-label="Điều hướng chính">
        <a className="brand" href="#" aria-label="Peanut Code - Trang chủ">
          <span className="brand-avatar">
            <Logo />
          </span>
          <span className="brand-name">
            Peanut<span>Code</span>
          </span>
        </a>

        <div className="nav-links">
          <a className="active" href="#home">
            Trang chủ
          </a>
          <a href="#path">Lộ trình</a>
          <a href="#community">Chia sẻ</a>
        </div>

        <a className="nav-cta" href="#login">
          Bắt đầu ôn luyện
          <ArrowIcon />
        </a>
      </nav>

      <section className="hero" id="home">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Nền tảng ôn thi học sinh giỏi Tin học
          </div>

          <h1>
            Code từng ngày,
            <br />
            <span>giỏi từng bước.</span>
          </h1>

          <p className="hero-description">
            Xây chắc kiến thức nền tảng, rèn tư duy thuật toán và chinh phục các bài toán từ cấp
            trường đến cấp quốc gia theo một lộ trình rõ ràng.
          </p>

          <div className="benefit-list">
            {benefits.map((benefit, index) => (
              <div className="benefit" key={benefit}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{benefit}</p>
              </div>
            ))}
          </div>

          <div className="learner-note">
            <div className="learner-avatars" aria-hidden="true">
              <span>H</span>
              <span>M</span>
              <span>T</span>
            </div>
            <p>
              <strong>2.000+ học sinh</strong>
              <br />
              đang cùng ôn luyện mỗi ngày
            </p>
          </div>
        </div>

        <div className="login-stage" id="login">
          <div className="code-card code-card-top" aria-hidden="true">
            <span />
            <span />
            <span />
            <p>&lt;keep coding /&gt;</p>
          </div>

          <div className="login-card">
            {/* Tabs chọn đối tượng: Học sinh vs Giáo viên */}
            <div className="login-role-tabs" role="tablist">
              <button
                type="button"
                className={`login-role-tab ${targetRole === "student" ? "active" : ""}`}
                onClick={() => { setTargetRole("student"); setMsg(""); setIsErr(false); }}
                role="tab"
                aria-selected={targetRole === "student"}
              >
                🎓 Học sinh HSG
              </button>
              <button
                type="button"
                className={`login-role-tab ${targetRole === "teacher" ? "active" : ""}`}
                onClick={() => { setTargetRole("teacher"); setMsg(""); setIsErr(false); }}
                role="tab"
                aria-selected={targetRole === "teacher"}
              >
                👨‍🏫 Giáo viên / Admin
              </button>
            </div>

            <div className="card-heading">
              <div>
                <p>
                  {targetRole === "teacher"
                    ? "Cổng Giáo viên & Ban giám khảo"
                    : "Bắt đầu hành trình của bạn"}
                </p>
                <h2>
                  {targetRole === "teacher"
                    ? mode === "login"
                      ? "Đăng nhập Giáo viên"
                      : "Đăng ký tài khoản Giáo viên"
                    : mode === "login"
                    ? "Đăng nhập để ôn luyện"
                    : "Tạo tài khoản miễn phí"}
                </h2>
              </div>
              <div className="peanut-stamp">
                <Logo />
              </div>
            </div>

            {targetRole === "teacher" && (
              <div className="login-teacher-notice">
                <span>Cổng thông tin dành cho Giáo viên</span>
                <small>Tài khoản giáo viên được cấp quyền quản trị bài tập, contest, test ẩn và theo dõi học sinh.</small>
              </div>
            )}

            <form onSubmit={submit}>
              <label htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email" placeholder="ban@example.com"
                autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required
              />

              {targetRole === "teacher" && mode === "register" && (
                <div style={{ marginTop: 14 }}>
                  <label htmlFor="teacherCode">
                    Mã bảo mật Giáo viên <em>*</em>
                  </label>
                  <input
                    id="teacherCode"
                    name="teacherCode"
                    type="text"
                    placeholder="Nhập mã bảo mật (VD: GV-HSG-2025)"
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <span className="field-hint">
                    Mã cấp quyền do Nhà trường hoặc Ban quản trị PeanutCode cung cấp để xác thực quyền quản trị.
                  </span>
                </div>
              )}

              <div className="password-label">
                <label htmlFor="password">Mật khẩu</label>
                {mode === "login" && (
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); reset(); }}>Quên mật khẩu?</a>
                )}
              </div>
              <div className="password-field">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"}
                  placeholder="Từ 6 ký tự" value={pw}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  onChange={(e) => setPw(e.target.value)} required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <EyeIcon crossed={showPassword} />
                </button>
              </div>

              {targetRole === "teacher" && mode === "login" && (
                <div className="teacher-claim-toggle">
                  <button
                    type="button"
                    className="btn-text-claim"
                    onClick={() => setShowTeacherClaim(!showTeacherClaim)}
                  >
                    {showTeacherClaim ? "Ẩn mã bảo mật" : "Lần đầu đăng nhập bằng tài khoản này? Nhập mã kích hoạt Giáo viên"}
                  </button>
                  {showTeacherClaim && (
                    <div>
                      <input
                        type="text"
                        placeholder="Nhập mã bảo mật (VD: GV-HSG-2025)"
                        value={teacherCode}
                        onChange={(e) => setTeacherCode(e.target.value)}
                        className="teacher-claim-input"
                      />
                      <span className="field-hint">
                        Nhập mã để nâng cấp tài khoản của thầy cô lên quyền Giáo viên ngay khi đăng nhập.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button className="submit-button" type="submit" disabled={busy}>
                {targetRole === "teacher"
                  ? mode === "login" ? "Đăng nhập Giáo viên" : "Đăng ký Giáo viên"
                  : mode === "login" ? "Đăng nhập Học sinh" : "Tạo tài khoản Học sinh"}
                <ArrowIcon />
              </button>
              {msg && (
                <p className={isErr ? "form-error" : "success-message"} role="status">
                  {msg}
                </p>
              )}
              {showReset && (
                <p className="form-error">
                  Quên hoặc nhập sai mật khẩu?{" "}
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); reset(); }}>
                    Gửi thư đặt lại mật khẩu
                  </a>
                </p>
              )}
            </form>

            <div className="divider">
              <span />
              <p>hoặc tiếp tục với</p>
              <span />
            </div>

            <div className="social-row single">
              <button type="button" onClick={google} aria-label="Đăng nhập bằng Google">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.9A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.5 13.7a6 6 0 0 1 0-3.4V7.4H3.1a10 10 0 0 0 0 9.2l3.4-2.9Z" />
                  <path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.9A5.9 5.9 0 0 1 12 6.2Z" />
                </svg>
                Google
              </button>
            </div>

            <p className="signup-copy">
              {mode === "login"
                ? (targetRole === "teacher" ? "Chưa có tài khoản Giáo viên? " : "Chưa có tài khoản? ")
                : (targetRole === "teacher" ? "Đã có tài khoản Giáo viên? " : "Đã có tài khoản? ")}
              <a href="#login" onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); setMsg(""); setShowReset(false); }}>
                {mode === "login"
                  ? (targetRole === "teacher" ? "Đăng ký quyền Giáo viên" : "Tạo tài khoản miễn phí")
                  : "Đăng nhập"}
              </a>
            </p>
          </div>

          <div className="code-card code-card-bottom" aria-hidden="true">
            <p>const level = "better";</p>
          </div>
        </div>
      </section>

      <section className="platform-section" id="path">
        <div className="platform-intro">
          <div>
            <div className="section-kicker">
              <span />
              Không chỉ là một hệ thống chấm bài
            </div>
            <h2>
              Trợ lý AI đồng hành cùng
              <br />
              mỗi bài làm của học sinh.
            </h2>
          </div>
          <p>
            PeanutCode kết nối quá trình giảng dạy của giáo viên với dữ liệu luyện tập thực tế,
            giúp mỗi lỗi sai trở thành một cơ hội hiểu sâu hơn về thuật toán.
          </p>
        </div>

        <div className="highlight-grid">
          {platformHighlights.map((item) => (
            <article className="highlight-card" key={item.number}>
              <div className="highlight-meta">
                <span>{item.number}</span>
                <p>{item.label}</p>
              </div>
              <h3>{item.title}</h3>
              <p className="highlight-description">{item.description}</p>
              <ul className="highlight-details">
                {item.details.map((detail) => (
                  <li key={detail}>
                    <span aria-hidden="true" />
                    {detail}
                  </li>
                ))}
              </ul>
              <p className="highlight-result">{item.result}</p>
              <div className="highlight-line" />
            </article>
          ))}
        </div>

        <div className="ai-feature">
          <div className="ai-orbit" aria-hidden="true">
            <span className="ai-core">AI</span>
            <span className="orbit-dot orbit-dot-one" />
            <span className="orbit-dot orbit-dot-two" />
          </div>
          <div className="ai-copy">
            <p className="ai-label">Phản hồi thông minh theo từng bài nộp</p>
            <h3>Không đưa code đúng. Gợi mở cách tư duy đúng.</h3>
          </div>
          <div className="ai-tags" aria-label="Các nội dung AI phân tích">
            <span>Big-O</span>
            <span>Edge cases</span>
            <span>Test biên</span>
            <span>Tối ưu thuật toán</span>
          </div>
        </div>
      </section>

      <section className="feedback-section" id="community">
        <div className="feedback-heading">
          <div>
            <div className="section-kicker">
              <span />
              Góc chia sẻ học viên
            </div>
            <h2>Trải nghiệm thật từ hành trình ôn luyện.</h2>
          </div>
          <p>
            Những chia sẻ dưới đây chỉ đến từ học viên đã đăng nhập, tham gia ôn luyện và gửi phản
            hồi trong tài khoản cá nhân.
          </p>
        </div>

        <div className="feedback-feed" aria-live="polite">
            <div className="feedback-feed-header">
              <div>
                <span className="live-dot" />
                Phản hồi học viên đã xác thực
              </div>
              <p>{feedbacks.length} chia sẻ</p>
            </div>

            {feedbacks.length > 0 ? (
              <div className="feedback-list">
                {feedbacks.map((item) => (
                  <FeedbackPublicCard key={item.id} feedback={item} />
                ))}
              </div>
            ) : (
              <div className="feedback-empty">
                <div className="empty-mark">PC</div>
                <h3>Chưa có phản hồi nào được công khai</h3>
                <p>
                  Học viên có thể gửi đánh giá sau khi đăng nhập và tham gia ôn luyện. Phản hồi hợp
                  lệ và được kiểm duyệt sẽ xuất hiện tại đây.
                </p>
                <button
                  type="button"
                  className="feedback-btn-share"
                  onClick={handleGoToShare}
                >
                  Chia sẻ trải nghiệm của bạn
                </button>
              </div>
            )}
          </div>
      </section>

      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <a className="brand" href="#" aria-label="Peanut Code - Trang chủ">
              <span className="brand-avatar">
                <Logo />
              </span>
              <span className="brand-name">
                Peanut<span>Code</span>
              </span>
            </a>
            <p>
              Nền tảng hỗ trợ ôn luyện học sinh giỏi Tin học từ kiến thức nền tảng đến thuật toán
              nâng cao.
            </p>
          </div>

          <div className="creator-info">
            <p className="footer-label">Người xây dựng</p>
            <h2>Lý Thị Thanh Thúy</h2>
            <p>
              Tổ trưởng tổ Tin học
              <br />
              Trường TH và THCS Cái Dầu
              <br />
              Xã Châu Phú, Tỉnh An Giang
            </p>
          </div>

          <div className="footer-contact">
            <p className="footer-label">Kết nối và liên hệ</p>
            <a href="tel:0364224470">
              <span>Điện thoại</span>
              0364 224 470
            </a>
            <a href="mailto:lythuy84@gmail.com">
              <span>Email</span>
              lythuy84@gmail.com
            </a>
            <div className="social-links" aria-label="Mạng xã hội">
              <a
                className="social-icon facebook"
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                title="Facebook"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M14.2 22v-9.1h3.05l.46-3.55H14.2V7.08c0-1.03.29-1.73 1.76-1.73h1.88V2.18A25.2 25.2 0 0 0 15.1 2c-2.71 0-4.57 1.66-4.57 4.7v2.65H7.47v3.55h3.06V22h3.67Z"
                  />
                </svg>
              </a>
              <a
                className="social-icon instagram"
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                title="Instagram"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="2.75"
                    y="2.75"
                    width="18.5"
                    height="18.5"
                    rx="5.5"
                    stroke="currentColor"
                    strokeWidth="2.25"
                  />
                  <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="2.25" />
                  <circle cx="17.45" cy="6.65" r="1.25" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>PeanutCode — Code từng ngày, giỏi từng bước.</p>
          <p>Được xây dựng vì cộng đồng học sinh yêu thích Tin học.</p>
        </div>
      </footer>
    </main>
  );
}