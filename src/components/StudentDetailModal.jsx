import Icon from "./Icon";
import StudentChapterProgress from "./StudentChapterProgress";
import { fmtTime, LANG_LABEL } from "../utils/format";
import { chapterName, lastSeenText } from "../utils/studentRoster";

// Popup "Quản lý" 1 học sinh. Dùng chung cho /teacher và /teacher/students.
export default function StudentDetailModal({
  student, note, onNoteChange, onClose, onSaveNote, onSendReminder, onOpenContestHistory, onOpenSubmissionHistory,
}) {
  if (!student) return null;
  const h4 = { margin: "0 0 0.5rem 0", fontSize: "13px", fontWeight: 700, color: "#334155" };
  return (
    <div className="teacher-modal-backdrop" onClick={onClose}>
      <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="teacher-modal-header">
          <div>
            <span className="teacher-kicker">HỒ SƠ HỌC SINH</span>
            <h3>{student.name}</h3>
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              {student.className ? `Lớp ${student.className}` : ""}
              {student.school ? ` · ${student.school}` : ""}
            </span>
          </div>
          <button type="button" className="teacher-modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="teacher-modal-grid">
          <div className="teacher-modal-box">
            <span>Chương hoàn thành</span>
            <strong>{student.chaptersCompleted}/{student.chaptersTotal} chương</strong>
          </div>
          <div className="teacher-modal-box">
            <span>% hoàn thành lộ trình</span>
            <strong>{student.overallPercent ?? 0}%</strong>
          </div>
          <div className="teacher-modal-box">
            <span>Điểm bài tập trung bình</span>
            <strong style={{ color: student.avgScore >= 70 ? "#16a34a" : "#dc2626" }}>{student.avgScore}%</strong>
          </div>
          <div className="teacher-modal-box">
            <span>Ngôn ngữ ôn luyện</span>
            <strong>{LANG_LABEL[student.language] || "Chưa chọn"}</strong>
          </div>
          <div className="teacher-modal-box">
            <span>Tổng thời gian ôn luyện</span>
            <strong>{fmtTime(student.studySeconds)}</strong>
          </div>
          <div className="teacher-modal-box">
            <span>Lần học gần nhất</span>
            <strong>{lastSeenText(student.lastActive).text}</strong>
          </div>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <h4 style={h4}>
            Tiến độ từng chương ({student.chaptersCompleted}/{student.chaptersTotal} chương hoàn thành):
          </h4>
          <StudentChapterProgress chapters={student.chapterProgress} />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <h4 style={h4}>Các chuyên đề đang cần hỗ trợ:</h4>
          {student.weakChapters.length === 0 ? (
            <p style={{ color: "#16a34a", fontSize: "13px", margin: 0 }}>✓ Học sinh nắm vững tất cả các chương đã làm bài.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {student.weakChapters.map((c) => (
                <span className="ps-weak-chip teacher-chip" key={c.language + c.chapterId} style={{ fontSize: "12px" }}>
                  {chapterName(c)} — {c.bestScore}%
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="teacher-note-area">
          <label htmlFor="teacher-note-input">Ghi chú &amp; Kế hoạch bồi dưỡng của giáo viên:</label>
          <textarea
            id="teacher-note-input"
            placeholder="Ví dụ: Cần nhắc học sinh làm thêm bài tập mảng 2 chiều và đệ quy trước kỳ thi..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </div>

        <div className="teacher-modal-actions">
          {onOpenContestHistory && (
            <button type="button" className="teacher-btn-secondary" onClick={onOpenContestHistory}>
              <Icon name="trophy" /> Xem lịch sử Contest HSG
            </button>
          )}
          {onOpenSubmissionHistory && (
            <button type="button" className="teacher-btn-secondary" onClick={onOpenSubmissionHistory}>
              <Icon name="check" /> Xem lịch sử nộp bài
            </button>
          )}
          <button type="button" className="teacher-btn-secondary" onClick={onSendReminder}>Gửi nhắc nhở học tập</button>
          <button type="button" className="teacher-btn-primary" onClick={onSaveNote}>Lưu ghi chú</button>
        </div>
      </div>
    </div>
  );
}
