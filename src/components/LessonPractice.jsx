import ProblemCard from "./ProblemCard";
import QuestionCard from "./QuestionCard";

export default function LessonPractice({ chapter, language, practiceMode, setPracticeMode, answers, submitted, saveStatus, answeredCount, score, canSubmit, onSelect, onSubmit, onReset }) {
  const questions = chapter.quiz ?? [];
  return <section className="lesson-practice" aria-labelledby="practice-title">
    <div className="lesson-section-heading"><span>THỰC HÀNH</span><h3 id="practice-title">Kiểm tra rồi vận dụng</h3></div>
    <div className="lesson-subtabs" role="group" aria-label="Chọn hình thức thực hành">
      <button type="button" aria-pressed={practiceMode === "quiz"} className={practiceMode === "quiz" ? "on" : ""} onClick={() => setPracticeMode("quiz")}>Kiểm tra lý thuyết</button>
      <button type="button" aria-pressed={practiceMode === "coding"} className={practiceMode === "coding" ? "on" : ""} onClick={() => setPracticeMode("coding")}>Bài tập lập trình</button>
    </div>
    {practiceMode === "quiz" && <div aria-label="Kiểm tra lý thuyết">
      {questions.length === 0 ? <p>Chương này chưa có câu hỏi Quiz.</p> : <>
        <div className="callout" role="status">{submitted ? <><b>Kết quả: {score.correct}/{score.total} câu đúng ({score.percentage}%).</b><p>Xem đáp án và giải thích bên dưới, hoặc làm lại để ôn tập.</p>{saveStatus === "saving" && <p className="quiz-save-status"><em>Đang đồng bộ tiến độ học tập...</em></p>}{saveStatus === "saved" && <p className="quiz-save-status text-success"><strong>✓ Đã cập nhật kết quả vào hồ sơ học tập.</strong></p>}{saveStatus === "error" && <p className="quiz-save-status text-warning">Chưa đồng bộ được với máy chủ (vẫn xem được giải thích bên dưới).</p>}</> : <><b>Đã trả lời {answeredCount}/{questions.length} câu.</b><p>Chọn một đáp án cho mỗi câu rồi nộp bài để xem kết quả.</p></>}</div>
        {questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} selectedAnswer={answers[question.id]} onSelect={(choice) => onSelect(question.id, choice)} submitted={submitted} />)}
        <div className="quiz-actions">{!submitted && <button type="button" disabled={!canSubmit} onClick={() => onSubmit(score)}>Nộp bài</button>}<button type="button" disabled={!submitted && answeredCount === 0} onClick={onReset}>Làm lại</button>{!submitted && !canSubmit && <p>Còn {questions.length - answeredCount} câu chưa trả lời.</p>}</div>
      </>}
    </div>}
    {practiceMode === "coding" && <div aria-label="Bài tập lập trình">
      <p>Viết code trực tiếp, chạy thử và nộp bài để Judge0 chấm. Mở gợi ý khi cần, rồi đối chiếu lời giải sau khi tự làm.</p>
      <section className="lesson-problem-group"><h4>Bài luyện tập</h4>{(chapter.practice ?? []).map((problem) => <ProblemCard key={`${language}:${chapter.id}:practice:${problem.id}`} problem={problem} language={language} chapterId={chapter.id} section="practice" />)}{!chapter.practice?.length && <p>Chưa có bài luyện tập.</p>}</section>
      <section className="lesson-problem-group lesson-problem-group--advanced"><h4>Thử thách HSG</h4>{(chapter.advanced ?? []).map((problem) => <ProblemCard key={`${language}:${chapter.id}:advanced:${problem.id}`} problem={problem} language={language} chapterId={chapter.id} section="advanced" />)}{!chapter.advanced?.length && <p>Chưa có bài nâng cao.</p>}</section>
    </div>}
  </section>;
}
