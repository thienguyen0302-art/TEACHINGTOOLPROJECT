import { useEffect, useId, useRef, useState } from "react";
import { analyzeTheorySelfCheck } from "../services/lessonSelfCheckService";

const LEVELS = {
  accurate: "Hiểu đúng",
  mostly_correct: "Gần đúng",
  partial: "Hiểu một phần",
  misunderstood: "Có điểm cần sửa",
};

function FeedbackList({ title, tone, items }) {
  if (!items?.length) return null;
  return <section className={`self-check-feedback__list self-check-feedback__list--${tone}`}><h5>{title}</h5><ul>{items.map((item, index) => <li key={`${tone}-${index}`}>{item}</li>)}</ul></section>;
}

export default function TheorySelfCheck({ selfCheck, language, chapterId, theoryId, explanation = "", onExplanationChange }) {
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [confirmAnswer, setConfirmAnswer] = useState(false);
  const requestRef = useRef(null);
  const textareaRef = useRef(null);
  const feedbackHeadingRef = useRef(null);
  const inputId = useId();
  const trimmed = explanation.trim();

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { if (feedback) feedbackHeadingRef.current?.focus(); }, [feedback]);

  async function analyze() {
    if (!trimmed || loading) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await analyzeTheorySelfCheck({ language, chapterId, theoryId, studentExplanation: trimmed, signal: controller.signal });
      if (!controller.signal.aborted) setFeedback(result);
    } catch (failure) {
      if (!controller.signal.aborted) setError("Chưa thể phân tích bằng AI lúc này. Em vẫn có thể tự đối chiếu với đáp án tham khảo.");
      console.debug("Self-Check unavailable:", failure.message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function requestAnswer() {
    if (trimmed || feedback || error) setShowAnswer(true);
    else setConfirmAnswer(true);
  }

  return (
    <section className="theory-self-check" aria-labelledby={`${inputId}-title`}>
      <div className="theory-self-check__heading">
        <span aria-hidden="true">✦</span>
        <div><p>TỰ KIỂM TRA</p><h4 id={`${inputId}-title`}>Dừng lại và nói theo cách hiểu của em</h4></div>
      </div>
      <p className="theory-self-check__question">{selfCheck.question}</p>
      <label htmlFor={inputId}>Hãy giải thích bằng cách hiểu của em:</label>
      <textarea
        id={inputId}
        ref={textareaRef}
        value={explanation}
        maxLength={2000}
        rows={5}
        placeholder="Viết lại theo cách hiểu của em..."
        onChange={(event) => { onExplanationChange?.(theoryId, event.target.value); setError(""); setConfirmAnswer(false); }}
        disabled={loading}
      />
      <div className="theory-self-check__meta"><span>{explanation.length}/2000</span><span>AI chỉ đưa ra đánh giá tham khảo</span></div>
      <div className="theory-self-check__actions">
        <button type="button" className="self-check-primary" disabled={!trimmed || loading} onClick={analyze}>
          {loading ? "AI đang phân tích…" : feedback ? "Phân tích lại cách hiểu" : "AI phân tích cách hiểu"}
        </button>
        <button type="button" className="self-check-secondary" onClick={requestAnswer}>Xem đáp án tham khảo</button>
      </div>

      <div className="theory-self-check__live" aria-live="polite" aria-atomic="true">
        {loading && <p role="status">Đang đối chiếu ý nghĩa câu trả lời với nội dung bài học…</p>}
        {error && <p className="self-check-error" role="alert">{error}</p>}
      </div>

      {feedback && (
        <section className={`self-check-feedback self-check-feedback--${feedback.level}`}>
          <p className="self-check-feedback__eyebrow">AI ĐỐI CHIẾU</p>
          <h4 ref={feedbackHeadingRef} tabIndex="-1">{feedback.accuracy}% · {LEVELS[feedback.level] ?? LEVELS.partial}</h4>
          <p className="self-check-feedback__disclaimer">Đánh giá tham khảo từ AI</p>
          <p>{feedback.summary}</p>
          <FeedbackList title="✓ Em đã hiểu đúng" tone="correct" items={feedback.correctPoints} />
          <FeedbackList title="△ Còn thiếu" tone="missing" items={feedback.missingPoints} />
          <FeedbackList title="! Cần sửa" tone="wrong" items={feedback.misconceptions} />
          {feedback.suggestedRevision && <div className="self-check-feedback__revision"><h5>Nói lại ngắn gọn:</h5><p>{feedback.suggestedRevision}</p></div>}
          {feedback.followUpQuestion && <div className="self-check-feedback__follow-up"><h5>Thử nghĩ thêm:</h5><p>{feedback.followUpQuestion}</p></div>}
          <button type="button" className="self-check-secondary" onClick={() => { setFeedback(null); setShowAnswer(false); textareaRef.current?.focus(); }}>Viết lại câu trả lời</button>
        </section>
      )}

      {confirmAnswer && !showAnswer && !trimmed && (
        <div className="self-check-answer-prompt">
          <p>Em chưa viết cách hiểu của mình. Xem đáp án ngay có thể làm mất cơ hội tự nhớ lại kiến thức.</p>
          <button type="button" className="self-check-secondary" onClick={() => setShowAnswer(true)}>Em vẫn muốn xem</button>
        </div>
      )}
      {showAnswer && <div className="self-check-reference"><h5>Đáp án tham khảo</h5><p>{selfCheck.answer}</p></div>}
    </section>
  );
}
