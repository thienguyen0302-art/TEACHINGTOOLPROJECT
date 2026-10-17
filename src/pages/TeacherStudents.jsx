import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClassOverview } from "../services/teacherService";
import { fmtTime, LANG_LABEL, initials } from "../utils/format";
import Icon from "../components/Icon";
import CreateAnnouncementModal from "../components/CreateAnnouncementModal";
import { auth } from "../services/firebase";
import "../styles/pages-shared.css";
import "./Teacher.css";

const chapterName = (c) => `${LANG_LABEL[c.language] ?? c.language} · Ch.${Number(c.chapterId.slice(2))}`;

function lastSeenText(ms) {
  if (!ms) return { text: "Chưa vào học", isRecent: false, days: 999 };
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return { text: "Hôm nay", isRecent: true, days: 0 };
  if (days === 1) return { text: "Hôm qua", isRecent: true, days: 1 };
  return { text: `${days} ngày trước`, isRecent: false, days };
}

export default function TeacherStudents() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", overview: null });
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentNote, setStudentNote] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreateNotifOpen, setIsCreateNotifOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClassOverview()
      .then((overview) => { if (!cancelled) setState({ loading: false, error: "", overview }); })
      .catch((e) => {
        if (!cancelled)
          setState({ loading: false, error: "Không tải được dữ liệu lớp: " + (e.code || e.message), overview: null });
      });
    return () => { cancelled = true; };
  }, []);

  const o = state.overview;

  function openStudentModal(student) {
    setSelectedStudent(student);
    setStudentNote(window.localStorage.getItem(`teacher_note_${student.uid}`) || "");
  }

  function handleSaveNote() {
    if (!selectedStudent) return;
    window.localStorage.setItem(`teacher_note_${selectedStudent.uid}`, studentNote);
    showNotice(`Đã lưu ghi chú cho học sinh ${selectedStudent.name}`);
  }

  function handleSendReminder() {
    if (!selectedStudent) return;
    showNotice(`Đã gửi thông báo nhắc nhở ôn luyện tới ${selectedStudent.name}!`);
  }

  function showNotice(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  function handleExportCSV(students) {
    if (!students || students.length === 0) return;
    const header = ["STT", "Học sinh", "Lớp", "Trường", "Ngôn ngữ", "Chương hoàn thành", "Điểm TB (%)", "Thời gian học (phút)", "Hoạt động", "Chuyên đề yếu"];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.name.replaceAll('"', '""')}"`,
      `"${(s.className || "").replaceAll('"', '""')}"`,
      `"${(s.school || "").replaceAll('"', '""')}"`,
      LANG_LABEL[s.language] || s.language || "Chưa chọn",
      `"${s.chaptersCompleted}/${s.chaptersTried}"`,
      s.avgScore,
      Math.round((s.studySeconds || 0) / 60),
      lastSeenText(s.lastActive).text,
      `"${s.weakChapters.map((c) => chapterName(c)).join("; ")}"`,
    ]);
    const csvContent = "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_doi_tuyen_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice("Đã xuất danh sách lớp ra file CSV thành công!");
  }

  if (state.loading) return <div className="content ps-page"><p>Đang tải dữ liệu lớp học...</p></div>;
  if (state.error)   return <div className="content ps-page"><p className="err">{state.error}</p></div>;

  const studentsList = o?.students ?? [];

  const filteredStudents = studentsList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.className && s.className.toLowerCase().includes(search.toLowerCase())) ||
      (s.school && s.school.toLowerCase().includes(search.toLowerCase()));
    const matchLang = filterLang === "all" || s.language === filterLang;
    const seen = lastSeenText(s.lastActive);
    let matchStatus = true;
    if (statusFilter === "good")     matchStatus = s.avgScore >= 75 && s.weakChapters.length === 0;
    if (statusFilter === "warning")  matchStatus = s.weakChapters.length > 0 || (s.chaptersTried > 0 && s.avgScore < 70);
    if (statusFilter === "inactive") matchStatus = !s.lastActive || seen.days > 7;
    return matchSearch && matchLang && matchStatus;
  });

  /* Tab counts */
  const countGood     = studentsList.filter(s => s.avgScore >= 75 && s.weakChapters.length === 0).length;
  const countWarning  = studentsList.filter(s => s.weakChapters.length > 0 || (s.chaptersTried > 0 && s.avgScore < 70)).length;
  const countInactive = studentsList.filter(s => !s.lastActive || lastSeenText(s.lastActive).days > 7).length;

  return (
    <div className="content ps-page">
      {/* ── Header ── */}
      <div className="ps-page-header">
        <h1>Quản lý học sinh</h1>
        <p>Theo dõi tiến độ, điểm số và chuyên đề cần bồi dưỡng của từng học sinh trong đội tuyển</p>
      </div>

      {/* ── Card bảng ── */}
      <div className="ps-card">

        {/* Toolbar */}
        <div className="ps-toolbar">
          <div className="ps-toolbar-left">
            <h2>Danh sách học sinh <span style={{ color: "#94a3b8", fontWeight: 600 }}>({filteredStudents.length}/{studentsList.length})</span></h2>
            <p>Nhấp vào học sinh để ghi chú hoặc gửi nhắc nhở</p>
          </div>
          <div className="ps-search" style={{ maxWidth: 280 }}>
            <Icon name="search" />
            <input
              type="search"
              placeholder="Tìm tên, lớp, trường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="ps-select"
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            aria-label="Lọc theo ngôn ngữ"
          >
            <option value="all">Tất cả ngôn ngữ</option>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
          </select>
          <button
            type="button"
            className="ps-export-btn"
            onClick={() => handleExportCSV(filteredStudents)}
          >
            <Icon name="book" /> Xuất báo cáo
          </button>
        </div>

        {/* Status tabs */}
        <div className="ps-tabs" role="group" aria-label="Lọc theo tình trạng học tập">
          {[
            { key: "all",      label: `Tất cả (${studentsList.length})` },
            { key: "good",     label: `Đạt chuẩn (${countGood})` },
            { key: "warning",  label: `Cần bồi dưỡng (${countWarning})` },
            { key: "inactive", label: `Chưa học tuần này (${countInactive})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`ps-tab-btn ${statusFilter === key ? "active" : ""}`}
              onClick={() => setStatusFilter(key)}
            >{label}</button>
          ))}
        </div>

        {/* Table */}
        <div className="ps-table-wrap">
          <table className="ps-table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Lớp / Trường</th>
                <th>Ngôn ngữ</th>
                <th>Tiến độ</th>
                <th>Điểm TB</th>
                <th>Thời gian</th>
                <th>Hoạt động</th>
                <th>Chuyên đề cần kèm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const activity = lastSeenText(s.lastActive);
                const percentDone = s.chaptersTried > 0
                  ? Math.round((s.chaptersCompleted / s.chaptersTried) * 100)
                  : 0;
                return (
                  <tr key={s.uid}>
                    <td style={{ minWidth: 170 }}>
                      <div className="ps-student-cell" onClick={() => openStudentModal(s)}>
                        <div className="ps-avatar">{initials({ displayName: s.name })}</div>
                        <div>
                          <strong>{s.name}</strong>
                          <small>ID: {s.uid.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      {s.className ? (
                        <>
                          <strong>Lớp {s.className}</strong>
                          <small style={{ display: "block", color: "#64748b", fontWeight: 600 }}>{s.school || "—"}</small>
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>Chưa cập nhật</span>
                      )}
                    </td>
                    <td>
                      {s.language
                        ? <span className={`ps-badge ${s.language}`}>{LANG_LABEL[s.language] || s.language}</span>
                        : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <div className="ps-progress-wrap">
                        <div className="ps-progress-track">
                          <div className="ps-progress-fill" style={{ width: `${percentDone}%` }} />
                        </div>
                        <small>{s.chaptersCompleted}/{s.chaptersTried} chương</small>
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <strong style={{
                        color: s.avgScore >= 80 ? "#16a34a" : s.avgScore >= 70 ? "#2563eb" : "#ea580c",
                        fontSize: 14,
                      }}>
                        {s.avgScore}%
                      </strong>
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "#475569", fontSize: 13, fontWeight: 600 }}>
                      {fmtTime(s.studySeconds)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="ps-status">
                        <i className={`ps-dot ${activity.isRecent ? "active" : "idle"}`} />
                        {activity.text}
                      </span>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      {s.weakChapters.length === 0
                        ? <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 700 }}>✓ Tốt</span>
                        : s.weakChapters.slice(0, 2).map((c) => (
                          <span className="ps-weak-chip" key={c.language + c.chapterId}>
                            {chapterName(c)} ({c.bestScore}%)
                          </span>
                        ))}
                    </td>
                    <td>
                      <button type="button" className="ps-action-btn" onClick={() => openStudentModal(s)}>
                        Quản lý
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="9">
                    <div className="ps-empty">
                      <Icon name="search" />
                      <h3>Không tìm thấy học sinh</h3>
                      <p>Thử từ khóa khác hoặc bỏ bớt bộ lọc.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal chi tiết học sinh ── */}
      {selectedStudent && (
        <div className="teacher-modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-modal-header">
              <div>
                <span className="teacher-kicker">HỒ SƠ HỌC SINH</span>
                <h3>{selectedStudent.name}</h3>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  {selectedStudent.className ? `Lớp ${selectedStudent.className}` : ""}
                  {selectedStudent.school ? ` · ${selectedStudent.school}` : ""}
                </span>
              </div>
              <button
                type="button"
                className="teacher-modal-close"
                onClick={() => setSelectedStudent(null)}
                aria-label="Đóng"
              >✕</button>
            </div>

            <div className="teacher-modal-grid">
              <div className="teacher-modal-box">
                <span>Ngôn ngữ ôn luyện</span>
                <strong>{LANG_LABEL[selectedStudent.language] || "Chưa chọn"}</strong>
              </div>
              <div className="teacher-modal-box">
                <span>Điểm Quiz trung bình</span>
                <strong style={{ color: selectedStudent.avgScore >= 70 ? "#16a34a" : "#dc2626" }}>
                  {selectedStudent.avgScore}%
                </strong>
              </div>
              <div className="teacher-modal-box">
                <span>Tổng thời gian ôn luyện</span>
                <strong>{fmtTime(selectedStudent.studySeconds)}</strong>
              </div>
              <div className="teacher-modal-box">
                <span>Lần học gần nhất</span>
                <strong>{lastSeenText(selectedStudent.lastActive).text}</strong>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                Các chuyên đề đang cần hỗ trợ:
              </h4>
              {selectedStudent.weakChapters.length === 0 ? (
                <p style={{ color: "#16a34a", fontSize: "13px", margin: 0 }}>✓ Học sinh nắm vững tất cả các chương đã học.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {selectedStudent.weakChapters.map((c) => (
                    <span className="ps-weak-chip" key={c.language + c.chapterId}>{chapterName(c)} — {c.bestScore}%</span>
                  ))}
                </div>
              )}
            </div>

            <div className="teacher-note-area">
              <label htmlFor="teacher-note-input">Ghi chú &amp; Kế hoạch bồi dưỡng của giáo viên:</label>
              <textarea
                id="teacher-note-input"
                placeholder="Ví dụ: Cần nhắc học sinh làm thêm bài tập mảng 2 chiều và đệ quy trước kỳ thi..."
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
              />
            </div>

            <div className="teacher-modal-actions">
              <button
                type="button"
                className="teacher-btn-secondary"
                onClick={() => navigate(`/teacher/contest-history?studentId=${selectedStudent.uid}&tab=submissions`)}
              >
                <Icon name="trophy" /> Xem lịch sử Contest HSG
              </button>
              <button type="button" className="teacher-btn-secondary" onClick={handleSendReminder}>Gửi nhắc nhở học tập</button>
              <button type="button" className="teacher-btn-primary" onClick={handleSaveNote}>Lưu ghi chú</button>
            </div>
          </div>
        </div>
      )}

      <CreateAnnouncementModal
        isOpen={isCreateNotifOpen}
        onClose={() => setIsCreateNotifOpen(false)}
        currentUser={auth.currentUser}
        onCreated={() => showNotice("Đã gửi thông báo đến toàn bộ học sinh thành công!")}
      />

      {notice && (
        <div className="toast" role="status" style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 200 }}>
          <span><Icon name="check" /></span>{notice}
        </div>
      )}
    </div>
  );
}
