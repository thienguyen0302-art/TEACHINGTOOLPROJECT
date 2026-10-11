import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { difficultyLabels, getProblemBySlug } from "../services/problemService";
import "./ProblemBank.css";
import JudgeResults from "../components/JudgeResults";
import { judgeCode } from "../services/judgeService";

const CodeEditor = lazy(() => import("../components/CodeEditor"));

const tabs = [
  { id: "statement", label: "Đề bài", icon: "≡" },
  { id: "hints", label: "Gợi ý", icon: "✧" },
];

function ProblemStatement({ problem }) {
  return (
    <>
      <p className="problem-text">{problem.statement}</p>
      <h2>Dữ liệu vào</h2>
      <p className="problem-text">{problem.inputDescription}</p>
      <h2>Dữ liệu ra</h2>
      <p className="problem-text">{problem.outputDescription}</p>
      <h2>Ví dụ</h2>
      {problem.samples.map((sample, index) => (
        <section className="problem-sample" key={index}>
          <h3>Ví dụ {index + 1}</h3>
          <div className="bank-sample-code">
            <div><h4>Input</h4><pre><code>{sample.input}</code></pre></div>
            <div><h4>Output</h4><pre><code>{sample.output}</code></pre></div>
          </div>
          {sample.explanation && (
            <p className="problem-text"><b>Giải thích: </b>{sample.explanation}</p>
          )}
        </section>
      ))}
      <h2>Ràng buộc</h2>
      <ul className="bank-constraints">
        {problem.constraints.map((constraint, index) => (
          <li key={index}><code>{constraint}</code></li>
        ))}
      </ul>
    </>
  );
}

function ProblemHints({ hints }) {
  return (
    <div className="bank-hints">
      <p>Thử tự giải trước khi mở từng gợi ý nhé.</p>
      {hints.length > 0 ? hints.map((hint, index) => (
        <details key={index}>
          <summary>Gợi ý {index + 1}</summary>
          <p>{hint}</p>
        </details>
      )) : <p>Bài này chưa có gợi ý.</p>}
    </div>
  );
}

function ProblemWorkspace({ problem, initialLang }) {
  const [language, setLanguage] = useState(initialLang === "python" ? "python" : "cpp");
  const [drafts, setDrafts] = useState({ ...problem.starterCode });
  const [activeTab, setActiveTab] = useState("statement");
  const [stdin, setStdin] = useState(problem.samples[0]?.input ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);
  const requestRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function execute(mode) {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(mode);
    setError("");
    setSubmission(null);
    try {
      const result = await judgeCode({ slug: problem.slug, source: drafts[language], language, mode, stdin, signal: controller.signal });
      if (!controller.signal.aborted) setSubmission({ ...result, language });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setBusy("");
    }
  }
  const tabRefs = useRef([]);
  const prefix = useId();
  const lineCount = (drafts[language] ?? "").split("\n").length;
  const languageId = `${prefix}-language`;
  const noteId = `${prefix}-note`;

  function handleTabKeyDown(event, index) {
    let nextIndex;
    switch (event.key) {
      case "ArrowRight": nextIndex = (index + 1) % tabs.length; break;
      case "ArrowLeft": nextIndex = (index + tabs.length - 1) % tabs.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="problem-page bank-ui">
      <nav className="workspace-nav" aria-label="Điều hướng bài tập">
        <Link to="/practice">← Danh sách bài tập</Link>
        <span>{problem.id}</span>
        <span className="workspace-nav__language">C++ / Python</span>
      </nav>
      <div className="problem-workspace">
        <article className="problem-statement bank-panel">
          <div className="bank-panel__bar" role="tablist" aria-label="Nội dung bài tập">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                ref={(element) => { tabRefs.current[index] = element; }}
                id={`${prefix}-${tab.id}-tab`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${prefix}-${tab.id}-panel`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span className="bank-tab-icon" aria-hidden="true">{tab.icon}</span> {tab.label}
                {tab.id === "hints" && <> <span>{problem.hints.length}</span></>}
              </button>
            ))}
          </div>
          <div className="bank-statement-body">
            <h1>{problem.title}</h1>
            <div className="problem-tags">
              <span className={`difficulty-badge difficulty-badge--${problem.difficulty}`}>
                {difficultyLabels[problem.difficulty]}
              </span>
              <span className="problem-meta">
                Chương {Number(problem.chapterId.slice(2))} · Cấp độ {problem.level}
              </span>
            </div>
            <div className="bank-row-tags">
              {problem.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                id={`${prefix}-${tab.id}-panel`}
                role="tabpanel"
                aria-labelledby={`${prefix}-${tab.id}-tab`}
                hidden={activeTab !== tab.id}
                tabIndex={0}
              >
                {tab.id === "statement"
                  ? <ProblemStatement problem={problem} />
                  : <ProblemHints hints={problem.hints} />}
              </div>
            ))}
          </div>
        </article>
        <section className="problem-editor bank-panel" aria-label="Khu vực viết code">
          <div className="bank-panel__bar">
            <span className="bank-code-heading"><span aria-hidden="true">〈/〉</span> Code</span>
            <span className="bank-draft-badge">Bản nháp</span>
          </div>
          <div className="problem-editor__toolbar">
            <label className="bank-sr-only" htmlFor={languageId}>Ngôn ngữ</label>
            <select id={languageId} value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
            <span>UTF-8</span>
          </div>
          <div className="bank-code-area" role="region" aria-label="Code nháp" aria-describedby={noteId}>
            <Suspense fallback={<div className="bank-editor-loading" role="status">Đang tải trình soạn thảo code…</div>}>
              <CodeEditor
                language={language}
                value={drafts[language] ?? ""}
                onChange={(value) =>
                  setDrafts((previous) => ({
                    ...previous,
                    [language]: value,
                  }))
                }
              />
            </Suspense>
          </div>
          <div className="bank-editor-footer">
            <span>{language === "cpp" ? "C++" : "Python"}</span><span>{lineCount} dòng</span>
          </div>
          <div className="bank-execution">
            <h2>Chạy & nộp bài</h2>
            <p id={noteId} className="problem-editor__note">
              Chạy code với input bên dưới. Nộp bài để chấm ví dụ và test ẩn, tính điểm trên 100. Bản nháp chỉ giữ khi đang mở bài.
            </p>
            <label htmlFor={`${prefix}-stdin`}>Input chạy thử</label>
            <textarea id={`${prefix}-stdin`} className="judge-input" value={stdin} maxLength={10000} onChange={(event) => setStdin(event.target.value)} rows={4} spellCheck={false} />
            <div className="problem-editor__actions">
              <button type="button" disabled={Boolean(busy) || !drafts[language]?.trim()} onClick={() => execute("run")}>{busy === "run" ? "Đang chạy…" : "▷ Chạy code"}</button>
              <button className="bank-submit" type="button" disabled={Boolean(busy) || !drafts[language]?.trim()} onClick={() => execute("submit")}>{busy === "submit" ? "Đang chấm…" : "Nộp bài ↑"}</button>
            </div>
            <JudgeResults busy={busy} error={error} submission={submission} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Problem({ lang }) {
  const { slug } = useParams();
  const problem = getProblemBySlug(slug);
  if (!problem) {
    return (
      <section className="bank-ui bank-empty">
        <h1>Không tìm thấy bài tập</h1>
        <p>Bài tập này chưa có trong Problem Bank.</p>
        <Link className="bank-outline-link" to="/practice">Về danh sách bài tập</Link>
      </section>
    );
  }
  return <ProblemWorkspace key={problem.slug} problem={problem} initialLang={lang} />;
}
