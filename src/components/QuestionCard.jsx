import { checkAnswer } from "../utils/grading";
import "./QuestionCard.css";

const optionLetters = ["A", "B", "C", "D", "E", "F"];

function getDifficultyLabel(level) {
  if (level === "basic") return "Cơ bản";
  if (level === "intermediate") return "Trung bình";
  if (level === "advanced") return "Nâng cao";
  return level || "Quiz";
}

export default function QuestionCard({
  question,
  index = 0,
  selectedAnswer,
  onSelect,
  submitted = false,
}) {
  const isCorrect = submitted && checkAnswer(question, selectedAnswer);

  return (
    <article className="qc-card" aria-labelledby={`question-title-${question.id || index}`}>
      {/* Đầu thẻ: Số câu cùng hàng với độ khó và chủ đề */}
      <div className="qc-header-row">
        <span className="qc-number-badge">
          Câu {index + 1}
        </span>

        <div className="qc-tags-group">
          {/* Nhãn độ khó */}
          <span className={`qc-difficulty-badge diff-${question.difficulty || "basic"}`}>
            {getDifficultyLabel(question.difficulty)}
          </span>

          {/* Nhãn chủ đề */}
          {question.tags?.map((tag) => (
            <span key={tag} className="qc-tag-pill">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Nội dung câu hỏi: 18px, đậm 700 */}
      <h3 id={`question-title-${question.id || index}`} className="qc-question-title">
        {question.question}
      </h3>

      {/* Đoạn code của câu hỏi (nếu có) */}
      {question.code && (
        <div className="qc-code-block">
          <div className="qc-code-label">Đoạn code:</div>
          <pre aria-label={`Đoạn code câu ${index + 1}`}>
            <code>{question.code}</code>
          </pre>
        </div>
      )}

      {/* Danh sách các đáp án */}
      <div
        className="qc-options-list"
        role="radiogroup"
        aria-label={`Các đáp án cho câu ${index + 1}`}
      >
        {question.choices.map((choice, i) => {
          const letter = optionLetters[i] || `${i + 1}`;
          const isSelected = selectedAnswer === choice;

          let optionModifier = "";
          if (isSelected) optionModifier += " qc-option-selected";

          if (submitted) {
            optionModifier += " qc-option-disabled";
            if (checkAnswer(question, choice)) {
              optionModifier += " qc-option-correct";
            } else if (isSelected && !isCorrect) {
              optionModifier += " qc-option-wrong";
            }
          }

          return (
            <label
              key={choice}
              className={`qc-option-label${optionModifier}`}
            >
              <input
                type="radio"
                name={`question_${question.id || index}`}
                className="qc-option-input"
                value={choice}
                checked={isSelected}
                onChange={() => !submitted && onSelect(choice)}
                disabled={submitted}
              />

              {/* Ô ký hiệu A/B/C/D tách riêng rõ ràng */}
              <span className="qc-option-letter" aria-hidden="true">
                {letter}
              </span>

              {/* Nội dung đáp án */}
              <span className="qc-option-text">{choice}</span>

              {/* Dấu chọn tròn rõ ràng bên phải */}
              <span className="qc-option-radio-dot" aria-hidden="true" />
            </label>
          );
        })}
      </div>

      {/* Chân thẻ: Kết quả sau khi nộp hoặc nhắc chọn đáp án */}
      <div className="qc-card-footer">
        {!submitted ? (
          <p className="qc-hint-unsubmitted">
            {selectedAnswer ? (
              <>
                <span>Đã chọn:</span> <strong>{selectedAnswer}</strong>
              </>
            ) : (
              <span>Chọn 1 đáp án để hoàn thành câu này</span>
            )}
          </p>
        ) : (
          <div className="qc-result-block">
            <div className="qc-result-badge-row">
              <span
                className={`qc-status-pill ${
                  isCorrect ? "status-correct" : "status-wrong"
                }`}
              >
                {isCorrect ? "✓ Chính xác" : "✕ Chưa đúng"}
              </span>

              <p className="qc-correct-answer-text">
                Đáp án đúng: <strong>{question.answer}</strong>
              </p>
            </div>

            {/* Giải thích chi tiết */}
            {question.explanation && (
              <div className="qc-explanation-box">
                <strong>Lời giải &amp; Giải thích:</strong>
                <p>{question.explanation}</p>
              </div>
            )}

            {/* Mẹo / Hướng tiếp cận bổ sung */}
            {question.betterApproach && (
              <div className="qc-better-approach-box">
                <strong>Mẹo &amp; Hướng cải thiện:</strong>
                <p>{question.betterApproach}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
