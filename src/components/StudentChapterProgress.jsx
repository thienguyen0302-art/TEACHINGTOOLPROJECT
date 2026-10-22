// Danh sách % hoàn thành từng chương của một học sinh (dùng trong popup "Quản lý").
export default function StudentChapterProgress({ chapters = [] }) {
  if (chapters.length === 0) {
    return <p className="scp-empty">Học sinh chưa chọn ngôn ngữ nên chưa có tiến độ chương.</p>;
  }
  return (
    <ul className="scp-list">
      {chapters.map((c) => (
        <li key={c.chapterId} className={`scp-item ${c.percent >= 100 ? "done" : c.percent > 0 ? "doing" : ""}`}>
          <span className="scp-name" title={c.title}>Chương {c.order}</span>
          <div className="scp-track"><span style={{ width: `${c.percent}%` }} /></div>
          <strong className="scp-value">{c.percent}/100</strong>
        </li>
      ))}
    </ul>
  );
}
