import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { difficultyLabels, getProblemBySlug } from "../services/problemService";

function ProblemWorkspace({ problem, initialLang }) {
  const [language, setLanguage] = useState(initialLang === "python" ? "python" : "cpp");
  const [drafts, setDrafts] = useState({ ...problem.starterCode });

  return (
    <div className="problem-page">
      <Link to="/practice">← Danh sách bài tập</Link>
      <div className="problem-workspace">
        <article className="problem-statement">
          <h1>{problem.title}</h1>
          <div className="problem-tags">
            <span className={`difficulty-badge difficulty-badge--${problem.difficulty}`}>
              {difficultyLabels[problem.difficulty]}
            </span>
            <span className="problem-meta">{problem.chapterId.toUpperCase()} · Cấp độ {problem.level}</span>
            {problem.tags.map((tag) => <span className="question-tag" key={tag}>{tag}</span>)}
          </div>
          <h2>Đề bài</h2>
          <p className="problem-text">{problem.statement}</p>
          <h2>Dữ liệu vào</h2>
          <p className="problem-text">{problem.inputDescription}</p>
          <h2>Dữ liệu ra</h2>
          <p className="problem-text">{problem.outputDescription}</p>
          <h2>Ràng buộc</h2>
          <ul>{problem.constraints.map((constraint, index) => <li key={index}>{constraint}</li>)}</ul>
          <h2>Ví dụ</h2>
          {problem.samples.map((sample, index) => (
            <section className="problem-sample" key={index}>
              <h3>Ví dụ {index + 1}</h3>
              <h4>Input</h4><pre>{sample.input}</pre>
              <h4>Output</h4><pre>{sample.output}</pre>
              {sample.explanation && <p className="problem-text">{sample.explanation}</p>}
            </section>
          ))}
          {problem.hints.length > 0 && <details className="problem-hints">
            <summary>Gợi ý</summary>
            <ol>{problem.hints.map((hint, index) => <li key={index}>{hint}</li>)}</ol>
          </details>}
        </article>
        <section className="problem-editor" aria-label="Khu vực viết code">
          <div className="problem-editor__toolbar">
            <label htmlFor="code-language">Ngôn ngữ</label>
            <select id="code-language" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
          </div>
          <label className="problem-editor__label" htmlFor="problem-code">Code nháp</label>
          <textarea id="problem-code" spellCheck={false} value={drafts[language] ?? ""}
            onChange={(event) => setDrafts({ ...drafts, [language]: event.target.value })} />
          <p className="problem-editor__note">Khu vực code tạm thời. Code nháp chỉ giữ khi đang mở bài; chạy và chấm bài sẽ được bổ sung sau.</p>
          <div className="problem-editor__actions">
            <button type="button" disabled>Chạy code</button>
            <button type="button" disabled>Nộp bài</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Problem({ lang }) {
  const { slug } = useParams();
  const problem = getProblemBySlug(slug);
  if (!problem) return (
    <section>
      <h1>Không tìm thấy bài tập</h1>
      <p>Bài tập này chưa có trong Problem Bank.</p>
      <Link to="/practice">Về danh sách bài tập</Link>
    </section>
  );
  return <ProblemWorkspace key={problem.slug} problem={problem} initialLang={lang} />;
}
