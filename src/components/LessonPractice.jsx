import ProblemCard from "./ProblemCard";
import QuestionCard from "./QuestionCard";
import "./LessonPractice.css";

export default function LessonPractice({
  chapter,
  language,
  practiceMode,
  setPracticeMode,
  answers,
  submitted,
  saveStatus,
  answeredCount,
  score,
  canSubmit,
  onSelect,
  onSubmit,
  onReset,
}) {
  const questions = chapter.quiz ?? [];
  const scoreOn10 = score.total ? ((score.correct / score.total) * 10).toFixed(1) : "0.0";
  const progressPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <section className="lp-container lesson-practice" aria-labelledby="practice-title">
      {/* Tiêu đề: nhãn THỰC HÀNH nhỏ phía trên, tiêu đề chính 24px đậm màu xanh đậm */}
      <div className="lp-heading">
        <span className="lp-label">THỰC HÀNH</span>
        <h2 className="lp-title" id="practice-title">
          Kiểm tra rồi vận dụng
        </h2>
      </div>

      {/* Hai tab đặt trong thanh nền xanh xám nhạt */}
      <div className="lp-subtabs" role="group" aria-label="Chọn hình thức thực hành">
        <button
          type="button"
          aria-pressed={practiceMode === "quiz"}
          className={`lp-tab ${practiceMode === "quiz" ? "lp-tab--active" : ""}`}
          onClick={() => setPracticeMode("quiz")}
        >
          Kiểm tra lý thuyết
        </button>
        <button
          type="button"
          aria-pressed={practiceMode === "coding"}
          className={`lp-tab ${practiceMode === "coding" ? "lp-tab--active" : ""}`}
          onClick={() => setPracticeMode("coding")}
        >
          Bài tập lập trình
        </button>
      </div>

      {/* Tab 1: Kiểm tra lý thuyết */}
      {practiceMode === "quiz" && (
        <div aria-label="Kiểm tra lý thuyết">
          {questions.length === 0 ? (
            <div className="lp-callout">
              <p style={{ margin: 0 }}>Chương này chưa có câu hỏi trắc nghiệm lý thuyết.</p>
            </div>
          ) : (
            <>
              {/* Khung tiến độ hiển thị câu đã trả lời và thanh tiến trình */}
              <div
                className={`lp-callout ${submitted ? "lp-callout--submitted" : ""}`}
                role="status"
              >
                {!submitted ? (
                  <>
                    <div className="lp-callout-top">
                      <div className="lp-callout-info">
                        <span className="lp-callout-count">
                          Đã trả lời <strong>{answeredCount}</strong>/{questions.length} câu
                        </span>
                        <p className="lp-callout-guide">
                          Chọn một đáp án cho mỗi câu rồi nộp bài để xem kết quả và lời giải chi tiết.
                        </p>
                      </div>
                      <span className="lp-callout-percent">
                        {progressPercent}%
                      </span>
                    </div>

                    <div className="lp-progress-bar" aria-label="Tiến trình làm bài">
                      <div
                        className="lp-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lp-callout-top">
                      <div className="lp-callout-info">
                        <div className="lp-score-badge">
                          <span className="lp-score-text">
                            Điểm số: <strong>{scoreOn10} / 10</strong>
                          </span>
                          <span className="lp-score-detail">
                            ({score.correct}/{score.total} câu đúng · {score.percentage}%)
                          </span>
                        </div>
                        <p className="lp-callout-guide">
                          Xem đáp án đúng/sai và lời giải chi tiết bên dưới, hoặc bấm "Làm lại" để ôn tập.
                        </p>
                      </div>
                    </div>

                    {saveStatus === "saving" && (
                      <p className="lp-save-status lp-save-status--saving">
                        <em>Đang đồng bộ tiến độ học tập...</em>
                      </p>
                    )}
                    {saveStatus === "saved" && (
                      <p className="lp-save-status lp-save-status--saved">
                        <strong>✓ Đã cập nhật kết quả vào hồ sơ học tập.</strong>
                      </p>
                    )}
                    {saveStatus === "error" && (
                      <p className="lp-save-status lp-save-status--error">
                        Chưa đồng bộ được với máy chủ (vẫn xem được giải thích bên dưới).
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Danh sách toàn bộ các câu hỏi áp dụng thiết kế thẻ trắng mới */}
              <div className="lp-questions-feed">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id || index}
                    question={question}
                    index={index}
                    selectedAnswer={answers[question.id]}
                    onSelect={(choice) => onSelect(question.id, choice)}
                    submitted={submitted}
                  />
                ))}
              </div>

              {/* Nút nộp bài / làm lại cuối danh sách */}
              <div className="lp-quiz-actions">
                {!submitted ? (
                  <>
                    <button
                      type="button"
                      className="lp-btn-submit"
                      disabled={!canSubmit}
                      onClick={() => onSubmit(score)}
                    >
                      Nộp bài
                    </button>
                    {!canSubmit && (
                      <p className="lp-unanswered-hint">
                        Còn {questions.length - answeredCount} câu chưa trả lời.
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="lp-btn-reset"
                    onClick={onReset}
                  >
                    Làm lại bài kiểm tra
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Bài tập lập trình */}
      {practiceMode === "coding" && (
        <div className="lp-coding-section" aria-label="Bài tập lập trình">
          <p className="lp-coding-desc">
            Viết code trực tiếp, chạy thử và nộp bài để hệ thống tự động chấm điểm. Mở gợi ý khi cần để tìm hướng giải.
          </p>
          <section className="lesson-problem-group">
            <h4>Bài luyện tập</h4>
            {(chapter.practice ?? []).map((problem) => (
              <ProblemCard
                key={`${language}:${chapter.id}:practice:${problem.id}`}
                problem={problem}
                language={language}
                chapterId={chapter.id}
                section="practice"
              />
            ))}
            {!chapter.practice?.length && <p>Chưa có bài luyện tập.</p>}
          </section>
          <section className="lesson-problem-group lesson-problem-group--advanced">
            <h4>Thử thách HSG</h4>
            {(chapter.advanced ?? []).map((problem) => (
              <ProblemCard
                key={`${language}:${chapter.id}:advanced:${problem.id}`}
                problem={problem}
                language={language}
                chapterId={chapter.id}
                section="advanced"
              />
            ))}
            {!chapter.advanced?.length && <p>Chưa có bài nâng cao.</p>}
          </section>
        </div>
      )}
    </section>
  );
}
