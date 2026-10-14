import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LessonPractice from "../components/LessonPractice";
import LessonSummary from "../components/LessonSummary";
import LessonTheory from "../components/LessonTheory";
import { auth } from "../services/firebase";
import { loadChapter } from "../services/contentService";
import { saveProgress } from "../services/progressService";
import { calculateScore, countAnswered } from "../utils/grading";
import "./Lesson.css";

const TABS = [["overview", "Tổng quan"], ["theory", "Lý thuyết"], ["practice", "Thực hành"], ["summary", "Tổng kết"]];

function LessonOverview({ chapter }) {
  return <section className="lesson-overview" aria-labelledby="lesson-overview-title">
    <div className="lesson-section-heading"><span>BẮT ĐẦU</span><h3 id="lesson-overview-title">Em sẽ học gì trong chương này?</h3></div>
    <p className="lesson-overview__description">{chapter.description}</p>
    <div className="lesson-overview__columns">
      <section><h4>Mục tiêu học tập</h4><ul>{chapter.objectives.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
      <section><h4>Kiến thức cần có trước</h4><ul>{chapter.prerequisites.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
    </div>
    {chapter.references?.length > 0 && <section className="lesson-references"><h4>Nguồn tham khảo và đọc thêm</h4><p>Nội dung tiếng Việt, bài tập và minh họa được biên soạn cho lộ trình này.</p><ul>{chapter.references.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></section>}
  </section>;
}

function LessonBody({ lang }) {
  const { id } = useParams();
  return <LessonContent key={`${lang}:${id}`} lang={lang} id={id} />;
}

function LessonContent({ lang, id }) {
  const [chapter, setChapter] = useState(undefined);
  const [tab, setTab] = useState("overview");
  const [practiceMode, setPracticeMode] = useState("quiz");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    let active = true;
    loadChapter(lang, id).then((result) => { if (active) setChapter(result); });
    return () => { active = false; };
  }, [lang, id]);

  if (chapter === undefined) return <p>Đang tải bài học...</p>;
  if (chapter === null) return <p>Không tìm thấy chương này.</p>;

  const questions = chapter.quiz ?? [];
  const answeredCount = countAnswered(questions, answers);
  const score = calculateScore(questions, answers);
  const canSubmit = score.total > 0 && answeredCount === score.total;

  function handleSelect(questionId, choice) {
    if (!submitted) setAnswers((previous) => ({ ...previous, [questionId]: choice }));
  }

  function resetQuiz() {
    setAnswers({});
    setSubmitted(false);
    setSaveStatus("");
  }

  async function handleSubmitQuiz(currentScore) {
    if (!canSubmit) return;
    setSubmitted(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaveStatus("saving");
    try {
      await saveProgress(uid, id, { language: lang, chapterId: id, quizScore: currentScore.percentage, correct: currentScore.correct, total: currentScore.total });
      setSaveStatus("saved");
    } catch (error) {
      console.error("Lỗi lưu tiến độ:", error);
      setSaveStatus("error");
    }
  }

  return <div>
    <header className="lesson-heading"><p>CHƯƠNG {chapter.order}</p><h2>{chapter.title}</h2></header>
    <nav className="tabs lesson-tabs" aria-label="Nội dung chương">
      {TABS.map(([key, label]) => <button type="button" key={key} className={tab === key ? "on" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>{label}</button>)}
    </nav>
    {tab === "overview" && <LessonOverview chapter={chapter} />}
    {tab === "theory" && <LessonTheory chapter={chapter} language={lang} />}
    {tab === "practice" && <LessonPractice chapter={chapter} language={lang} practiceMode={practiceMode} setPracticeMode={setPracticeMode} answers={answers} submitted={submitted} saveStatus={saveStatus} answeredCount={answeredCount} score={score} canSubmit={canSubmit} onSelect={handleSelect} onSubmit={handleSubmitQuiz} onReset={resetQuiz} />}
    {tab === "summary" && <LessonSummary chapter={chapter} />}
  </div>;
}

export default function Lesson({ lang }) {
  return <div className="content lesson-page"><LessonBody lang={lang} /></div>;
}
