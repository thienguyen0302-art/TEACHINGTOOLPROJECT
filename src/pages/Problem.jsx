import {useCallback} from 'react';
import useContestData from '../hooks/useContestData.js';
import {loadPracticeProblem,judgePractice} from '../services/contestService.js';
import ProblemStatement from "../components/ProblemStatement";
import SubmissionProgress from "../components/SubmissionProgress";
import useSubmissionProgress from "../hooks/useSubmissionProgress";
import { currentJudgeResult } from "../services/submissionService";
import AITutorPanel from "../components/AITutorPanel";
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { difficultyLabels, getProblemBySlug } from "../services/problemService";
import "./ProblemBank.css";
import JudgeResults from "../components/JudgeResults";
import { judgeCode } from "../services/judgeService";

const CodeEditor = lazy(() => import("../components/CodeEditor"));

function ProblemHints({ hints }) {
  if (!hints || hints.length === 0) return null;
  return (
    <div className="bank-hints">
      <h2>Gợi ý giải bài</h2>
      <p className="bank-hints__tip">Thử tự giải trước khi mở từng gợi ý nhé.</p>
      {hints.map((hint, index) => (
        <details key={index} className="bank-hint-item">
          <summary>Gợi ý {index + 1}</summary>
          <div className="bank-hint-content">
            <p>{hint}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

function ProblemWorkspace({ problem, initialLang }) {
  const [language, setLanguage] = useState(problem.allowedLanguages?.includes(initialLang) ? initialLang : problem.allowedLanguages?.[0] ?? (initialLang === "python" ? "python" : "cpp"));
  const [drafts, setDrafts] = useState({ ...problem.starterCode });
  const [stdin, setStdin] = useState(problem.samples[0]?.input ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);
  const progress = useSubmissionProgress({ problemId: problem.id, slug: problem.practicePublished ? `practice/${problem.id}` : problem.slug, chapterId: problem.chapterId ?? "practice", language });
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
      const result = await (problem.practicePublished ? judgePractice : judgeCode)({ problemId:problem.id, slug: problem.slug, source: drafts[language], language, mode, stdin, signal: controller.signal });
      if (!controller.signal.aborted) {
        setSubmission({ ...result, language, judgedSource: drafts[language] });
        // A persistence/normalization issue must not turn a Judge verdict into an error.
        if (mode === 'submit') {
          try { progress.record(result); } catch { /* Invalid result: no fake progress event. */ }
        }
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setBusy("");
    }
  }
  const prefix = useId();
  const lineCount = (drafts[language] ?? "").split("\n").length;
  const languageId = `${prefix}-language`;
  const noteId = `${prefix}-note`;

  return (
    <div className="problem-page bank-ui">
      <nav className="workspace-nav" aria-label="Điều hướng bài tập">
        <Link to="/practice">← Danh sách bài tập</Link>
        <span>{problem.id}</span>
        <span className="workspace-nav__language">C++ / Python</span>
      </nav>
      <div className="problem-workspace">
        <article className="problem-statement bank-panel">
          <div className="bank-panel__bar">
            <span className="bank-code-heading"><span aria-hidden="true">≡</span> Đề bài</span>
            {problem.hints?.length > 0 && (
              <span className="bank-draft-badge">{problem.hints.length} gợi ý bên dưới</span>
            )}
          </div>
          <div className="bank-statement-body">
            <h1>{problem.title}</h1>
            <div className="problem-tags">
              <span className={`difficulty-badge difficulty-badge--${problem.difficulty}`}>
                {difficultyLabels[problem.difficulty]}
              </span>
              <span className="problem-meta">
                {problem.practicePublished?'Bài tập do giáo viên đăng':`Chương ${Number(problem.chapterId.slice(2))} · Cấp độ ${problem.level}`}
              </span>
            </div>
            <div className="bank-row-tags">
              {problem.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <ProblemStatement problem={problem} />

            <ProblemHints hints={problem.hints} />
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
              {(!problem.allowedLanguages||problem.allowedLanguages.includes("cpp"))&&<option value="cpp">C++</option>}
              {(!problem.allowedLanguages||problem.allowedLanguages.includes("python"))&&<option value="python">Python</option>}
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
            <SubmissionProgress entry={progress.entry} />
            <JudgeResults busy={busy} error={error} submission={submission} />
            {!problem.practicePublished&&<AITutorPanel slug={problem.slug} language={language} source={drafts[language] ?? ""} judgeBusy={Boolean(busy)} judgeResult={currentJudgeResult(submission, drafts[language], language)} />}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Problem({ lang }) {
  const { slug, problemId } = useParams();
  const loader=useCallback(()=>problemId?loadPracticeProblem(problemId):Promise.resolve(null),[problemId]);
  const bank=useContestData(loader);
  if(problemId&&bank.loading)return <div className="content" role="status">Đang tải bài tập…</div>;
  if(problemId&&bank.error)return <div className="content"><p role="alert">{bank.error}</p><Link to="/practice">Về kho bài tập</Link></div>;
  const problem = problemId ? {...bank.value,hints:[]} : getProblemBySlug(slug);
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
