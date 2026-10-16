import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { calcStreak, monthGrid, weekSummary } from "../utils/activity";
import { firstName, fmtTime } from "../utils/format";
import {
  subscribeGoals,
  saveGoal,
  toggleGoalCompleted,
  deleteGoal,
  getDueGoals,
} from "../services/goalService";
import { useNotice } from "../hooks/useNotice";
import "./Schedule.css";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const GOAL_TYPES = {
  practice: { label: "Bài tập Code", cls: "practice" },
  exam:     { label: "Luyện đề HSG", cls: "exam" },
  theory:   { label: "Lý thuyết", cls: "theory" },
  time:     { label: "Thời lượng", cls: "time" },
  custom:   { label: "Khác", cls: "custom" },
};

function formatGoalDate(dateStr) {
  if (!dateStr) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return { text: "Hôm nay", isToday: true, isOverdue: false };
  if (dateStr < today)   return { text: `Quá hạn (${dateStr})`, isToday: false, isOverdue: true };
  const [y, m, d] = dateStr.split("-");
  return { text: `${d}/${m}/${y}`, isToday: false, isOverdue: false };
}

export default function Schedule({ user, data }) {
  const nav = useNavigate();
  const notice = useNotice();

  // Calendar Activity
  const month = monthGrid(data.daily);
  const week = weekSummary(data.daily);
  const streak = calcStreak(data.daily);
  const today = month.days.find((d) => d.isToday);
  const [selectedKey, setSelectedKey] = useState(today?.key);
  const selected = month.days.find((d) => d.key === selectedKey) ?? today;

  // Study Goals state
  const [goals, setGoals] = useState([]);
  const [goalFilter, setGoalFilter] = useState("all"); // 'all' | 'active' | 'completed'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Modal Form State
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("practice");
  const [formValue, setFormValue] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Subscribe to personal goals
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeGoals(user.uid, (list) => {
      setGoals(list || []);
    });
    return () => unsub?.();
  }, [user?.uid]);

  // Goals due today or overdue
  const dueGoals = useMemo(() => getDueGoals(goals), [goals]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (goalFilter === "active") return !g.completed;
      if (goalFilter === "completed") return g.completed;
      return true;
    });
  }, [goals, goalFilter]);

  const activeCount = goals.filter((g) => !g.completed).length;
  const completedCount = goals.filter((g) => g.completed).length;

  function openCreateModal() {
    setEditingGoal(null);
    setFormTitle("");
    setFormType("practice");
    setFormValue("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNotes("");
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(goal) {
    setEditingGoal(goal);
    setFormTitle(goal.title || "");
    setFormType(goal.targetType || "practice");
    setFormValue(goal.targetValue || "");
    setFormDate(goal.targetDate || new Date().toISOString().slice(0, 10));
    setFormNotes(goal.notes || "");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Vui lòng nhập tên mục tiêu");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await saveGoal(user.uid, {
        id: editingGoal?.id,
        title: formTitle,
        targetType: formType,
        targetValue: formValue,
        targetDate: formDate,
        notes: formNotes,
        completed: editingGoal?.completed || false,
      });
      setIsModalOpen(false);
      notice(editingGoal ? "Đã cập nhật mục tiêu" : "Đã thêm mục tiêu học tập mới");
    } catch (err) {
      setFormError("Lỗi lưu mục tiêu: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(goal) {
    const next = !goal.completed;
    await toggleGoalCompleted(user.uid, goal.id, next);
    notice(next ? `🎉 Xuất sắc! Bạn đã hoàn thành: ${goal.title}` : "Đã mở lại mục tiêu");
  }

  async function handleDelete(goalId) {
    if (window.confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) {
      await deleteGoal(user.uid, goalId);
      notice("Đã xóa mục tiêu");
    }
  }

  return (
    <div className="content calendar-page">
      {/* ── Banner Hero ── */}
      <section className="calendar-hero">
        <div>
          <span><Icon name="calendar" /> Kế hoạch học tập</span>
          <h1>Lịch học của {firstName(user)}</h1>
          <p>Theo dõi những ngày bạn đã học, lập mục tiêu cá nhân và giữ nhịp ôn luyện đều đặn mỗi ngày.</p>
        </div>
        <div>
          <strong>{month.studiedDays}</strong>
          <span>ngày đã học trong {month.title.toLowerCase()}</span>
          <button onClick={() => nav("/curriculum")}>Học tiếp</button>
        </div>
      </section>

      {/* ── Nhắc nhở mục tiêu đến hạn hôm nay ── */}
      {dueGoals.length > 0 && (
        <div className="calendar-reminder-banner" role="alert">
          <div className="calendar-reminder-left">
            <div className="calendar-reminder-icon">
              <Icon name="bell" />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 14 }}>
                🔔 Nhắc nhở: Bạn có {dueGoals.length} mục tiêu cần hoàn thành hôm nay!
              </strong>
              <span style={{ fontSize: 12 }}>
                {dueGoals.slice(0, 2).map((g) => g.title).join(" · ")}
                {dueGoals.length > 2 ? ` và ${dueGoals.length - 2} mục tiêu khác.` : ""}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-add-goal"
            style={{ fontSize: 12, padding: "6px 14px", whiteSpace: "nowrap" }}
            onClick={() => {
              setGoalFilter("active");
              const el = document.getElementById("goals-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Xem mục tiêu
          </button>
        </div>
      )}

      {/* ── Lịch tháng & Chi tiết ngày ── */}
      <div className="calendar-layout">
        <section className="month-calendar-card">
          <div className="calendar-card-heading">
            <div><span>{month.title}</span><h2>Lịch học trong tháng</h2></div>
            <strong>{fmtTime(month.totalSeconds)}</strong>
          </div>
          <div className="month-weekdays">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="month-days">
            {Array.from({ length: month.offset }, (_, i) => <i key={`e${i}`} />)}
            {month.days.map((d) => (
              <button
                key={d.key}
                className={`${d.isToday ? "today" : ""} ${d.level === 2 ? "strong" : d.level === 1 ? "studied" : ""} ${d.key === selected?.key ? "selected" : ""}`}
                onClick={() => setSelectedKey(d.key)}
              >
                <span>{d.day}</span>
              </button>
            ))}
          </div>
          <div className="calendar-legend">
            <span><i className="none" />Chưa học</span><span><i className="studied" />Đã học</span><span><i className="strong" />Trên 60 phút</span>
          </div>
        </section>

        <section className="calendar-agenda">
          <div className="calendar-card-heading">
            <div><span>Ngày {selected?.day} tháng {month.month}</span><h2>{selected?.isToday ? "Hôm nay" : "Chi tiết ngày"}</h2></div>
          </div>
          <div className="agenda-day">
            <strong>{selected?.level ? fmtTime(selected.seconds) : selected?.isFuture ? "Chưa tới" : "Chưa học"}</strong>
            <small>
              {selected?.level
                ? selected.level === 2 ? "Ngày học tích cực, trên 60 phút." : "Đã học, giữ nhịp nhé."
                : selected?.isFuture ? "Ngày này chưa diễn ra." : "Không có hoạt động học ngày này."}
            </small>
            {selected?.isToday && <button onClick={() => nav("/curriculum")}>Bắt đầu học</button>}
          </div>
          <div className="agenda-progress">
            <span><Icon name="check" /></span>
            <div>
              <strong>{week.activeCount}/7 ngày trong tuần này</strong>
              <small>Chuỗi hiện tại: {streak} ngày.</small>
              <div><i style={{ width: `${Math.round((week.activeCount / 7) * 100)}%` }} /></div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Phần Tự Thêm Mục Tiêu Học Tập & App Nhắc Nhở ── */}
      <section id="goals-section" className="calendar-goals-section">
        <div className="calendar-goals-card">
          <div className="calendar-card-heading">
            <div>
              <span>TỰ ĐẶT MỤC TIÊU &amp; NHẮC NHỞ</span>
              <h2>Kế hoạch &amp; Mục tiêu ôn luyện</h2>
            </div>
            <button
              type="button"
              className="btn-add-goal"
              onClick={openCreateModal}
            >
              + Thêm mục tiêu mới
            </button>
          </div>

          {/* Toolbar & Bộ lọc */}
          <div className="goals-toolbar">
            <div className="goals-tabs">
              <button
                type="button"
                className={`goals-tab-btn ${goalFilter === "all" ? "active" : ""}`}
                onClick={() => setGoalFilter("all")}
              >
                Tất cả ({goals.length})
              </button>
              <button
                type="button"
                className={`goals-tab-btn ${goalFilter === "active" ? "active" : ""}`}
                onClick={() => setGoalFilter("active")}
              >
                Đang thực hiện ({activeCount})
              </button>
              <button
                type="button"
                className={`goals-tab-btn ${goalFilter === "completed" ? "active" : ""}`}
                onClick={() => setGoalFilter("completed")}
              >
                Đã hoàn thành ({completedCount})
              </button>
            </div>

            <div style={{ fontSize: 13, color: "var(--ps-text-sub, #64748b)", fontWeight: 600 }}>
              {dueGoals.length > 0 && (
                <span style={{ color: "#ea580c", fontWeight: 700 }}>
                  ⏰ {dueGoals.length} mục tiêu đến hạn hôm nay
                </span>
              )}
            </div>
          </div>

          {/* Danh sách mục tiêu */}
          <div className="goals-list">
            {filteredGoals.map((g) => {
              const dateInfo = formatGoalDate(g.targetDate);
              const typeCfg = GOAL_TYPES[g.targetType] || GOAL_TYPES.custom;

              return (
                <div
                  key={g.id}
                  className={`goal-item ${g.completed ? "completed" : ""}`}
                >
                  <div className="goal-item-left">
                    <input
                      type="checkbox"
                      className="goal-checkbox"
                      checked={g.completed}
                      onChange={() => handleToggle(g)}
                      title={g.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}
                      aria-label={g.title}
                    />

                    <div className="goal-content">
                      <h4 className="goal-title">{g.title}</h4>
                      <div className="goal-meta">
                        <span className={`goal-tag ${typeCfg.cls}`}>
                          {typeCfg.label}
                        </span>
                        {g.targetValue && (
                          <span style={{ fontWeight: 700, color: "var(--ps-text-main, #334155)" }}>
                            • {g.targetValue}
                          </span>
                        )}
                        <span
                          className={`goal-date-badge ${
                            dateInfo.isToday ? "today" : dateInfo.isOverdue ? "overdue" : ""
                          }`}
                        >
                          📅 Hạn: {dateInfo.text}
                        </span>
                        {g.notes && (
                          <span style={{ fontStyle: "italic", opacity: 0.85 }}>
                            “{g.notes}”
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="goal-actions">
                    <button
                      type="button"
                      className="goal-btn-icon"
                      onClick={() => openEditModal(g)}
                      title="Chỉnh sửa mục tiêu"
                    >
                      <Icon name="code" />
                    </button>
                    <button
                      type="button"
                      className="goal-btn-icon delete"
                      onClick={() => handleDelete(g.id)}
                      title="Xóa mục tiêu"
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredGoals.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ps-text-sub, #64748b)" }}>
                <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>
                  {goalFilter === "completed"
                    ? "Bạn chưa có mục tiêu nào hoàn thành."
                    : goalFilter === "active"
                    ? "Hiện không có mục tiêu đang thực hiện."
                    : "Bạn chưa đặt mục tiêu học tập nào."}
                </p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  Tự đặt mục tiêu giúp bạn rèn luyện kỷ luật và app sẽ gửi nhắc nhở để bạn không bỏ lỡ!
                </p>
                {goalFilter !== "completed" && (
                  <button
                    type="button"
                    className="btn-add-goal"
                    style={{ marginTop: 16 }}
                    onClick={openCreateModal}
                  >
                    + Đặt mục tiêu đầu tiên
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Modal Thêm / Chỉnh sửa Mục tiêu ── */}
      {isModalOpen && (
        <div
          className="tch-code-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="tch-code-modal"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tch-code-modal-header">
              <div>
                <h3 className="tch-code-modal-title">
                  {editingGoal ? "Chỉnh sửa mục tiêu" : "Đặt mục tiêu học tập mới"}
                </h3>
                <small style={{ color: "var(--ps-text-sub, #64748b)" }}>
                  App sẽ tự động nhắc nhở bạn khi đến ngày hạn chót
                </small>
              </div>
              <button
                type="button"
                className="teacher-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal}>
              <div className="tch-code-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {formError && <p className="err" style={{ margin: 0 }}>{formError}</p>}

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Tên mục tiêu <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Giải 3 bài Quy hoạch động mảng, Luyện đề HSG Số 2..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                      Loại mục tiêu
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    >
                      <option value="practice">Bài tập Code</option>
                      <option value="exam">Luyện đề HSG</option>
                      <option value="theory">Chuyên đề Lý thuyết</option>
                      <option value="time">Thời lượng học</option>
                      <option value="custom">Mục tiêu khác</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                      Chỉ tiêu số lượng
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 3 bài, 60 phút, 1 đề..."
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Ngày hoàn thành (Hạn chót nhắc nhở)
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
                    Ghi chú thêm
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú phương pháp, test case cần chú ý..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              <div className="tch-code-modal-footer">
                <button
                  type="button"
                  className="teacher-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-add-goal"
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : editingGoal ? "Cập nhật" : "Tạo mục tiêu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
