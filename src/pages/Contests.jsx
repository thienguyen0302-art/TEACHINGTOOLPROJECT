import { Link } from 'react-router-dom';
import { listContests } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { isKienGiangSeries, nextSeriesContest, seriesCountdown } from '../utils/contestSeries.js';
import { contestPhase } from '../utils/contest.js';
import { ContestError, ContestStatus } from '../components/ContestUI.jsx';
import './Contest.css';
export default function Contests() {
  const state = useContestData(listContests, { poll: 15000 });
  const { now } = useContestClock();
  if (!state.value) return <ContestError state={state} />;
  const next = nextSeriesContest(state.value, now);
  return <div className="content contest-ui"><header className="contest-heading"><div><p className="contest-eyebrow">CONTEST MODE</p><h1>Đấu trường HSG</h1><p>Luyện thi tập trung · Điểm từng phần · Không có AI Tutor trong contest.</p></div></header>{next && <p className="contest-series-next"><span className="contest-series-badge">KIÊN GIANG HSG SERIES</span> Đề tiếp theo mở sau: <strong>{seriesCountdown(next.startAt - now)}</strong></p>}{state.error && <p role="alert" className="err">{state.error}</p>}{[['running', 'Đang diễn ra'], ['upcoming', 'Sắp diễn ra'], ['ended', 'Đã kết thúc']].map(([phase, label]) => <section key={phase}><h2>{label}</h2><div className="contest-grid">{state.value.filter((c) => c.status === 'published' && contestPhase(c, now) === phase).sort((a,b) => b.startAt - a.startAt).map((c) => <article className="contest-card" key={c.id}>{isKienGiangSeries(c) && <span className="contest-series-badge">KIÊN GIANG HSG SERIES</span>}<ContestStatus contest={c} now={now} /><h3><Link to={`/contest/${c.id}`}>{c.title}</Link></h3><p>{c.description}</p><p>{new Date(c.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {c.durationMinutes} phút · {c.problems.length} bài</p><Link className="contest-button" to={`/contest/${c.id}`}>Xem contest →</Link></article>)}</div>{!state.value.some((c) => c.status === 'published' && contestPhase(c, now) === phase) && <p>Chưa có contest trong mục này.</p>}</section>)}</div>;
}
