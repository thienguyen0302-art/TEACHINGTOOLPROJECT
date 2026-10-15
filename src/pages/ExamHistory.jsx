import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { getExamHistory } from "../services/examService";
import { formatTime } from "../utils/timer";
import { auth } from "../services/firebase";
import { LANG_LABEL } from "../utils/format";
import "../styles/pages-shared.css";
import "./Exam.css";

/**
 * ExamHistory – Trang lịch sử thi cá nhân (tách độc lập từ Exam.jsx)
 */
export default function ExamHistory() {
  const nav = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(auth.currentUser?.uid));

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    getExamHistory(uid, 50)
      .then((res) => { if (!cancelled) { setHistory(res); setLoading(false); } })
      .catch((e) => { console.error("Lỗi tải lịch sử thi:", e); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="content ps-page">

      {/* Header */}
      <div className="ps-page-header">
        <h1>Lịch sử thi</h1>
        <p>Kết quả cá nhân · Tổng {history.length} bài thi đã hoàn thành</p>
      </div>

      <div className="ps-card">
        <div className="ps-toolbar" style={{ marginBottom: 16 }}>
          <div className="ps-toolbar-left">
            <h2>Kết quả cá nhân</h2>
            <p>Điểm cao nhất của mỗi đề được tính vào bảng xếp hạng</p>
          </div>
          {history.length > 0 && (
            <span style={{
              background: "#eff6ff", color: "#2563eb", borderRadius: 20,
              padding: "3px 12px", fontSize: 13, fontWeight: 700,
            }}>
              {history.length} bài thi
            </span>
          )}
        </div>

        {loading ? (
          <div className="ps-empty"><p>Đang tải lịch sử thi...</p></div>
        ) : history.length === 0 ? (
          <div className="ps-empty">
            <Icon name="trophy" />
            <h3>Sẵn sàng cho bài thi đầu tiên?</h3>
            <p>Bạn chưa hoàn thành bài thi nào. Hãy thử sức với đề thi nhé!</p>
            <button
              type="button"
              className="ps-action-btn"
              style={{ marginTop: 12, height: 36, padding: "0 16px", fontSize: 13 }}
              onClick={() => nav("/exam")}
            >Vào thi ngay</button>
          </div>
        ) : (
          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead>
                <tr>
                  <th scope="col">Mã đề thi</th>
                  <th scope="col">Ngôn ngữ</th>
                  <th scope="col">Số câu đúng</th>
                  <th scope="col">Điểm số</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Cách nộp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <strong style={{ fontSize: 13, color: "#1e293b" }}>{h.examId}</strong>
                    </td>
                    <td>
                      <span className={`ps-badge ${h.language}`}>
                        {LANG_LABEL[h.language] || h.language}
                      </span>
                    </td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
                      <b style={{ color: "#1e293b" }}>{h.correct}</b> / {h.total}
                    </td>
                    <td>
                      <span className="ps-score">
                        {h.points ?? h.score} điểm
                        <small>({h.score}%)</small>
                      </span>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
                      {formatTime(h.durationSec)}
                    </td>
                    <td>
                      {h.autoSubmitted
                        ? <span className="ps-submit-tag auto">Tự động khi hết giờ</span>
                        : <span className="ps-submit-tag manual">Chủ động nộp</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
