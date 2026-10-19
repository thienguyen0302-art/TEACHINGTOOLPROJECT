import { useId } from "react";
import "./ResumeLessonModal.css";

export default function ResumeLessonModal({
  isOpen,
  chapter,
  progressPercent = 0,
  isCompleted = false,
  savedTab = "overview",
  savedPracticeMode = "quiz",
  savedAnsweredCount = 0,
  totalQuizQuestions = 10,
  onContinue,
  onRestart,
  onClose,
}) {
  const titleId = useId();
  if (!isOpen) return null;

  // Mô tả vị trí đang làm dở
  let positionLabel = "Phần Tổng quan chương";
  if (savedTab === "theory") {
    positionLabel = "Phần Lý thuyết & Tự kiểm tra";
  } else if (savedTab === "practice") {
    positionLabel =
      savedPracticeMode === "coding"
        ? "Phần Thực hành · Bài tập lập trình"
        : `Phần Thực hành · Trắc nghiệm (${savedAnsweredCount}/${totalQuizQuestions} câu)`;
  } else if (savedTab === "summary") {
    positionLabel = "Phần Tổng kết chương";
  }

  return (
    <div
      className="rlm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div className="rlm-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="rlm-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>

        <div className="rlm-badge-wrap">
          <span className="rlm-badge">
            {isCompleted ? "✓ ĐÃ HOÀN THÀNH" : "ĐANG HỌC DỞ"}
          </span>
        </div>

        <h3 id={titleId} className="rlm-title">
          {isCompleted
            ? `Chương ${chapter?.order || ""}: ${chapter?.title || "Bài học"}`
            : `Tiếp tục học chương ${chapter?.order || ""}?`}
        </h3>

        <p className="rlm-desc">
          {isCompleted
            ? "Bạn đã hoàn tất 100% chương này. Bạn có thể tiếp tục xem lại hoặc học lại từ đầu để ôn tập kiến thức."
            : "Hệ thống đã lưu lại tiến trình học trước đó của bạn. Bạn muốn tiếp tục bài đang làm dở hay học lại từ đầu?"}
        </p>

        {/* Khung thông tin tiến độ */}
        <div className="rlm-progress-box">
          <div className="rlm-progress-header">
            <span>Tiến độ chương:</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="rlm-progress-track">
            <span
              className="rlm-progress-fill"
              style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
            />
          </div>
          <div className="rlm-position-row">
            <span className="rlm-pos-label">Vị trí dừng trước đó:</span>
            <span className="rlm-pos-val">{positionLabel}</span>
          </div>
        </div>

        {/* 2 nút hành động chính */}
        <div className="rlm-actions">
          <button
            type="button"
            className="rlm-btn rlm-btn-continue"
            onClick={onContinue}
          >
            <span className="rlm-btn-title">Tiếp tục học</span>
            <span className="rlm-btn-sub">Vào lại vị trí đang làm dở →</span>
          </button>

          <button
            type="button"
            className="rlm-btn rlm-btn-restart"
            onClick={onRestart}
          >
            <span className="rlm-btn-title">Học lại từ đầu</span>
            <span className="rlm-btn-sub">Bắt đầu từ mục Tổng quan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
