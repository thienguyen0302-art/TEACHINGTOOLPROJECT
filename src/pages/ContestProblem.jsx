import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadContest, loadContestProblem, judgeContest } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { contestPhase } from '../utils/contest.js';
import ProblemStatement from '../components/ProblemStatement.jsx';
import JudgeResults from '../components/JudgeResults.jsx';
import { ContestCountdown, ContestError, ContestNavigation } from '../components/ContestUI.jsx';
import './ProblemBank.css';
import './Contest.css';
const CodeEditor = lazy(() => import('../components/CodeEditor.jsx'));
function Workspace({ contest, problem, lang }) {
  const [language, setLanguage] = useState(problem.allowedLanguages.includes(lang) ? lang : problem.allowedLanguages[0]);
  const [drafts, setDrafts] = useState({ ...problem.starterCode });
  const [stdin, setStdin] = useState(problem.samples[0]?.input ?? '');
  const [submission, setSubmission] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const request = useRef(null);
  const { phase } = useContestClock(contest);
  useEffect(() => () => request.current?.abort(), []);
  const entry = contest.problems.find((p) => p.problemId === problem.id);
  async function execute(mode) {
    if (request.current || phase !== 'running') return;
    const controller = new AbortController(); request.current = controller;
    setBusy(mode); setError(''); setSubmission(null);
    try {
      const result = await judgeContest({ contestId: contest.id, problemId: problem.id, language, source: drafts[language], mode, stdin, signal: controller.signal });
      if (!controller.signal.aborted) setSubmission({ ...result, language });
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setBusy(''); }
  }
  return <div className="content contest-ui bank-ui"><Link to={`/contest/${contest.id}`}>← {contest.title}</Link><header className="contest-heading"><h1>Bài {entry.label} · {entry.points} điểm</h1><ContestCountdown contest={contest} /></header><ContestNavigation id={contest.id} /><div className="problem-workspace"><article className="problem-statement bank-panel"><div className="bank-statement-body"><h1>{problem.title}</h1><ProblemStatement problem={problem} /></div></article><section className="problem-editor bank-panel" aria-label="Code contest"><div className="bank-panel__bar"><b>Monaco · Bài {entry.label}</b></div><div className="problem-editor__toolbar"><label htmlFor="contest-language">Ngôn ngữ</label><select id="contest-language" value={language} disabled={!!busy} onChange={(e) => setLanguage(e.target.value)}>{problem.allowedLanguages.map((l) => <option key={l} value={l}>{l === 'cpp' ? 'C++' : 'Python'}</option>)}</select></div><div className="bank-code-area"><Suspense fallback={<p className="bank-editor-loading">Đang tải editor…</p>}><CodeEditor language={language} value={drafts[language] ?? ''} onChange={(value) => setDrafts((previous) => ({ ...previous, [language]: value }))} /></Suspense></div><div className="bank-execution"><label htmlFor="contest-stdin">Input chạy thử</label><textarea id="contest-stdin" className="judge-input" rows={4} value={stdin} onChange={(e) => setStdin(e.target.value)} maxLength={20000} />{phase !== 'running' && <p role="status">Contest đã kết thúc. Bạn vẫn xem được đề, lịch sử và leaderboard.</p>}<div className="problem-editor__actions"><button disabled={!!busy || phase !== 'running' || !drafts[language]?.trim()} onClick={() => execute('run')}>{busy === 'run' ? 'Đang chạy…' : 'Run Code'}</button><button className="bank-submit" disabled={!!busy || phase !== 'running' || !drafts[language]?.trim()} onClick={() => execute('submit')}>{busy === 'submit' ? 'Đang chấm…' : 'Submit'}</button></div>{submission?.mode === 'submit' && <p className="contest-total">{submission.status} · {submission.earnedPoints} / {entry.points} điểm. <Link to={`/contest/${contest.id}/scoreboard`}>Xem leaderboard →</Link></p>}<JudgeResults busy={busy} error={error} submission={submission} /></div></section></div></div>;
}
export default function ContestProblem({ lang }) {
  const { contestId, problemId } = useParams();
  const loader = useCallback(async () => {
    const contest = await loadContest(contestId);
    return { contest, problem: contestPhase(contest) === 'upcoming' ? null : await loadContestProblem(contestId, problemId) };
  }, [contestId, problemId]);
  const state = useContestData(loader);
  if (!state.value) return <ContestError state={state} />;
  if (!state.value.problem) return <div className="content contest-ui"><h1>Contest chưa bắt đầu</h1><p>Đề bài mở khi contest bắt đầu.</p><button onClick={state.refresh}>Kiểm tra lại</button></div>;
  return <Workspace key={`${contestId}:${problemId}`} {...state.value} lang={lang} />;
}
