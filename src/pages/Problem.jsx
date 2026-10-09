import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { difficultyLabels, getProblemBySlug } from "../services/problemService";
import "./ProblemBank.css";

const CodeEditor = lazy(() => import("../components/CodeEditor"));

function ProblemWorkspace({ problem, initialLang }) {
  const [language, setLanguage] = useState(initialLang === "python" ? "python" : "cpp");
  const [drafts, setDrafts] = useState({ ...problem.starterCode });
  const [activeTab, setActiveTab] = useState("statement");
  const lineCount = (drafts[language] ?? "").split("\n").length;

  return (
    <div className="problem-page bank-ui">
      <nav className="workspace-nav" aria-label="Điều hướng bài tập"><Link to="/practice">← Danh sách bài tập</Link><span>{problem.id}</span><span className="workspace-nav__language">C++ / Python</span></nav>
      <div className="problem-workspace">
        <article className="problem-statement bank-panel">
          <div className="bank-panel__bar" role="tablist" aria-label="Nội dung bài tập">
            <button id="statement-tab" role="tab" aria-selected={activeTab === "statement"} aria-controls="problem-panel" tabIndex={activeTab === "statement" ? 0 : -1} onClick={() => setActiveTab("statement")} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "statement" : "hints"; setActiveTab(next); document.getElementById(`${next}-tab`).focus(); } }}>≡ Đề bài</button>
            <button id="hints-tab" role="tab" aria-selected={activeTab === "hints"} aria-controls="problem-panel" tabIndex={activeTab === "hints" ? 0 : -1} onClick={() => setActiveTab("hints")} onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "End" ? "hints" : "statement"; setActiveTab(next); document.getElementById(`${next}-tab`).focus(); } }}>✧ Gợi ý <span>{problem.hints.length}</span></button>
          </div>
          <div id="problem-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`} tabIndex={0} className="bank-statement-body">
            <h1>{problem.title}</h1>
            <div className="problem-tags"><span className={`difficulty-badge difficulty-badge--${problem.difficulty}`}>{difficultyLabels[problem.difficulty]}</span><span className="problem-meta">Chương {Number(problem.chapterId.slice(2))} · Cấp độ {problem.level}</span></div>
            <div className="bank-row-tags">{problem.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            {activeTab === "statement" ? <>
              <p className="problem-text">{problem.statement}</p>
              <h2>Dữ liệu vào</h2><p className="problem-text">{problem.inputDescription}</p>
              <h2>Dữ liệu ra</h2><p className="problem-text">{problem.outputDescription}</p>
              <h2>Ví dụ</h2>{problem.samples.map((sample, index) => <section className="problem-sample" key={index}><h3>Ví dụ {index + 1}</h3><div className="bank-sample-code"><div><h4>Input</h4><pre><code>{sample.input}</code></pre></div><div><h4>Output</h4><pre><code>{sample.output}</code></pre></div></div>{sample.explanation && <p className="problem-text"><b>Giải thích: </b>{sample.explanation}</p>}</section>)}
              <h2>Ràng buộc</h2><ul className="bank-constraints">{problem.constraints.map((constraint, index) => <li key={index}><code>{constraint}</code></li>)}</ul>
            </> : <div className="bank-hints"><p>Thử tự giải trước khi mở từng gợi ý nhé.</p>{problem.hints.length ? problem.hints.map((hint, index) => <details key={index}><summary>Gợi ý {index + 1}</summary><p>{hint}</p></details>) : <p>Bài này chưa có gợi ý.</p>}</div>}
          </div>
        </article>
        <section className="problem-editor bank-panel" aria-label="Khu vực viết code">
          <div className="bank-panel__bar"><span className="bank-code-heading"><span aria-hidden="true">〈/〉</span> Code</span><span className="bank-draft-badge">Bản nháp</span></div>
          <div className="problem-editor__toolbar"><label className="bank-sr-only" htmlFor="code-language">Ngôn ngữ</label><select id="code-language" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="cpp">C++</option><option value="python">Python</option></select><span>UTF-8</span></div>
          <div className="bank-code-area">
            <Suspense fallback={<div className="bank-editor-loading" role="status">Đang tải trình soạn thảo code…</div>}>
              <CodeEditor language={language} value={drafts[language] ?? ""}
                onChange={(value) => setDrafts((previous) => ({ ...previous, [language]: value }))} />
            </Suspense>
          </div>
          <div className="bank-editor-footer"><span>{language === "cpp" ? "C++" : "Python"}</span><span>{lineCount} dòng</span></div>
          <div className="bank-execution"><h2>Chạy & nộp bài</h2><p className="problem-editor__note">Chạy và chấm bài sẽ được bổ sung sau. Bản nháp chỉ giữ khi đang mở bài.</p><div className="problem-editor__actions"><button type="button" disabled>▷ Chạy code</button><button className="bank-submit" type="button" disabled>Nộp bài ↑</button></div></div>
        </section>
      </div>
    </div>
  );
}

export default function Problem({ lang }) {
  const { slug } = useParams();
  const problem = getProblemBySlug(slug);
  if (!problem) return <section className="bank-ui bank-empty"><h1>Không tìm thấy bài tập</h1><p>Bài tập này chưa có trong Problem Bank.</p><Link className="bank-outline-link" to="/practice">Về danh sách bài tập</Link></section>;
  return <ProblemWorkspace key={problem.slug} problem={problem} initialLang={lang} />;
}
