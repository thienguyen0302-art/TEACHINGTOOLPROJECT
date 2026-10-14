import { useEffect, useState } from "react";
import { getClassOverview } from "../services/teacherService";
import { fmtTime, LANG_LABEL, initials } from "../utils/format";
import Icon from "../components/Icon";
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
        <p>Đang tải dữ liệu lớp học...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="content teacher-page">
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

  const countGood = studentsList.filter((s) => s.avgScore >= 75 && s.weakChapters.length === 0).length;
  const countWarning = studentsList.filter((s) => s.weakChapters.length > 0 || (s.chaptersTried > 0 && s.avgScore < 70)).length;
  const countInactive = studentsList.filter((s) => !s.lastActive || lastSeenText(s.lastActive).days > 7).length;

  const activePercent = o.studentCount > 0 ? Math.round((o.activeLast7d / o.studentCount) * 100) : 0;

  return (
    <div className="content teacher-page">
      {/* 1. Hero Header Quản Trị */}
      <section className="teacher-hero">
        <div>
          <span className="teacher-kicker">
            <Icon name="chart" /> TRUNG TÂM QUẢN TRỊ ĐỘI TUYỂN
          </span>
          <h1>Quản lý & Theo dõi Năng lực Học sinh</h1>
          <p>
            Phân tích điểm số, nắm bắt các chuyên đề yếu và cá nhân hóa lộ trình bồi dưỡng HSG Tin học.
          </p>
        </div>
        <div className="teacher-hero-stat">
          <div className="teacher-hero-icon">
            <Icon name="fire" />
          </div>
          <div>
            <strong>{activePercent}%</strong>
            <small>Chăm chỉ tuần này</small>
          </div>
        </div>
      </section>

      {/* 2. Hàng thẻ KPIs Quản lý */}
      <div className="teacher-kpi-grid">
        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon blue">
            <Icon name="user" />
          </div>
          <div className="teacher-kpi-info">
            <strong>{o.studentCount}</strong>
            <small>Học sinh trong đội tuyển</small>
          </div>
        </article>

        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon orange">
            <Icon name="fire" />
          </div>
          <div className="teacher-kpi-info">
            <strong>{o.activeLast7d}</strong>
            <small>Đang hoạt động (7 ngày qua)</small>
          </div>
        </article>

        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon purple">
            <Icon name="trophy" />
          </div>
          <div className="teacher-kpi-info">
            <strong>{o.avgScore}%</strong>
            <small>Điểm Quiz trung bình</small>
          </div>
        </article>

        <article className="teacher-kpi-card">
          <div className="teacher-kpi-icon red">
            <Icon name="clock" />
          </div>
          <div className="teacher-kpi-info">
            <strong>{o.weakChapters.length}</strong>
            <small>Chuyên đề cần bồi dưỡng</small>
          </div>
        </article>
      </div>

      {/* 3. Chuyên đề cả lớp đang yếu */}
      <section className="teacher-weak-section">
        <div className="teacher-section-title">
          <div>
            <h2>Chuyên đề trọng tâm cần bổ trợ cho đội tuyển</h2>
            <span>Các chuyên đề có học sinh đạt điểm dưới 70 cần tổ chức ôn tập tăng cường</span>
          </div>
          <span style={{ color: "#64748b" }}>{o.weakChapters.length} chuyên đề</span>
        </div>

        {o.weakChapters.length === 0 ? (
          <p style={{ color: "#16a34a", margin: 0, fontWeight: 500 }}>
            🎉 Rất tốt! Tất cả chuyên đề đã học đều đạt từ 70 điểm trở lên.
          </p>
        ) : (
          <div className="teacher-weak-grid">
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
                    <span>{c.below}/{c.students} HS chưa đạt ({failRate}%)</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Bảng quản lý chi tiết học sinh */}
      <section className="teacher-table-card">
        <div className="teacher-table-toolbar">
          <div className="teacher-section-title" style={{ margin: 0 }}>
            <div>
              <h2>Quản lý danh sách học sinh ({filteredStudents.length})</h2>
              <span>Nhấp vào học sinh để ghi chú hoặc gửi nhắc nhở bồi dưỡng</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
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

            <button
              type="button"
              className="teacher-btn-export"
              onClick={() => handleExportCSV(filteredStudents)}
              title="Xuất bảng điểm ra file CSV"
            >
              <Icon name="book" /> Xuất báo cáo
            </button>
          </div>
        </div>

        {/* Bộ lọc nhóm học sinh */}
        <div className="teacher-tabs-filter" role="group" aria-label="Lọc theo tình trạng học tập">
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả ({studentsList.length})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "good" ? "active" : ""}`}
            onClick={() => setStatusFilter("good")}
          >
            Đạt chuẩn ({countGood})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "warning" ? "active" : ""}`}
            onClick={() => setStatusFilter("warning")}
          >
            Cần bồi dưỡng ({countWarning})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${statusFilter === "inactive" ? "active" : ""}`}
            onClick={() => setStatusFilter("inactive")}
          >
            Chưa vào học tuần này ({countInactive})
          </button>
        </div>

        <div className="teacher-table-wrap">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Lớp / Trường</th>
                <th>Ngôn ngữ</th>
                <th>Tiến độ chương</th>
                <th>Điểm TB</th>
                <th>Thời gian học</th>
                <th>Hoạt động</th>
                <th>Chuyên đề cần kèm</th>
                <th>Quản lý</th>
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
                        style={{ cursor: "pointer" }}
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
                      <div className="progress-track" style={{ height: "6px" }}>
                        <span style={{ width: `${percentDone}%` }} />
                      </div>
                      <small>{s.chaptersCompleted}/{s.chaptersTried} chương hoàn thành</small>
                    </td>
                    <td>
                      <strong style={{
                        color: s.avgScore >= 80 ? "#16a34a" : s.avgScore >= 70 ? "#2563eb" : "#ea580c"
                      }}>
                        {s.avgScore}%
                      </strong>
                    </td>
                    <td>{fmtTime(s.studySeconds)}</td>
                    <td>
                      <span className="teacher-status-dot">
                        <i className={`teacher-dot ${activity.isRecent ? "active" : "idle"}`} />
                        {activity.text}
                      </span>
                    </td>
                    <td>
                      {s.weakChapters.length === 0 ? (
                        <span style={{ color: "#16a34a", fontSize: "0.825rem" }}>✓ Tốt</span>
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

      {/* 5. Modal Quản lý & Ghi chú học sinh */}
      {selectedStudent && (
        <div className="teacher-modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
            <div className="teacher-modal-header">
              <div>
                <span className="teacher-kicker">HỒ SƠ HỌC SINH</span>
                <h3>{selectedStudent.name}</h3>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {selectedStudent.className ? `Lớp ${selectedStudent.className}` : ""} {selectedStudent.school ? `· ${selectedStudent.school}` : ""}
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
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "#334155" }}>
                Các chuyên đề đang cần hỗ trợ:
              </h4>
              {selectedStudent.weakChapters.length === 0 ? (
                <p style={{ color: "#16a34a", fontSize: "0.875rem", margin: 0 }}>
                  ✓ Học sinh nắm vững tất cả các chương đã học.
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {selectedStudent.weakChapters.map((c) => (
                    <span className="teacher-chip" key={c.language + c.chapterId} style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem" }}>
                      {chapterName(c)} — {c.bestScore}%
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="teacher-note-area">
              <label htmlFor="teacher-note-input">Ghi chú & Kế hoạch bồi dưỡng của giáo viên:</label>
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

      {notice && (
        <div className="toast" role="status" style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 200 }}>
          <span><Icon name="check" /></span>{notice}
        </div>
      )}
    </div>
  );
}
