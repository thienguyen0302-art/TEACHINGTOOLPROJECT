import { LessonTable } from "./LessonTheory";

export default function LessonSummary({
  chapter,
  isCompleted = false,
  onCompleteChapter,
  isSaving = false,
  onRestartChapter,
  onNextChapter,
  hasNextChapter = false,
}) {
  return (
    <section className="lesson-summary" aria-labelledby="lesson-summary-title">
      <div className="lesson-section-heading">
        <span>TỔNG KẾT CHƯƠNG</span>
        <h3 id="lesson-summary-title">Khép lại và ghi nhớ</h3>
      </div>
      <section className="lesson-summary__takeaways">
        <h4>Những điều cần nhớ</h4>
        <ul>
          {chapter.chapterSummary.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="lesson-summary__mistakes">
        <h4>Lỗi thường gặp</h4>
        <div>
          {chapter.commonMistakes.map((item, index) => (
            <article key={index}>
              <p><b>{item.mistake}</b></p>
              <p><span>Cách sửa:</span> {item.fix}</p>
            </article>
          ))}
        </div>
      </section>
      {chapter.cppVsPython?.length > 0 && (
        <section>
          <h4>So sánh C++ / Python</h4>
          <LessonTable rows={chapter.cppVsPython} />
        </section>
      )}

      {/* Phần đánh dấu hoàn thành chương */}
      <section className="lesson-summary__complete-action" aria-label="Hoàn thành chương">
        {isCompleted ? (
          <div className="lesson-summary__complete-card is-done">
            <div className="ls-complete-icon">✓</div>
            <div className="ls-complete-body">
              <h4>Chúc mừng! Bạn đã hoàn thành chương {chapter.order}</h4>
              <p>Toàn bộ kiến thức lý thuyết, trắc nghiệm và thực hành đã được hoàn tất và ghi nhận 100% vào lộ trình của bạn.</p>
            </div>
            <div className="ls-complete-buttons">
              {hasNextChapter && (
                <button type="button" className="ls-btn-next" onClick={onNextChapter}>
                  Sang chương tiếp theo →
                </button>
              )}
              {onRestartChapter && (
                <button type="button" className="ls-btn-restart" onClick={onRestartChapter}>
                  ↺ Học lại từ đầu
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="lesson-summary__complete-card">
            <div className="ls-complete-icon pending">★</div>
            <div className="ls-complete-body">
              <h4>Hoàn thành chương {chapter.order}</h4>
              <p>Bạn đã xem xong lý thuyết, trắc nghiệm và tổng kết. Bấm nút dưới đây để đánh dấu hoàn tất 100% chương này.</p>
            </div>
            <div className="ls-complete-buttons">
              <button
                type="button"
                className="ls-btn-complete"
                disabled={isSaving}
                onClick={onCompleteChapter}
              >
                {isSaving ? "Đang ghi nhận..." : "✓ Đánh dấu hoàn thành chương"}
              </button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}
