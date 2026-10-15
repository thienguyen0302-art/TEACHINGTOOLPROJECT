import { useState, useEffect } from "react";
import Icon from "../components/Icon";
import {
  getUserReview,
  submitUserReview,
  deleteUserReview,
} from "../services/reviewService";
import { displayName } from "../utils/format";
import "./Feedback.css";

const RATING_DESCRIPTIONS = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Rất hài lòng",
};

export default function Feedback({ user, uid, data }) {
  const [rating, setRating] = useState(0); // 0 = unselected
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

  // Kiểm tra xem học viên đã có hoạt động học tập thực tế chưa
  const hasStudyActivity = Boolean(
    (data?.profile?.studySeconds && data.profile.studySeconds > 60) ||
    (data?.rows && data.rows.some((r) => r.completed || r.bestScore > 0)) ||
    (data?.daily && Object.keys(data.daily).length > 0)
  );

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

  const activeRating = hoverRating > 0 ? hoverRating : rating;

  async function handleSubmit(e) {
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
          ? "Đánh giá của bạn đã được gửi và đang chờ kiểm duyệt để hiển thị công khai trên trang giới thiệu!"
          : "Cảm ơn bạn đã đóng góp ý kiến để hoàn thiện PeanutCode!"
      );
    } catch (err) {
      setError(err.message || "Không thể gửi đánh giá lúc này. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
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
        {/* ── Đầu khung nền xanh chuyển sắc ── */}
        <div className="fb-hero">
          <span className="fb-kicker">
            <Icon name="message" /> ĐÁNH GIÁ &amp; GÓP Ý
          </span>
          <h1>Chia sẻ cảm nhận của bạn về PeanutCode</h1>
          <p>
            Mỗi ý kiến đóng góp chân thành từ học viên là động lực to lớn giúp nền tảng ngày càng
            hoàn thiện hơn trong hành trình bồi dưỡng đội tuyển HSG Tin học.
          </p>
        </div>

        {/* ── Trạng thái đánh giá hiện tại nếu có và không trong chế độ sửa ── */}
        {existingReview && !isEditing ? (
          <div className="fb-existing-box">
            <div className="fb-status-bar">
              {existingReview.status === "approved" ? (
                <span className="fb-status-badge approved">
                  <Icon name="check" /> Đã được duyệt
                  {existingReview.isPublicConsent && " · Đang hiển thị công khai"}
                </span>
              ) : existingReview.status === "rejected" ? (
                <span className="fb-status-badge rejected">
                  <Icon name="x" /> Cần chỉnh sửa nội dung
                </span>
              ) : (
                <span className="fb-status-badge pending">
                  <Icon name="clock" /> Đang chờ duyệt công khai
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
                Chia sẻ trang ngoài:{" "}
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
                onClick={handleWithdraw}
              >
                Rút lại đánh giá
              </button>
            </div>
          </div>
        ) : (
          /* ── Form đánh giá nền trắng ── */
          <form className="fb-form" onSubmit={handleSubmit} noValidate>
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
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isLit = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        className={`fb-star-btn ${isLit ? "lit" : ""}`}
                        onMouseEnter={() => setHoverRating(star)}
                        onClick={() => {
                          setRating(star);
                          if (error) setError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowRight" && star < 5) setRating(star + 1);
                          if (e.key === "ArrowLeft" && star > 1) setRating(star - 1);
                        }}
                        aria-label={`${star} sao: ${RATING_DESCRIPTIONS[star]}`}
                        aria-checked={rating === star}
                        role="radio"
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <span className={`fb-rating-desc ${activeRating > 0 ? "visible" : ""}`}>
                  {activeRating > 0
                    ? RATING_DESCRIPTIONS[activeRating]
                    : "Chọn số sao tương ứng cảm nhận của bạn"}
                </span>
              </div>
            </div>

            {/* 2. Tên hiển thị công khai */}
            <div className="fb-field">
              <label htmlFor="fb-name" className="fb-label">
                Tên hiển thị công khai
              </label>
              <input
                id="fb-name"
                type="text"
                className="fb-input"
                maxLength={50}
                placeholder="Ví dụ: Nguyễn Minh Anh hoặc Học viên 9A"
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
              />
              <span className="fb-hint">
                Tên này sẽ xuất hiện cùng đánh giá nếu được chia sẻ. Không bao giờ hiển thị email, lớp
                hoặc trường.
              </span>
            </div>

            {/* 3. Nội dung đánh giá */}
            <div className="fb-field">
              <div className="fb-label-row">
                <label htmlFor="fb-content" className="fb-label">
                  Chia sẻ cảm nhận &amp; trải nghiệm của bạn <em className="fb-req">*</em>
                </label>
                <span className="fb-char-count">{content.length}/600</span>
              </div>
              <textarea
                id="fb-content"
                className="fb-textarea"
                rows={4}
                maxLength={600}
                placeholder="Ví dụ: Nền tảng giúp mình hiểu rõ thuật toán qua từng testcase biên và phân tích Big-O của AI Tutor. Mình đã tự tin hơn rất nhiều khi làm các bài tập mảng và quy hoạch động..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (error) setError("");
                }}
              />
              <span className="fb-hint">Tối thiểu 15 ký tự. Vui lòng không chia sẻ thông tin riêng tư.</span>
            </div>

            {/* 4. Checkbox đồng ý công khai */}
            <label className="fb-checkbox-label">
              <input
                type="checkbox"
                className="fb-checkbox"
                checked={isPublicConsent}
                onChange={(e) => setIsPublicConsent(e.target.checked)}
              />
              <span className="fb-checkbox-text">
                Cho phép hiển thị đánh giá trên trang giới thiệu bên ngoài
              </span>
            </label>

            {/* 5. Thông báo kiểm duyệt & bảo mật */}
            <div className="fb-notice-card">
              <span className="fb-notice-icon">
                <Icon name="shield" />
              </span>
              <p>
                <b>Chính sách kiểm duyệt &amp; bảo vệ thông tin:</b> Đánh giá công khai được đội ngũ
                giáo viên duyệt để đảm bảo nội dung tích cực, văn minh. Địa chỉ email, kết quả điểm
                thi và thông tin cá nhân của bạn sẽ luôn được bảo mật tuyệt đối.
              </p>
            </div>

            {/* Thông báo lỗi / thành công */}
            {error && <div className="fb-error-banner">{error}</div>}
            {successMsg && <div className="fb-success-banner">{successMsg}</div>}

            {/* Nút gửi dạng pill, 100% width */}
            <div className="fb-submit-row">
              <button
                type="submit"
                className="fb-btn-submit"
                disabled={submitting}
              >
                {submitting ? "Đang gửi đánh giá..." : existingReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
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
    </div>
  );
}
