import './SubmissionProgress.css';
export default function SubmissionProgress({ entry }) {
  const stats = entry?.stats;
  return <div className="submission-progress" aria-label="Tiến độ nộp bài" aria-live="polite">
    <div><span>{stats?.attempts ?? 0} lần nộp</span><span>Điểm tốt nhất: {stats?.bestScore ?? 0}/100</span>
      {stats?.solved && <strong>Đã hoàn thành ✓</strong>}</div>
    <small>Tiến độ trong phiên này{stats ? ` · Lần gần nhất: ${stats.lastScore}/100` : ''}</small>
    {entry?.warning && <p role="status">{entry.warning}</p>}
  </div>;
}
