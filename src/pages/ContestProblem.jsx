import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadContest, loadContestProblem, judgeContest } from '../services/contestService.js';
import { auth } from '../services/firebase.js';
import { recordStudentContestHistory, syncAllContestScores } from '../services/contestRankingService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { contestPhase } from '../utils/contest.js';
import ProblemStatement from '../components/ProblemStatement.jsx';
import JudgeResults from '../components/JudgeResults.jsx';
import { ContestCountdown, ContestError, ContestNavigation } from '../components/ContestUI.jsx';
import './ProblemBank.css';
import './Contest.css';
const CodeEditor = lazy(() => import('../components/CodeEditor.jsx'));
function Workspace({ contest, problem, lang, onRefresh }) {
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
    if (request.current || phase !== 'running') {
      if (phase !== 'running') {
        setError('Contest đã kết thúc hoặc đã đóng. Không thể làm bài hoặc nộp bài lúc này.');
      }
      return;
    }
    const controller = new AbortController(); request.current = controller;
    setBusy(mode); setError(''); setSubmission(null);
    try {
      const result = await judgeContest({ contestId: contest.id, problemId: problem.id, language, source: drafts[language], mode, stdin, signal: controller.signal });
      if (!controller.signal.aborted) {
        setSubmission({ ...result, language });
        if (mode === 'submit') {
          const user = auth.currentUser;
          if (user) {
            recordStudentContestHistory(user.uid, contest.id, {
              contestTitle: contest.title,
              maxScore: (contest.problems || []).reduce((s, p) => s + (p.points || 0), 0),
              lastSubmissionAt: Date.now(),
            }).catch(() => {});
            syncAllContestScores().catch(() => {});
          }
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        if (e.message && e.message.includes('kết thúc')) {
          setError('Contest đã kết thúc (hết thời gian làm bài). Hệ thống đã đóng và không lưu kết quả này.');
        } else {
          setError(e.message);
        }
      }
    }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setBusy(''); }
  }
  return <div className="content contest-ui bank-ui"><Link to={`/contest/${contest.id}`}>← {contest.title}</Link><header className="contest-heading contest-hero"><h1>Bài {entry.label} · {entry.points} điểm</h1><ContestCountdown contest={contest} /></header><ContestNavigation id={contest.id} /><div className="problem-workspace"><article className="problem-statement bank-panel"><div className="bank-statement-body"><h1>{problem.title}</h1><ProblemStatement problem={problem} /></div></article><section className="problem-editor bank-panel" aria-label="Code contest"><div className="bank-panel__bar"><b>Trình soạn thảo · Bài {entry.label}</b></div><div className="problem-editor__toolbar"><label htmlFor="contest-language">Ngôn ngữ</label><select id="contest-language" value={language} disabled={!!busy} onChange={(e) => setLanguage(e.target.value)}>{problem.allowedLanguages.map((l) => <option key={l} value={l}>{l === 'cpp' ? 'C++' : 'Python'}</option>)}</select></div><div className="bank-code-area"><Suspense fallback={<p className="bank-editor-loading">Đang tải editor…</p>}><CodeEditor language={language} value={drafts[language] ?? ''} onChange={(value) => setDrafts((previous) => ({ ...previous, [language]: value }))} /></Suspense></div><div className="bank-execution"><label htmlFor="contest-stdin">Input chạy thử</label><textarea id="contest-stdin" className="judge-input" rows={4} value={stdin} onChange={(e) => setStdin(e.target.value)} maxLength={20000} />{phase === 'ended' && <div style={{padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',color:'#b91c1c',marginBottom:'12px',fontWeight:600,fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}><span>⚠️ Contest đã kết thúc! Hệ thống đã đóng nhận bài. Mọi thao tác nộp sau thời gian này sẽ không được chấm hay lưu kết quả.</span>{onRefresh && <button type="button" onClick={onRefresh} style={{padding:'4px 10px',fontSize:'12px',borderRadius:'6px',border:'1px solid #fca5a5',background:'#fff',color:'#b91c1c',cursor:'pointer',fontWeight:600}}>🔄 Kiểm tra lại trạng thái</button>}</div>}{phase === 'upcoming' && <p role="status">Contest chưa bắt đầu. Đề và trình chấm sẽ mở khi tới giờ.</p>}<div className="problem-editor__actions"><button disabled={!!busy || phase !== 'running' || !drafts[language]?.trim()} onClick={() => execute('run')}>{busy === 'run' ? 'Đang chạy…' : 'Chạy thử'}</button><button className="bank-submit" disabled={!!busy || phase !== 'running' || !drafts[language]?.trim()} onClick={() => execute('submit')}>{busy === 'submit' ? 'Đang chấm…' : 'Nộp bài'}</button></div>{submission?.mode === 'submit' && <p className="contest-total">{submission.status} · {submission.earnedPoints} / {entry.points} điểm. <Link to={`/contest/${contest.id}/scoreboard`}>Xem bảng xếp hạng →</Link></p>}<JudgeResults busy={busy} error={error} submission={submission} /></div></section></div></div>;
}
export default function ContestProblem({ lang }) {
  const { contestId, problemId } = useParams();
  const loader = useCallback(async () => {
    const contest = await loadContest(contestId);
    return { contest, problem: contestPhase(contest) === 'upcoming' ? null : await loadContestProblem(contestId, problemId) };
  }, [contestId, problemId]);
  const state = useContestData(loader, { poll: 10000 });
  if (!state.value) return <ContestError state={state} />;
  if (!state.value.problem) return <div className="content contest-ui"><h1>Contest chưa bắt đầu</h1><p>Đề bài mở khi contest bắt đầu.</p><button onClick={state.refresh}>Kiểm tra lại</button></div>;
  return <Workspace key={`${contestId}:${problemId}`} {...state.value} lang={lang} onRefresh={state.refresh} />;
}
