import { Link } from 'react-router-dom';
import { contestPhase, formatCountdown, problemStatus } from '../utils/contest.js';
import useContestClock from '../hooks/useContestClock.js';
const labels = { upcoming: 'Sắp diễn ra', running: 'Đang diễn ra', ended: 'Đã kết thúc' };
export function ContestStatus({ contest, now }) {
  const phase = contestPhase(contest, now);
  return <span className={`contest-badge ${phase}`}>{labels[phase]}</span>;
}
export function ContestCountdown({ contest }) {
  const { phase, remaining } = useContestClock(contest);
  return <span className="contest-clock">{labels[phase]}{phase === 'running' && <> · Còn lại <b>{formatCountdown(remaining)}</b></>}</span>;
}
export function ContestNavigation({ id }) {
  return <nav className="contest-links" aria-label="Điều hướng contest"><Link to={`/contest/${id}`}>Bài thi</Link><Link to={`/contest/${id}/submissions`}>My Submissions</Link><Link to={`/contest/${id}/scoreboard`}>Leaderboard</Link></nav>;
}
export function ContestError({ state }) {
  return <div className="content contest-ui">{state.loading ? <p role="status">Đang tải…</p> : <><p className="err" role="alert">{state.error || 'Không tìm thấy dữ liệu.'}</p><button onClick={state.refresh}>Thử lại</button></>}</div>;
}
export function ScoreboardTable({ contest, rows, uid }) {
  return <div className="contest-table-wrap"><table><thead><tr><th>Rank</th><th>Học sinh</th>{contest.problems.map((p) => <th key={p.problemId}>{p.label} / {p.points}</th>)}<th>Tổng</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.uid} className={row.uid === uid ? 'contest-current-user' : ''}><td>{index + 1}</td><td>{row.displayName}</td>{contest.problems.map((p) => <td key={p.problemId}><b>{row.problems[p.problemId]?.earnedPoints ?? 0}</b><small>{problemStatus(row.problems[p.problemId])}</small></td>)}<td><b>{row.totalScore}</b></td></tr>)}{!rows.length && <tr><td colSpan={contest.problems.length + 3}>Chưa có bài nộp.</td></tr>}</tbody></table></div>;
}
export function SubmissionTable({ rows, contest, onSelect }) {
  return <div className="contest-table-wrap"><table><thead><tr><th>Thời gian</th><th>Bài</th><th>Ngôn ngữ</th><th>Verdict</th><th>Điểm</th><th>Xem</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{new Date(row.submittedAt).toLocaleString('vi-VN')}</td><td>{contest.problems.find((p) => p.problemId === row.problemId)?.label ?? row.problemId}</td><td>{row.language === 'cpp' ? 'C++' : 'Python'}</td><td>{row.status}</td><td>{row.earnedPoints} ({row.score}%)</td><td><button onClick={() => onSelect(row)}>Xem code</button></td></tr>)}{!rows.length && <tr><td colSpan="6">Chưa có bài nộp.</td></tr>}</tbody></table></div>;
}
export function SubmissionDetail({ submission, onClose }) {
  return <section className="contest-card" aria-label="Chi tiết submission"><button onClick={onClose}>Đóng chi tiết</button><h2>{submission.status} · {submission.earnedPoints} điểm</h2><p>{submission.uid} · {submission.language} · {new Date(submission.submittedAt).toLocaleString('vi-VN')}</p><pre><code>{submission.source}</code></pre></section>;
}
