// Danh sách từng chương của một học sinh (popup "Quản lý"):
//  - % hoàn thành chương (tiến độ học)
//  - Điểm = % bài tập (quiz + bài code bắt buộc) làm đúng trong chương
export default function StudentChapterProgress({ chapters = [] }) {
  if (chapters.length === 0) {
    return <p className="scp-empty">Học sinh chưa chọn ngôn ngữ nên chưa có tiến độ chương.</p>;
  }
  return (
    <ul className="scp-list">
      {chapters.map((c) => (
        <li
          key={c.chapterId}
          className={`scp-item ${c.completed ? "done" : c.percent > 0 ? "doing" : ""}`}
          title={`${c.title}${c.codeTotal ? ` · Bài code ${c.codeSolved}/${c.codeTotal}` : ""}`}
        >
          <span className="scp-name">Chương {c.order}</span>
          <div className="scp-track"><span style={{ width: `${c.percent}%` }} /></div>
          <strong className="scp-value">{c.percent}%</strong>
          <span className="scp-score" data-low={c.score !== null && c.score < 70}>
            {c.score === null ? "Điểm —" : `Điểm ${c.score}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}
