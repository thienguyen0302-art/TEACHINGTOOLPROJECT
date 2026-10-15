import { TeacherAuthoringNav } from "./TeacherProblems";
import { useEffect, useState } from "react";
import { getClassOverview } from "../services/teacherService";
import { fmtTime, LANG_LABEL, initials } from "../utils/format";
import Icon from "../components/Icon";
import CreateAnnouncementModal from "../components/CreateAnnouncementModal";
import {
  subscribeAnnouncements,
  deleteAnnouncement,
  ANNOUNCEMENT_TYPES,
} from "../services/announcementService";
import "./Teacher.css";

const chapterName = (c) => `${LANG_LABEL[c.language] ?? c.language} · Chương ${Number(c.chapterId.slice(2))}`;

function lastSeenText(ms) {
  if (!ms) return { text: "Chưa vào học", isRecent: false, days: 999 };
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return { text: "Hôm nay", isRecent: true, days: 0 };
  if (days === 1) return { text: "Hôm qua", isRecent: true, days: 1 };
  return { text: `${days} ngày trước`, isRecent: false, days };
}

// Bảng điều khiển Quản lý Đội tuyển của Giáo viên
export default function Teacher() {
  const [state, setState] = useState({ loading: true, error: "", overview: null });
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "good" | "warning" | "inactive"
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentNote, setStudentNote] = useState("");
  const [notice, setNotice] = useState("");

  // Quản lý thông báo lớp học
  const [announcements, setAnnouncements] = useState([]);
  const [isCreateNotifOpen, setIsCreateNotifOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeAnnouncements((items) => {
      setAnnouncements(items);
    });
    return () => unsub?.();
  }, []);

  async function handleDeleteAnnouncement(id, title) {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thông báo "${title}"?`)) {
      try {
        await deleteAnnouncement(id);
        showNotice("Đã xóa thông báo.");
      } catch {
        showNotice("Không thể xóa thông báo lúc này.");
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    getClassOverview()
      .then((overview) => {
        if (!cancelled) setState({ loading: false, error: "", overview });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: "Không tải được dữ liệu lớp: " + (e.code || e.message),
            overview: null,
          });
        }
      });
    return () => { cancelled = true; };
  }, []);

  const o = state.overview;

  // Mở modal xem & quản lý chi tiết học sinh
  function openStudentModal(student) {
    setSelectedStudent(student);
    const savedNote = window.localStorage.getItem(`teacher_note_${student.uid}`) || "";
    setStudentNote(savedNote);
  }

  // Lưu ghi chú của giáo viên về học sinh
  function handleSaveNote() {
    if (!selectedStudent) return;
    window.localStorage.setItem(`teacher_note_${selectedStudent.uid}`, studentNote);
    showNotice(`Đã lưu ghi chú cho học sinh ${selectedStudent.name}`);
  }

  // Gửi nhắc nhở ôn luyện
  function handleSendReminder() {
    if (!selectedStudent) return;
    showNotice(`Đã gửi thông báo nhắc nhở ôn luyện tới ${selectedStudent.name}!`);
  }

  function showNotice(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  // Xuất file CSV danh sách lớp cho giáo viên
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

  if (state.loading) {
    return (
      <div className="content teacher-page">
        <TeacherAuthoringNav />
        <p>Đang tải dữ liệu lớp học...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="content teacher-page">
        <TeacherAuthoringNav />
        <p className="err">{state.error}</p>
      </div>
    );
  }

  const studentsList = o?.students ?? [];

  // Lọc theo từ khóa, ngôn ngữ và trạng thái năng lực
  const filteredStudents = studentsList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.className && s.className.toLowerCase().includes(search.toLowerCase())) ||
      (s.school && s.school.toLowerCase().includes(search.toLowerCase()));
    const matchLang = filterLang === "all" || s.language === filterLang;

    const seen = lastSeenText(s.lastActive);
    let matchStatus = true;
    if (statusFilter === "good") {
      matchStatus = s.avgScore >= 75 && s.weakChapters.length === 0;
    } else if (statusFilter === "warning") {
      matchStatus = s.weakChapters.length > 0 || (s.chaptersTried > 0 && s.avgScore < 70);
    } else if (statusFilter === "inactive") {
      matchStatus = !s.lastActive || seen.days > 7;
    }

    return matchSearch && matchLang && matchStatus;
  });

  const activePercent = o.studentCount > 0 ? Math.round((o.activeLast7d / o.studentCount) * 100) : 0;

  return (
    <div className="content teacher-page">
        <TeacherAuthoringNav />

      {/* ── 1. Banner Hero ─────────────────────────────────── */}
      <section className="teacher-hero">
        <div>
          <span className="teacher-kicker">
            <Icon name="chart" /> TRUNG TÂM QUẢN TRỊ ĐỘI TUYỂN
          </span>
          <h1>Quản lý và theo dõi năng lực học sinh</h1>
          <p>
            Phân tích điểm số, nắm bắt các chuyên đề yếu và cá nhân hóa lộ trình bồi dưỡng HSG Tin học.
          </p>
          <button
            type="button"
            className="teacher-btn-announce"
            onClick={() => setIsCreateNotifOpen(true)}
          >
            <Icon name="megaphone" /> Đăng thông báo cho lớp
          </button>
        </div>
        <div className="teacher-hero-stat">
          <div className="teacher-hero-icon">
            <Icon name="fire" />
          </div>
          <strong>{activePercent}%</strong>
          <small>Chăm chỉ tuần này</small>
        </div>
      </section>

      {/* ── 2. KPI Cards ───────────────────────────────────── */}
      <div className="teacher-kpi-grid">
        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon blue"><Icon name="user" /></div>
          <div className="teacher-kpi-info">
            <strong>{o.studentCount}</strong>
            <small>Học sinh trong đội tuyển</small>
          </div>
        </article>

        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon orange"><Icon name="fire" /></div>
          <div className="teacher-kpi-info">
            <strong>{o.activeLast7d}</strong>
            <small>Hoạt động 7 ngày qua</small>
          </div>
        </article>

        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon purple"><Icon name="trophy" /></div>
          <div className="teacher-kpi-info">
            <strong>{o.avgScore}%</strong>
            <small>Điểm Quiz trung bình</small>
          </div>
        </article>

        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon red"><Icon name="clock" /></div>
          <div className="teacher-kpi-info">
            <strong>{o.weakChapters.length}</strong>
            <small>Chuyên đề cần bồi dưỡng</small>
          </div>
        </article>
      </div>

      {/* ── 3. Bảng tin + Chuyên đề (2 cột) ──────────────── */}
      <div className="teacher-board-layout">

        {/* Cột trái: Bảng tin thông báo */}
        <section className="teacher-announcements-section">
          <div className="teacher-announcements-header">
            <div>
              <h2>Bảng tin &amp; Thông báo lớp học</h2>
              <p>Thông báo đăng tại đây sẽ hiển thị tức thì tới toàn bộ học sinh</p>
            </div>
            <button
              type="button"
              className="teacher-btn-announce"
              onClick={() => setIsCreateNotifOpen(true)}
            >
              <Icon name="megaphone" /> Đăng mới
            </button>
          </div>

          {announcements.length === 0 ? (
            <div className="teacher-announcements-empty">
              Chưa có thông báo nào. Hãy đăng thông báo đầu tiên cho học sinh!
            </div>
          ) : (
            <div className="teacher-announcements-list">
              {announcements.map((a) => {
                const meta = ANNOUNCEMENT_TYPES[a.type] || ANNOUNCEMENT_TYPES.general;
                return (
                  <article key={a.id} className={`teacher-announcement-card ${a.pinned ? "is-pinned" : ""}`}>
                    <div className="tac-header">
                      <div className="tac-badges">
                        <span className={`notif-type-badge ${meta.color}`}>
                          <Icon name={meta.icon} />{meta.badge}
                        </span>
                        {a.pinned && <span className="notif-pinned-badge">📌 Đã ghim</span>}
                      </div>
                      <button
                        type="button"
                        className="tac-delete-btn"
                        onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                        title="Xóa thông báo này"
                        aria-label="Xóa thông báo"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                    <h3 className="tac-title">{a.title}</h3>
                    <p className="tac-content">{a.content}</p>
                    <div className="tac-footer">
                      <span className="tac-author">👤 {a.authorName || "Giáo viên"}</span>
                      <span>
                        {a.createdAt
                          ? new Date(a.createdAt).toLocaleString("vi-VN", {
                              hour: "2-digit", minute: "2-digit",
                              day: "2-digit", month: "2-digit", year: "numeric",
                            })
                          : "Vừa xong"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Cột phải: Chuyên đề cần bồi dưỡng */}
        <section className="teacher-weak-section">
          <h2>Chuyên đề cần bồi dưỡng</h2>
          <p>Các chuyên đề có học sinh đạt điểm dưới 70 cần ôn tập tăng cường</p>

          {o.weakChapters.length === 0 ? (
            <div className="teacher-weak-ok">
              🎉 Tất cả chuyên đề đạt từ 70 điểm trở lên!
            </div>
          ) : (
            <div className="teacher-weak-list">
              {o.weakChapters.map((c) => {
                const failRate = Math.round((c.below / c.students) * 100);
                return (
                  <article className="teacher-weak-card" key={c.key}>
                    <div className="teacher-weak-card__top">
                      <h3>{chapterName(c)}</h3>
                      <span className="teacher-weak-score">TB {c.avgScore}%</span>
                    </div>
                    <div className="teacher-weak-bar-wrap">
                      <div className="teacher-weak-track">
                        <div className="teacher-weak-fill" style={{ width: `${failRate}%` }} />
                      </div>
                      <span>{c.below}/{c.students} HS ({failRate}%)</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>{/* /teacher-board-layout */}

      {/* ── 4. Bảng quản lý học sinh ───────────────────────── */}
      <section className="teacher-table-card">

        {/* Toolbar trên */}
        <div className="teacher-table-toolbar">
          <div className="teacher-table-toolbar-left">
            <h2>Quản lý danh sách học sinh</h2>
            <p>Nhấp vào học sinh để ghi chú hoặc gửi nhắc nhở bồi dưỡng</p>
          </div>
          <button
            type="button"
            className="teacher-btn-export"
            onClick={() => handleExportCSV(filteredStudents)}
            title="Xuất bảng điểm ra file CSV"
          >
            <Icon name="book" /> Xuất báo cáo
          </button>
        </div>

        {/* Bộ lọc tìm kiếm + ngôn ngữ */}
        <div className="teacher-table-filters">
          <div className="teacher-search-box">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Tìm tên, lớp, trường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="teacher-filter-select"
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            aria-label="Lọc theo ngôn ngữ"
          >
            <option value="all">Tất cả ngôn ngữ</option>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
          </select>
        </div>

        {/* Pills trạng thái */}
        <div className="teacher-tabs-filter" role="group" aria-label="Lọc theo tình trạng học tập">
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "good" ? "active" : ""}`}
            onClick={() => setStatusFilter("good")}
          >
            Đạt chuẩn
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "warning" ? "active" : ""}`}
            onClick={() => setStatusFilter("warning")}
          >
            Cần bồi dưỡng
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "inactive" ? "active" : ""}`}
            onClick={() => setStatusFilter("inactive")}
          >
            Chưa học tuần này
          </button>
        </div>

        {/* Bảng học sinh */}
        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Lớp / Trường</th>
                <th>Ngôn ngữ</th>
                <th>Tiến độ</th>
                <th>Điểm TB</th>
                <th>Thời gian học</th>
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
                    <td>
                      <div
                        className="teacher-student-cell"
                        onClick={() => openStudentModal(s)}
                      >
                        <div className="teacher-student-avatar">
                          {initials({ displayName: s.name })}
                        </div>
                        <div className="teacher-student-info">
                          <strong>{s.name}</strong>
                          <small>ID: {s.uid.slice(0, 8)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.className ? (
                        <>
                          <strong>Lớp {s.className}</strong>
                          <small style={{ display: "block", color: "#64748b" }}>{s.school || "—"}</small>
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Chưa cập nhật</span>
                      )}
                    </td>
                    <td>
                      {s.language ? (
                        <span className={`teacher-badge ${s.language}`}>
                          {LANG_LABEL[s.language] || s.language}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td className="teacher-progress-cell">
                      <div className="progress-track">
                        <span style={{ width: `${percentDone}%` }} />
                      </div>
                      <small>{s.chaptersCompleted}/{s.chaptersTried} chương</small>
                    </td>
                    <td>
                      <strong style={{
                        color: s.avgScore >= 80 ? "#16a34a" : s.avgScore >= 70 ? "#2563eb" : "#ea580c"
                      }}>
                        {s.avgScore}%
                      </strong>
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "#475569" }}>
                      {fmtTime(s.studySeconds)}
                    </td>
                    <td>
                      <span className="teacher-status-dot">
                        <i className={`teacher-dot ${activity.isRecent ? "active" : "idle"}`} />
                        {activity.text}
                      </span>
                    </td>
                    <td>
                      {s.weakChapters.length === 0 ? (
                        <span style={{ color: "#16a34a", fontSize: "12.5px", fontWeight: 600 }}>✓ Tốt</span>
                      ) : (
                        s.weakChapters.slice(0, 2).map((c) => (
                          <span className="teacher-chip" key={c.language + c.chapterId}>
                            {chapterName(c)} ({c.bestScore}%)
                          </span>
                        ))
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="teacher-action-btn"
                        onClick={() => openStudentModal(s)}
                      >
                        Quản lý
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                    Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. Modal chi tiết học sinh ─────────────────────── */}
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
              >
                ✕
              </button>
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
                <p style={{ color: "#16a34a", fontSize: "13px", margin: 0 }}>
                  ✓ Học sinh nắm vững tất cả các chương đã học.
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {selectedStudent.weakChapters.map((c) => (
                    <span className="teacher-chip" key={c.language + c.chapterId} style={{ fontSize: "12px" }}>
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
                placeholder="Ví dụ: Cần nhắc học sinh làm thêm bài tập mảng 2 chiều và đệ quy trước kỳ thi chọn đội tuyển..."
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
              />
            </div>

            <div className="teacher-modal-actions">
              <button
                type="button"
                className="teacher-btn-secondary"
                onClick={handleSendReminder}
              >
                Gửi nhắc nhở học tập
              </button>
              <button
                type="button"
                className="teacher-btn-primary"
                onClick={handleSaveNote}
              >
                Lưu ghi chú
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateAnnouncementModal
        isOpen={isCreateNotifOpen}
        onClose={() => setIsCreateNotifOpen(false)}
        currentUser={{ displayName: "Giáo viên phụ trách", role: "teacher" }}
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
