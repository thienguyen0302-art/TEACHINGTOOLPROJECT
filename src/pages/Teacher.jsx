import { useEffect, useState } from "react";
import { getClassOverview } from "../services/teacherService";
import { fmtTime, LANG_LABEL } from "../utils/format";
import "./Teacher.css";

const chapterName = (c) => `${LANG_LABEL[c.language] ?? c.language} · Chương ${Number(c.chapterId.slice(2))}`;

function lastSeen(ms) {
  if (!ms) return "Chưa học";
  const days = Math.floor((Date.now() - ms) / 86400000);
  return days <= 0 ? "Hôm nay" : `${days} ngày trước`;
}

// Teacher Dashboard: tiến độ từng học sinh + các chương cả lớp đang yếu.
export default function Teacher() {
  const [state, setState] = useState({ loading: true, error: "", overview: null });

  useEffect(() => {
    let cancelled = false;
    getClassOverview()
      .then((overview) => { if (!cancelled) setState({ loading: false, error: "", overview }); })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: "Không tải được dữ liệu lớp: " + (e.code || e.message), overview: null });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.loading) return <div className="content">Đang tải dữ liệu lớp...</div>;
  if (state.error) return <div className="content"><p className="err">{state.error}</p></div>;
  const o = state.overview;

  return (
    <div className="content">
      <h1>Bảng điều khiển giáo viên</h1>
      <div className="teacher-stats">
        <div><strong>{o.studentCount}</strong><small>Học sinh</small></div>
        <div><strong>{o.activeLast7d}</strong><small>Hoạt động 7 ngày qua</small></div>
        <div><strong>{o.avgScore}%</strong><small>Điểm quiz trung bình</small></div>
      </div>

      <h2 className="teacher-section">Chương cả lớp đang yếu</h2>
      {o.weakChapters.length === 0 ? (
        <p>Chưa có chương nào dưới 70 điểm trung bình.</p>
      ) : (
        <ul className="teacher-weak">
          {o.weakChapters.map((c) => (
            <li key={c.key}><b>{chapterName(c)}</b> · TB {c.avgScore}% · {c.below}/{c.students} HS chưa đạt</li>
          ))}
        </ul>
      )}

      <h2 className="teacher-section">Tiến độ từng học sinh</h2>
      <div className="teacher-table-wrap">
        <table>
          <thead>
            <tr><th>Học sinh</th><th>Ngôn ngữ</th><th>Chương hoàn thành</th><th>Điểm TB</th><th>Giờ học</th><th>Hoạt động</th><th>Chương yếu</th></tr>
          </thead>
          <tbody>
            {o.students.map((s) => (
              <tr key={s.uid}>
                <td>{s.name}</td>
                <td>{LANG_LABEL[s.language] ?? "—"}</td>
                <td>{s.chaptersCompleted}/{s.chaptersTried}</td>
                <td>{s.avgScore}%</td>
                <td>{fmtTime(s.studySeconds)}</td>
                <td>{lastSeen(s.lastActive)}</td>
                <td>
                  {s.weakChapters.length === 0 ? "—" : s.weakChapters.slice(0, 3).map((c) => (
                    <span className="teacher-chip" key={c.language + c.chapterId}>{chapterName(c)} ({c.bestScore}%)</span>
                  ))}
                </td>
              </tr>
            ))}
            {o.students.length === 0 && <tr><td colSpan="7">Chưa có học sinh nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
