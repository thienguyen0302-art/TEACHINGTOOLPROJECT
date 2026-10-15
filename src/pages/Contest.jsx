import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadContest, loadScoreboard, loadContestSubmissions } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { problemStatus } from '../utils/contest.js';
import { ContestCountdown, ContestError, ContestNavigation, ScoreboardTable, SubmissionDetail, SubmissionTable } from '../components/ContestUI.jsx';
import './Contest.css';
export default function Contest({ user, view = 'problems', teacher = false }) {
  const { contestId } = useParams();
  const loader = useCallback(async () => {
    const [contest, scoreboard, submissions] = await Promise.all([loadContest(contestId), loadScoreboard(contestId), view === 'submissions' || teacher ? loadContestSubmissions(contestId) : Promise.resolve([])]);
    return { contest, scoreboard, submissions };
  }, [contestId, view, teacher]);
  const state = useContestData(loader, { poll: 10000 });
  const [selected, setSelected] = useState(null);
  const { phase } = useContestClock(state.value?.contest);
  if (!state.value) return <ContestError state={state} />;
  const { contest, scoreboard, submissions } = state.value;
  const mine = scoreboard.find((row) => row.uid === user?.uid);
  return <div className="content contest-ui"><Link to={teacher ? '/teacher/contests' : '/contests'}>← Danh sách contest</Link><header className="contest-heading"><div><p className="contest-eyebrow">{teacher ? 'TEACHER MONITOR' : 'CONTEST MODE'}</p><h1>{contest.title}</h1><p>{contest.description}</p></div><ContestCountdown contest={contest} /></header><ContestNavigation id={contestId} />{state.error && <p className="err" role="alert">{state.error}</p>}{teacher && <p>{scoreboard.length} học sinh · {submissions.length} submissions · Cập nhật mỗi 10 giây.</p>}{view === 'problems' && !teacher && <><p className="contest-total">Điểm hiện tại: <b>{mine?.totalScore ?? 0} / {contest.problems.reduce((sum, p) => sum + p.points, 0)}</b></p>{phase === 'upcoming' && <p>Đề bài mở khi contest bắt đầu: {new Date(contest.startAt).toLocaleString('vi-VN')}.</p>}<div className="contest-table-wrap"><table><thead><tr><th>Bài</th><th>Tên bài</th><th>Điểm</th><th>Trạng thái</th></tr></thead><tbody>{contest.problems.map((p) => <tr key={p.problemId}><td>{p.label}</td><td>{phase === 'upcoming' ? p.title : <Link to={`/contest/${contestId}/problem/${p.problemId}`}>{p.title} →</Link>}</td><td>{mine?.problems[p.problemId]?.earnedPoints ?? 0} / {p.points}</td><td>{problemStatus(mine?.problems[p.problemId])}</td></tr>)}</tbody></table></div></>}{(view === 'scoreboard' || teacher) && <><h2>Leaderboard</h2><p>Điểm giảm dần; bằng điểm xếp theo thời gian nộp gần nhất sớm hơn.</p><ScoreboardTable contest={contest} rows={scoreboard} uid={user?.uid} /></>}{(view === 'submissions' || teacher) && <><h2>{teacher ? 'Tất cả submissions' : 'My Submissions'}</h2><SubmissionTable contest={contest} rows={submissions} onSelect={setSelected} />{selected && <SubmissionDetail submission={selected} onClose={() => setSelected(null)} />}</>}</div>;
}
