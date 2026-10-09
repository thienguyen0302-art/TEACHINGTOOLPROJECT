import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadChapter } from "../services/contentService";
import QuestionCard from "../components/QuestionCard";
import { calculateScore, countAnswered } from "../utils/grading";
import StepVisualizer from "../components/StepVisualizer";
import ProblemCard from "../components/ProblemCard";

const COL = {
  type: "Kiểu", purpose: "Công dụng", typicalRange: "Khoảng giá trị",
  example: "Ví dụ", operator: "Toán tử", meaning: "Ý nghĩa",
  concept: "Khái niệm", cpp: "C++", python: "Python",
};

// [tên trường, nhãn, kiểu hiển thị]; thứ tự là thứ tự hiện trên trang
const FIELDS = [
  ["example", "Ví dụ", "text"],
  ["exampleInput", "Input mẫu", "code"],
  ["template", "Mẫu code", "code"],
  ["code", "Code", "code"],
  ["output", "Output", "code"],
  ["result", "Kết quả", "code"],
  ["typicalOutput", "Output thường gặp", "code"],
  ["trapExample", "Ví dụ dễ sai", "code"],
  ["trapResult", "Kết quả của ví dụ dễ sai", "text"],
  ["dangerCode", "Code nguy hiểm", "code"],
  ["correctCode", "Code đúng", "code"],
  ["table", "", "table"],
  ["steps", "Các bước", "list"],
  ["strategy", "Chiến lược", "list"],
  ["applications", "Ứng dụng", "list"],
  ["commonMistakes", "Lỗi thường gặp", "list"],
  ["explanation", "Giải thích", "text"],
  ["cppComparison", "So sánh với C++", "text"],
  ["warning", "Lưu ý", "warn"],
  ["hsgNote", "Ghi chú HSG", "note"],
];

function Table({ rows }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  return (
    <table>
      <thead><tr>{keys.map((k) => <th key={k}>{COL[k] || k}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{keys.map((k) => <td key={k}>{String(r[k] ?? "")}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Field({ label, kind, value }) {
  if (kind === "code")
    return <><h4>{label}</h4><pre><code>{value}</code></pre></>;
  if (kind === "text")
    return <p><b>{label}:</b> {value}</p>;
  if (kind === "list")
    return <><h4>{label}</h4><ul>{value.map((x, i) => <li key={i}>{x}</li>)}</ul></>;
  if (kind === "table") return <Table rows={value} />;
  if (kind === "warn")
    return <div className="callout warn"><b>{label}:</b> {value}</div>;
  return <div className="callout"><b>{label}:</b> {value}</div>;
}

function Theory({ items }) {
  return <div className="theory-reader">
    <nav className="theory-reader__contents" aria-label="Mục lục lý thuyết"><b>Trong bài này</b><ol>{items.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.title.replace(/^\d+\.\s*/, "")}</a></li>)}</ol></nav>
    {items.map((t) => (
    <article className="card theory-article" id={t.id} key={t.id}>
      <div className="theory-article__heading"><span>LÝ THUYẾT</span><h3>{t.title}</h3></div>
      <p className="theory-article__intro">{t.content}</p>
      {t.sections?.map((section, i) => <section className="theory-section" key={i}><h4>{section.title}</h4>{section.paragraphs?.map((paragraph, j) => <p key={j}>{paragraph}</p>)}{section.bullets?.length > 0 && <ul>{section.bullets.map((text, j) => <li key={j}>{text}</li>)}</ul>}</section>)}
      {FIELDS.map(([k, label, kind]) =>
        t[k] ? <Field key={k} label={label} kind={kind} value={t[k]} /> : null
      )}
      {t.visualization && <StepVisualizer key={t.id} visualization={t.visualization} />}
      {t.selfCheck && <div className="theory-self-check"><span>TỰ KIỂM TRA</span><p>{t.selfCheck.question}</p><details><summary>Đối chiếu cách hiểu</summary><p>{t.selfCheck.answer}</p></details></div>}
    </article>
  ))}</div>;
}

function Examples({ items }) {
  return items.map((e) => (
    <div className="card" key={e.id}>
      <h3>{e.title}<span className="badge">{e.difficulty}</span></h3>
      <p>{e.description}</p>
      <pre><code>{e.code}</code></pre>
      {e.input && <Field label="Input" kind="code" value={e.input} />}
      {e.output && <Field label="Output" kind="code" value={e.output} />}
      <p><b>Giải thích:</b> {e.explanation}</p>
      {e.complexity && (
        <p><b>Độ phức tạp:</b> thời gian {e.complexity.time}, bộ nhớ {e.complexity.space}</p>
      )}
      {e.wrongCode && <Field label="Code sai" kind="code" value={e.wrongCode} />}
      {e.correctCode && <Field label="Code đúng" kind="code" value={e.correctCode} />}
      {e.hsgLesson && <Field label="Bài học HSG" kind="note" value={e.hsgLesson} />}
    </div>
  ));
}

function LessonBody({ lang }) {
  const { id } = useParams();
  return <LessonContent key={`${lang}:${id}`} lang={lang} id={id} />;
}

function LessonContent({ lang, id }) {
  const [ch, setCh] = useState(undefined); // undefined = đang tải, null = không có
  const [tab, setTab] = useState("overview");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleSelect(questionId, choice) {
    if (submitted) return;
    setAnswers((previous) => ({ ...previous, [questionId]: choice }));
  }

  function resetQuiz() {
    setAnswers({});
    setSubmitted(false);
  }

  useEffect(() => {
    let on = true;
    loadChapter(lang, id).then((c) => on && setCh(c));
    return () => { on = false; };
  }, [lang, id]);

  if (ch === undefined) return <p>Đang tải bài học...</p>;
  if (ch === null) return <p>Không tìm thấy chương này.</p>;

  const questions = ch.quiz ?? [];
  const answeredCount = countAnswered(questions, answers);
  const score = calculateScore(questions, answers);
  const canSubmit = score.total > 0 && answeredCount === score.total;

  const tabs = [
    ["overview", "Tổng quan"], ["theory", "Lý thuyết"], ["examples", "Ví dụ"],
    ["quiz", "Quiz"],
    ["practice", "Luyện tập"], ["advanced", "Nâng cao HSG"],
    ["mistakes", "Lỗi thường gặp"], ["summary", "Tóm tắt"],
  ];

  return (
    <div>
      <h2>Chương {ch.order}: {ch.title}</h2>
      <div className="tabs">
        {tabs.map(([k, name]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {name}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <p>{ch.description}</p>
          <h4>Mục tiêu học tập</h4>
          <ul>{ch.objectives.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <h4>Kiến thức cần có trước</h4>
          <ul>{ch.prerequisites.map((x, i) => <li key={i}>{x}</li>)}</ul>
          {ch.references?.length > 0 && (
            <><h4>Nguồn tham khảo và đọc thêm</h4>
              <p>Nội dung tiếng Việt, bài tập và minh họa được biên soạn cho lộ trình này.</p>
              <ul>{ch.references.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
            </>
          )}
        </div>
      )}
      {tab === "theory" && <Theory items={ch.theory} />}
      {tab === "examples" && <Examples items={ch.examples} />}
      {(tab === "practice" || tab === "advanced") && (
        <section aria-label={tab === "advanced" ? "Bài tập nâng cao HSG" : "Bài luyện tập"}>
          <p>Viết và chạy chương trình trên máy của em. Mở gợi ý khi cần, rồi đối chiếu lời giải sau khi tự làm.</p>
          {(ch[tab] ?? []).map((problem) => <ProblemCard key={problem.id} problem={problem} />)}
          {!ch[tab]?.length && <p>Chưa có bài tập trong phần này.</p>}
        </section>
      )}
      {tab === "quiz" && (
        <section aria-label="Quiz của chương">
          {questions.length === 0 ? <p>Chương này chưa có câu hỏi Quiz.</p> : (
            <>
              <div className="callout" role="status">
                {submitted ? (
                  <><b>Kết quả: {score.correct}/{score.total} câu đúng ({score.percentage}%).</b>
                    <p>Xem đáp án và giải thích bên dưới, hoặc làm lại để ôn tập.</p></>
                ) : (
                  <><b>Đã trả lời {answeredCount}/{questions.length} câu.</b>
                    <p>Chọn một đáp án cho mỗi câu rồi nộp bài để xem kết quả.</p></>
                )}
              </div>
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  selectedAnswer={answers[question.id]}
                  onSelect={(choice) => handleSelect(question.id, choice)}
                  submitted={submitted}
                />
              ))}
              <div className="quiz-actions">
                {!submitted && (
                  <button type="button" disabled={!canSubmit} onClick={() => { if (canSubmit) setSubmitted(true); }}>
                    Nộp bài
                  </button>
                )}
                <button type="button" disabled={!submitted && answeredCount === 0} onClick={resetQuiz}>Làm lại</button>
                {!submitted && !canSubmit && <p>Còn {questions.length - answeredCount} câu chưa trả lời.</p>}
              </div>
            </>
          )}
        </section>
      )}
      {tab === "mistakes" && (
        <div>
          {ch.commonMistakes.map((m, i) => (
            <div className="card" key={i}>
              <p><b>Lỗi:</b> {m.mistake}</p>
              <p><b>Cách sửa:</b> {m.fix}</p>
            </div>
          ))}
          {ch.cppVsPython && (
            <>
              <h4>So sánh C++ và Python</h4>
              <Table rows={ch.cppVsPython} />
            </>
          )}
        </div>
      )}
      {tab === "summary" && (
        <ul>{ch.chapterSummary.map((x, i) => <li key={i}>{x}</li>)}</ul>
      )}
    </div>
  );
}

export default function Lesson({ lang }) {
  return (
    <div className="content lesson-page">
      <LessonBody lang={lang} />
    </div>
  );
}
