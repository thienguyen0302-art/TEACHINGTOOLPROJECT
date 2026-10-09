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
  const isCorrect = submitted && selectedAnswer === question.answer;

  return (
    <div className="question-card">
      <div className="question-card__header">
        <div>
          <p className="question-card__number">Câu {index + 1}</p>
          <h3 className="question-card__title">{question.question}</h3>
        </div>

        <span
          className={`difficulty-badge difficulty-badge--${question.difficulty}`}
        >
          {getDifficultyLabel(question.difficulty)}
        </span>
      </div>

      {question.tags?.length > 0 && (
        <div className="question-card__tags">
          {question.tags.map((tag) => (
            <span key={tag} className="question-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="question-options" role="radiogroup" aria-label={`Câu ${index + 1}: ${question.question}`}>
        {question.choices.map((choice, i) => {
          const letter = optionLetters[i] || `${i + 1}`;
          const isSelected = selectedAnswer === choice;

          let optionClass = "question-option";
          if (isSelected) optionClass += " question-option--selected";

          if (submitted) {
            if (choice === question.answer) {
              optionClass += " question-option--correct";
            } else if (isSelected && choice !== question.answer) {
              optionClass += " question-option--wrong";
            }
          }

          return (
            <label key={choice} className={optionClass}>
              <input
                type="radio"
                name={question.id}
                value={choice}
                checked={isSelected}
                onChange={() => onSelect(choice)}
                disabled={submitted}
              />

              <span className="question-option__letter">{letter}</span>
              <span className="question-option__text">{choice}</span>
            </label>
          );
        })}
      </div>

      <div className="question-card__footer">
        {!submitted ? (
          <p className="question-card__hint">
            {selectedAnswer
              ? `Đã chọn: ${selectedAnswer}`
              : "Chọn 1 đáp án để tiếp tục"}
          </p>
        ) : (
          <div className="question-result">
            <p
              className={`question-result__status ${
                isCorrect
                  ? "question-result__status--correct"
                  : "question-result__status--wrong"
              }`}
            >
              {isCorrect ? "✅ Chính xác" : "❌ Chưa đúng"}
            </p>

            <p className="question-result__answer">
              <strong>Đáp án đúng:</strong> {question.answer}
            </p>

            {question.explanation && (
              <div className="question-result__box">
                <strong>Giải thích:</strong>
                <p>{question.explanation}</p>
              </div>
            )}

            {question.betterApproach && (
              <div className="question-result__box question-result__box--blue">
                <strong>Mẹo / hướng cải thiện:</strong>
                <p>{question.betterApproach}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
