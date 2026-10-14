import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getContest,
  getPublicProblem,
  judgeContest,
} from "../../services/contestService";
import { contestStatus } from "../../utils/contest";
import ProblemStatement from "../../components/ProblemStatement";
import JudgeResults from "../../components/JudgeResults";
import { ContestClock, ContestNav } from "./ContestShared";
import "./Contest.css";
const CodeEditor = lazy(() => import("../../components/CodeEditor"));
function Workspace({ contest, problem, contestId, user }) {
  const [language, setLanguage] = useState(problem.allowedLanguages[0]);
  const draftKey = `contest:${user.uid}:${contestId}:${problem.id}`;
  const [drafts, setDrafts] = useState(() => {
    try {
      return {
        ...problem.starterCode,
        ...JSON.parse(localStorage.getItem(draftKey) || "{}"),
      };
    } catch {
      return { ...problem.starterCode };
    }
  });
  const [stdin, setStdin] = useState(problem.samples[0]?.input ?? "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(() => contestStatus(contest));
  const request = useRef(null);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(drafts));
    } catch {
      /* Storage can be disabled. Draft stays in memory. */
    }
  }, [drafts, draftKey]);
  useEffect(() => () => request.current?.abort(), []);
  async function execute(mode) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(mode);
    setError("");
    setResult(null);
    try {
      const r = await judgeContest(
        {
          contestId,
          problemId: problem.id,
          language,
          source: drafts[language],
          mode,
          stdin,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) setResult({ ...r, language });
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message);
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy("");
    }
  }
  const entry = contest.problems.find((p) => p.problemId === problem.id);
  return (
    <section className="content contest-ui">
      <ContestNav id={contestId} />
      <header className="contest-header">
        <h1>
          {contest.title} · Problem {entry.label} · {entry.points} pts
        </h1>
        <ContestClock contest={contest} onStatus={setStatus} />
      </header>
      <p className="contest-note">
        Contest mode · Tự giải bài bằng C++ hoặc Python. Điểm được lưu sau mỗi
        lần Submit. Bản nháp được giữ trên thiết bị này.
      </p>
      {status === "upcoming" ? (
        <p>Đề bài sẽ mở trong workspace khi contest bắt đầu.</p>
      ) : (
        <div className="contest-workspace">
          <article className="contest-panel">
            <ProblemStatement problem={problem} />
          </article>
          <section className="contest-panel">
            <label>
              Ngôn ngữ
              <select
                disabled={!!busy}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {problem.allowedLanguages.map((l) => (
                  <option key={l} value={l}>
                    {l === "cpp" ? "C++" : "Python"}
                  </option>
                ))}
              </select>
            </label>
            <div className="contest-editor">
              <Suspense fallback={<p>Đang tải Monaco…</p>}>
                <CodeEditor
                  language={language}
                  value={drafts[language] ?? ""}
                  onChange={(v) => setDrafts((p) => ({ ...p, [language]: v }))}
                />
              </Suspense>
            </div>
            <label>
              Input chạy thử
              <textarea
                className="contest-code"
                rows={4}
                maxLength={20000}
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
              />
            </label>
            <div className="contest-actions">
              {["run", "submit"].map((mode) => (
                <button
                  key={mode}
                  className={mode === "submit" ? "contest-primary" : ""}
                  disabled={
                    !!busy || status !== "running" || !drafts[language]?.trim()
                  }
                  onClick={() => execute(mode)}
                >
                  {busy === mode
                    ? "Đang chấm…"
                    : mode === "run"
                      ? "▷ Run"
                      : "Submit ↑"}
                </button>
              ))}
            </div>
            {result?.mode === "submit" && (
              <p>
                Điểm lần nộp: {result.earnedPoints}/{entry.points} ·{" "}
                {result.status}. Mở lịch sử / leaderboard để xem kết quả mới
                nhất.
              </p>
            )}
            <JudgeResults busy={busy} error={error} submission={result} />
          </section>
        </div>
      )}
    </section>
  );
}
export default function ContestProblem({ user }) {
  const { contestId, problemId } = useParams();
  const [state, setState] = useState({
    key: "",
    error: "",
    contest: null,
    problem: null,
  });
  const key = `${contestId}/${problemId}`;
  useEffect(() => {
    let live = true;
    Promise.all([getContest(contestId), getPublicProblem(problemId)])
      .then(([contest, problem]) => {
        if (
          !contest ||
          !problem ||
          !contest.problems.some((p) => p.problemId === problemId)
        )
          throw new Error("Không tìm thấy bài trong contest.");
        if (live) setState({ key, error: "", contest, problem });
      })
      .catch((e) => {
        if (live)
          setState({ key, error: e.message, contest: null, problem: null });
      });
    return () => {
      live = false;
    };
  }, [contestId, problemId, key]);
  if (state.key !== key)
    return <section className="content contest-ui">Đang tải…</section>;
  if (state.error)
    return (
      <section className="content contest-ui">
        <p role="alert">{state.error}</p>
      </section>
    );
  return (
    <Workspace
      key={key}
      contest={state.contest}
      problem={state.problem}
      contestId={contestId}
      user={user}
    />
  );
}
