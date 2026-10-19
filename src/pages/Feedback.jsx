import { useState, useEffect } from "react";
import Icon from "../components/Icon";
import {
  getUserReview,
  submitUserReview,
  deleteUserReview,
} from "../services/reviewService";
import {
  submitBugReport,
  subscribeUserBugReports,
} from "../services/bugReportService";
import { displayName } from "../utils/format";
import "./Feedback.css";

const RATING_DESCRIPTIONS = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Rất hài lòng",
};

const BUG_CATEGORIES = {
  judge: "Hệ thống chấm tự động",
  ui: "Giao diện người dùng (UI/UX)",
  content: "Nội dung bài học / Đề thi / Typo",
  account: "Tài khoản / Đăng nhập (Auth)",
  feature: "Đề xuất tính năng mới",
  other: "Khác",
};

const BUG_SEVERITIES = {
  low: { label: "Thấp - Lỗi nhỏ", color: "#64748b" },
  medium: { label: "Trung bình - Khó chịu", color: "#ea580c" },
  high: { label: "Cao - Ảnh hưởng việc học", color: "#dc2626" },
  critical: { label: "Khẩn cấp - Không thể tiếp tục", color: "#991b1b" },
};

export default function Feedback({ user, uid, data }) {
  // Main Tab: 'review' | 'bug'
  const [activeTab, setActiveTab] = useState("review");

  // ── Review state ──
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [publicName, setPublicName] = useState(
    () => data?.profile?.displayName || user?.displayName || ""
  );
  const [content, setContent] = useState("");
  const [isPublicConsent, setIsPublicConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [existingReview, setExistingReview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // ── Bug report state ──
  const [bugCategory, setBugCategory] = useState("judge");
  const [bugSeverity, setBugSeverity] = useState("medium");
  const [bugTitle, setBugTitle] = useState("");
  const [bugDesc, setBugDesc] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugError, setBugError] = useState("");
  const [bugSuccess, setBugSuccess] = useState("");
  const [submittedBugData, setSubmittedBugData] = useState(null);
  const [userBugs, setUserBugs] = useState([]);

  // Check if user has real study activity
  const hasStudyActivity = Boolean(
    (data?.profile?.studySeconds && data.profile.studySeconds > 60) ||
    (data?.rows && data.rows.some((r) => r.completed || r.bestScore > 0)) ||
    (data?.daily && Object.keys(data.daily).length > 0)
  );

  // Load user review
  useEffect(() => {
    let cancelled = false;
    if (!uid) return;
    getUserReview(uid)
      .then((review) => {
        if (!cancelled && review) {
          setExistingReview(review);
          setRating(review.rating || 0);
          setPublicName(review.displayName || displayName(user));
          setContent(review.content || "");
          setIsPublicConsent(Boolean(review.isPublicConsent));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, user]);

  // Subscribe to user bug reports
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeUserBugReports(uid, (items) => {
      setUserBugs(items || []);
    });
    return () => unsub?.();
  }, [uid]);

  const activeRating = hoverRating > 0 ? hoverRating : rating;

  // Submit review
  async function handleSubmitReview(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (rating === 0) {
      setError("Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao)");
      return;
    }
    if (content.trim().length < 15) {
      setError("Nội dung chia sẻ cần ít nhất 15 ký tự để người đọc hiểu rõ hơn.");
      return;
    }
    if (content.trim().length > 600) {
      setError("Nội dung đánh giá không nên quá 600 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      const saved = await submitUserReview({
        uid,
        displayName: publicName.trim() || displayName(user),
        rating,
        content: content.trim(),
        isPublicConsent,
        isVerifiedLearner: hasStudyActivity,
      });

      setExistingReview(saved);
      setIsEditing(false);
      setSuccessMsg(
        isPublicConsent
          ? "Đánh giá của bạn đã được gửi và đang chờ Ban phát hành phê duyệt để hiển thị công khai trên trang đăng nhập!"
          : "Cảm ơn bạn đã đóng góp ý kiến để hoàn thiện PeanutCode!"
      );
    } catch (err) {
      setError(err.message || "Không thể gửi đánh giá lúc này. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  // Withdraw review
  async function handleWithdrawReview() {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn rút lại đánh giá này? Đánh giá sẽ không còn hiển thị trên hệ thống."
      )
    ) {
      return;
    }

    try {
      await deleteUserReview(uid);
      setExistingReview(null);
      setRating(0);
      setContent("");
      setIsPublicConsent(false);
      setIsEditing(false);
      setSuccessMsg("Đã rút lại đánh giá thành công.");
    } catch (err) {
      setError("Không thể rút lại đánh giá: " + err.message);
    }
  }

  // Submit Bug Report
  async function handleSubmitBug(e) {
    e.preventDefault();
    setBugError("");
    setBugSuccess("");

    if (!bugTitle.trim()) {
      setBugError("Vui lòng nhập tóm tắt sự cố");
      return;
    }
    if (bugDesc.trim().length < 10) {
      setBugError("Vui lòng mô tả chi tiết sự cố ít nhất 10 ký tự.");
      return;
    }

    setBugSubmitting(true);
    try {
      const report = await submitBugReport({
        uid,
        displayName: displayName(user),
        email: user?.email,
        category: bugCategory,
        severity: bugSeverity,
        title: bugTitle,
        description: bugDesc,
        stepsToReproduce: bugSteps,
      });

      setSubmittedBugData(report);
      setBugTitle("");
      setBugDesc("");
      setBugSteps("");
      setBugSuccess(
        report?.emailDelivery?.sent
          ? `✅ Báo cáo sự cố đã được gửi trực tiếp đến hộp thư của Người phát hành (${report.recipient || "lythuy84@gmail.com"})!`
          : `✅ Báo cáo sự cố đã được ghi nhận trên hệ thống của Người phát hành (${report.recipient || "lythuy84@gmail.com"})!`
      );
    } catch (err) {
      setBugError(err.message || "Không thể gửi báo cáo lỗi lúc này.");
    } finally {
      setBugSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="content fb-page">
        <div className="fb-card fb-loading">
          <p>Đang tải thông tin đánh giá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content fb-page">
      <div className="fb-card">
        {/* ── Đầu khung Hero ── */}
        <div className="fb-hero">
          <span className="fb-kicker">
            <Icon name="message" /> TRUNG TÂM PHẢN HỒI &amp; GÓP Ý
          </span>
          <h1>
            {activeTab === "review"
              ? "Chia sẻ cảm nhận của bạn về PeanutCode"
              : "Báo lỗi & Góp ý cho Người phát hành"}
          </h1>
          <p>
            {activeTab === "review"
              ? "Ý kiến đóng góp chân thành của bạn giúp nền tảng ngày càng hoàn thiện và truyền cảm hứng cho các thế hệ học viên HSG tiếp theo."
              : "Mọi báo cáo lỗi hoặc đề xuất kỹ thuật sẽ được gửi trực tiếp đến Người phát hành nền tảng (Cô Lý Thị Thanh Thúy - lythuy84@gmail.com) để khắc phục nhanh nhất."}
          </p>
        </div>

        {/* ── Main Navigation Tabs ── */}
        <div className="fb-main-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "review"}
            className={`fb-main-tab-btn ${activeTab === "review" ? "active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            <Icon name="trophy" /> Đánh giá khóa học
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bug"}
            className={`fb-main-tab-btn ${activeTab === "bug" ? "active" : ""}`}
            onClick={() => setActiveTab("bug")}
          >
            <Icon name="code" /> Báo lỗi &amp; Góp ý kỹ thuật ({userBugs.length})
          </button>
        </div>

        {/* ── TAB 1: ĐÁNH GIÁ KHÓA HỌC ── */}
        {activeTab === "review" && (
          <div>
            {existingReview && !isEditing ? (
              <div className="fb-existing-box">
                <div className="fb-status-bar">
                  {existingReview.status === "approved" ? (
                    <span className="fb-status-badge approved">
                      <Icon name="check" /> Đã được duyệt
                      {existingReview.isPublicConsent && " · Đang hiển thị trang đăng nhập"}
                    </span>
                  ) : existingReview.status === "rejected" ? (
                    <span className="fb-status-badge rejected">
                      <Icon name="x" /> Cần chỉnh sửa nội dung
                    </span>
                  ) : (
                    <span className="fb-status-badge pending">
                      <Icon name="clock" /> Đang chờ Ban phát hành duyệt công khai
                    </span>
                  )}

                  {existingReview.isVerifiedLearner && (
                    <span className="fb-verified-pill">
                      <Icon name="check" /> Học viên đã xác thực
                    </span>
                  )}
                </div>

                <div className="fb-existing-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`fb-star-static ${star <= existingReview.rating ? "active" : ""}`}
                    >
                      ★
                    </span>
                  ))}
                  <strong>{RATING_DESCRIPTIONS[existingReview.rating]}</strong>
                </div>

                <blockquote className="fb-existing-quote">“{existingReview.content}”</blockquote>

                <div className="fb-existing-meta">
                  <span>Tên hiển thị: <b>{existingReview.displayName}</b></span>
                  <span>
                    Chia sẻ trang đăng nhập:{" "}
                    <b>{existingReview.isPublicConsent ? "Đồng ý" : "Không"}</b>
                  </span>
                </div>

                {successMsg && <div className="fb-success-banner">{successMsg}</div>}

                <div className="fb-existing-actions">
                  <button
                    type="button"
                    className="fb-btn-edit"
                    onClick={() => {
                      setIsEditing(true);
                      setSuccessMsg("");
                      setError("");
                    }}
                  >
                    Chỉnh sửa đánh giá
                  </button>
                  <button
                    type="button"
                    className="fb-btn-withdraw"
                    onClick={handleWithdrawReview}
                  >
                    Rút lại đánh giá
                  </button>
                </div>
              </div>
            ) : (
              <form className="fb-form" onSubmit={handleSubmitReview} noValidate>
                {isEditing && (
                  <div className="fb-edit-notice">
                    <Icon name="clock" />
                    <span>
                      Bạn đang chỉnh sửa đánh giá. Khi lưu lại, đánh giá sẽ quay về trạng thái chờ
                      kiểm duyệt.
                    </span>
                  </div>
                )}

                {/* 1. Chọn sao */}
                <div className="fb-field">
                  <label className="fb-label">
                    Mức độ hài lòng của bạn <em className="fb-req">*</em>
                  </label>
                  <div
                    className="fb-star-picker"
                    role="radiogroup"
                    aria-label="Đánh giá từ 1 đến 5 sao"
                  >
                    <div
                      className="fb-stars-row"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`fb-star-btn ${star <= activeRating ? "active lit" : ""}`}
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => setRating(star)}
                          aria-label={`${star} sao`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <span className={`fb-rating-desc ${activeRating > 0 ? "visible" : ""}`}>
                      {RATING_DESCRIPTIONS[activeRating] || "Nhấp vào sao để đánh giá"}
                    </span>
                  </div>
                </div>

                {/* 2. Tên hiển thị */}
                <div className="fb-field">
                  <label htmlFor="fb-name" className="fb-label">
                    Tên hiển thị công khai
                  </label>
                  <input
                    id="fb-name"
                    type="text"
                    className="fb-input"
                    maxLength={50}
                    value={publicName}
                    onChange={(e) => setPublicName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A hoặc ẩn danh"
                  />
                  <span className="fb-hint">
                    Tên này sẽ xuất hiện kèm theo đánh giá nếu được chọn hiển thị.
                  </span>
                </div>

                {/* 3. Nội dung chia sẻ */}
                <div className="fb-field">
                  <label htmlFor="fb-content" className="fb-label">
                    Cảm nhận &amp; Đóng góp ý kiến <em className="fb-req">*</em>
                  </label>
                  <textarea
                    id="fb-content"
                    className="fb-textarea"
                    rows={4}
                    maxLength={600}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Bạn cảm thấy bài giảng, hệ thống chấm bài hoặc trợ lý AI như thế nào? Điều gì giúp bạn tiến bộ nhất?"
                  />
                  <div className="fb-char-count">{content.length}/600 ký tự</div>
                </div>

                {/* 4. Đồng ý hiển thị công khai */}
                <div className="fb-field fb-field--checkbox">
                  <label className="fb-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isPublicConsent}
                      onChange={(e) => setIsPublicConsent(e.target.checked)}
                    />
                    <span>
                      Cho phép hiển thị đánh giá này trên trang đăng nhập và giới thiệu của
                      PeanutCode sau khi Ban phát hành phê duyệt.
                    </span>
                  </label>
                </div>

                {error && <div className="fb-error-banner">{error}</div>}
                {successMsg && <div className="fb-success-banner">{successMsg}</div>}

                <div className="fb-submit-row">
                  <button
                    type="submit"
                    className="fb-btn-submit"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Đang gửi đánh giá..."
                      : existingReview
                      ? "Cập nhật đánh giá"
                      : "Gửi đánh giá"}
                  </button>

                  {isEditing && (
                    <button
                      type="button"
                      className="fb-btn-cancel"
                      onClick={() => {
                        setIsEditing(false);
                        setError("");
                      }}
                    >
                      Hủy chỉnh sửa
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 2: BÁO LỖI & GÓP Ý KỸ THUẬT CHO LẬP TRÌNH VIÊN ── */}
        {activeTab === "bug" && (
          <div style={{ padding: "24px 36px 36px" }}>
            <form onSubmit={handleSubmitBug} noValidate>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Phân loại sự cố <em style={{ color: "#dc2626" }}>*</em>
                  </label>
                  <select
                    value={bugCategory}
                    onChange={(e) => setBugCategory(e.target.value)}
                    className="fb-input"
                    style={{ width: "100%", padding: "10px 12px" }}
                  >
                    {Object.entries(BUG_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    Mức độ nghiêm trọng <em style={{ color: "#dc2626" }}>*</em>
                  </label>
                  <select
                    value={bugSeverity}
                    onChange={(e) => setBugSeverity(e.target.value)}
                    className="fb-input"
                    style={{ width: "100%", padding: "10px 12px" }}
                  >
                    {Object.entries(BUG_SEVERITIES).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Tóm tắt sự cố <em style={{ color: "#dc2626" }}>*</em>
                </label>
                <input
                  type="text"
                  className="fb-input"
                  placeholder="Ví dụ: Nút Nộp bài bị xoay vòng, Lỗi sai kết quả test 3 bài Chuyên đề 2..."
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Mô tả chi tiết sự cố <em style={{ color: "#dc2626" }}>*</em>
                </label>
                <textarea
                  className="fb-textarea"
                  rows={4}
                  placeholder="Hãy mô tả chi tiết điều gì đã xảy ra, kết quả mong đợi và thông báo lỗi (nếu có)..."
                  value={bugDesc}
                  onChange={(e) => setBugDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Các bước tái hiện lỗi (nếu có)
                </label>
                <textarea
                  className="fb-textarea"
                  rows={2}
                  placeholder="1. Vào bài tập... 2. Bấm Chạy thử... 3. Xuất hiện lỗi..."
                  value={bugSteps}
                  onChange={(e) => setBugSteps(e.target.value)}
                />
              </div>

              <div
                style={{
                  background: "var(--ps-bg, #f8fafc)",
                  border: "1px solid var(--ps-border, #e2e8f0)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--ps-text-sub, #64748b)",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon name="check" />
                <span>
                  Hệ thống sẽ tự động đính kèm thông tin trình duyệt, màn hình và URL hiện tại gửi đến Người phát hành (Cô Lý Thị Thanh Thúy - lythuy84@gmail.com).
                </span>
              </div>

              {bugError && <div className="fb-error-banner" style={{ marginBottom: 14 }}>{bugError}</div>}
              {bugSuccess && (
                <div
                  className="fb-success-banner"
                  style={{
                    marginBottom: 16,
                    padding: "16px 18px",
                    borderRadius: 12,
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#166534", marginBottom: 6 }}>
                    {bugSuccess}
                  </div>
                  <div style={{ fontSize: 13, color: "#15803d", marginBottom: 10, lineHeight: 1.5 }}>
                    📬 <strong>Hộp thư người nhận:</strong> Cô Lý Thị Thanh Thúy (<code>lythuy84@gmail.com</code>)
                    {submittedBugData?.emailDelivery?.sent ? (
                      <span style={{ display: "block", marginTop: 4, color: "#166534", fontWeight: 700 }}>
                        ✓ Email đã được gửi tự động thành công vào hòm thư!
                      </span>
                    ) : (
                      <span style={{ display: "block", marginTop: 4, color: "#475569" }}>
                        Báo cáo đã lưu trên hệ thống quản trị của Người phát hành. Bạn cũng có thể bấm nút dưới để mở Gmail gửi trực tiếp một bản sao:
                      </span>
                    )}
                  </div>

                  {submittedBugData?.mailLinks && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                      <a
                        href={submittedBugData.mailLinks.gmailUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "9px 16px",
                          borderRadius: 9,
                          background: "#2563eb",
                          color: "#ffffff",
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 800,
                          boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                        }}
                      >
                        <Icon name="send" /> Mở Gmail gửi ngay tới lythuy84@gmail.com
                      </a>
                      <a
                        href={submittedBugData.mailLinks.mailtoUrl}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 14px",
                          borderRadius: 9,
                          background: "#ffffff",
                          color: "#334155",
                          border: "1px solid #cbd5e1",
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Ứng dụng Mail mặc định
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="fb-btn-submit"
                disabled={bugSubmitting}
              >
                {bugSubmitting ? "Đang gửi báo cáo..." : "Gửi báo lỗi cho Người phát hành (lythuy84@gmail.com)"}
              </button>
            </form>

            {/* Lịch sử báo lỗi đã gửi của người dùng */}
            <div className="bug-history-section">
              <div className="bug-history-title">
                <span>Lịch sử báo lỗi của bạn</span>
                <span style={{ fontSize: 12, color: "var(--ps-text-sub, #64748b)", fontWeight: 600 }}>
                  {userBugs.length} báo cáo
                </span>
              </div>

              <div className="bug-history-list">
                {userBugs.map((b) => {
                  const isResolved = b.status === "resolved";
                  const isInvestigating = b.status === "investigating";
                  const statusClass = isResolved ? "resolved" : isInvestigating ? "investigating" : "new";
                  const statusLabel = isResolved ? "✓ Đã khắc phục" : isInvestigating ? "🔍 Đang xử lý" : "📬 Mới nhận";

                  return (
                    <div key={b.id} className="bug-history-item">
                      <div className="bug-item-header">
                        <h4 className="bug-item-title">{b.title}</h4>
                        <span className={`bug-status-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="bug-item-desc">{b.description}</p>
                      <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 12 }}>
                        <span>Loại: {BUG_CATEGORIES[b.category] || b.category}</span>
                        <span>Mức độ: {BUG_SEVERITIES[b.severity]?.label || b.severity}</span>
                        <span>Gửi lúc: {new Date(b.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>

                      {b.devNotes && (
                        <div className="bug-dev-note">
                          <strong>Phản hồi từ Ban phát triển:</strong> {b.devNotes}
                        </div>
                      )}
                    </div>
                  );
                })}

                {userBugs.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--ps-text-sub, #94a3b8)", fontSize: 13, margin: "16px 0" }}>
                    Bạn chưa gửi báo lỗi nào. Nếu gặp bất kỳ vấn đề gì, hãy gửi biểu mẫu phía trên!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
