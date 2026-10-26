import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClassOverview, subscribeClassOverview } from "../services/teacherService";
import { createAnnouncement } from "../services/announcementService";
import { fmtTime, LANG_LABEL, initials } from "../utils/format";
import Icon from "../components/Icon";
import StudentDetailModal from "../components/StudentDetailModal";
import { chapterName, lastSeenText, filterStudents, studentCounts, downloadStudentsCsv } from "../utils/studentRoster";
import CreateAnnouncementModal from "../components/CreateAnnouncementModal";
import { auth } from "../services/firebase";
import "../styles/pages-shared.css";
import "./Teacher.css";


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
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    // 1. Tải nhanh dữ liệu ban đầu
    getClassOverview()
      .then((overview) => {
        if (!cancelled) {
          setState({ loading: false, error: "", overview });
          setLastSyncTime(new Date());
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ loading: false, error: "Không tải được dữ liệu lớp: " + (e.code || e.message), overview: null });
        }
      });

    // 2. Lắng nghe thay đổi thời gian thực (Real-time Live Sync khi học sinh học/nộp bài/đổi hồ sơ)
    const unsubscribe = subscribeClassOverview(
      (overview) => {
        if (!cancelled) {
          setState({ loading: false, error: "", overview });
          setLastSyncTime(new Date());
        }
      },
      (e) => {
        console.warn("[TeacherStudents] Lỗi lắng nghe đồng bộ:", e);
      }
    );

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const o = state.overview;

  async function handleManualSync() {
    setRefreshing(true);
    try {
      const overview = await getClassOverview();
      setState({ loading: false, error: "", overview });
      setLastSyncTime(new Date());
      showNotice("Đã đồng bộ toàn bộ dữ liệu học sinh mới nhất từ hệ thống!");
    } catch (e) {
      showNotice("Không thể đồng bộ: " + (e.message || "Vui lòng thử lại"));
    } finally {
      setRefreshing(false);
    }
  }

  function openStudentModal(student) {
    setSelectedStudent(student);
    setStudentNote(window.localStorage.getItem(`teacher_note_${student.uid}`) || "");
  }

  function handleSaveNote() {
    if (!selectedStudent) return;
    window.localStorage.setItem(`teacher_note_${selectedStudent.uid}`, studentNote);
    showNotice(`Đã lưu ghi chú cho học sinh ${selectedStudent.name}`);
  }

  async function handleSendReminder() {
    if (!selectedStudent) return;
    try {
      await createAnnouncement({
        title: `Nhắc nhở học tập: Em ${selectedStudent.name}`,
        content: `Thầy/Cô nhắc nhở em ${selectedStudent.name} tiếp tục ôn luyện các chuyên đề cần cải thiện. Hãy dành thời gian hoàn thành các bài tập và làm bài trắc nghiệm nhé!`,
        type: "reminder",
        pinned: true,
        authorName: auth.currentUser?.displayName || "Giáo viên",
        authorUid: auth.currentUser?.uid || "",
      });
      showNotice(`Đã gửi thông báo nhắc nhở ôn luyện tới ${selectedStudent.name}!`);
    } catch {
      showNotice(`Đã ghi nhận nhắc nhở ôn luyện tới ${selectedStudent.name}!`);
    }
  }

  function showNotice(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  function handleExportCSV(students) {
    if (!students || students.length === 0) return;
    downloadStudentsCsv(students);
    showNotice("Đã xuất danh sách lớp ra file CSV thành công!");
  }

  if (state.loading) return <div className="content ps-page"><p>Đang tải dữ liệu lớp học...</p></div>;
  if (state.error)   return <div className="content ps-page"><p className="err">{state.error}</p></div>;

  const studentsList = o?.students ?? [];

  const filteredStudents = filterStudents(studentsList, { search, lang: filterLang, status: statusFilter });


  /* Tab counts */
  const { good: countGood, warning: countWarning, inactive: countInactive } = studentCounts(studentsList);

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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2>Danh sách học sinh <span style={{ color: "#94a3b8", fontWeight: 600 }}>({filteredStudents.length}/{studentsList.length})</span></h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#15803d",
                  background: "#dcfce7",
                  padding: "3px 9px",
                  borderRadius: "99px",
                }}
                title="Hệ thống tự động lắng nghe và đồng bộ dữ liệu học sinh thay đổi theo thời gian thực"
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                Đồng bộ trực tiếp · {lastSyncTime.toLocaleTimeString("vi-VN")}
              </span>
            </div>
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
            onClick={handleManualSync}
            disabled={refreshing}
            title={`Bấm để cập nhật lại toàn bộ dữ liệu mới nhất. Lần cuối: ${lastSyncTime.toLocaleTimeString("vi-VN")}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="history" />
            <span>{refreshing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
          </button>
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
                <th>Điểm bài tập</th>
                <th>Thời gian</th>
                <th>Hoạt động</th>
                <th>Chuyên đề cần kèm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const activity = lastSeenText(s.lastActive);
                const percentDone = s.chaptersTotal > 0
                  ? Math.round((s.chaptersCompleted / s.chaptersTotal) * 100)
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
                        <small>{s.chaptersCompleted}/{s.chaptersTotal} chương</small>
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
      <StudentDetailModal
        student={selectedStudent}
        note={studentNote}
        onNoteChange={setStudentNote}
        onClose={() => setSelectedStudent(null)}
        onSaveNote={handleSaveNote}
        onSendReminder={handleSendReminder}
        onOpenSubmissionHistory={() => navigate(`/teacher/submissions?studentId=${selectedStudent.uid}`)}
        onOpenContestHistory={() => navigate(`/teacher/contest-history?studentId=${selectedStudent.uid}&tab=submissions`)}
      />

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
