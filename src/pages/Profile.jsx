import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import { useNotice } from "../hooks/useNotice";
import { saveProfile } from "../services/progressService";
import { calcStreak, monthGrid } from "../utils/activity";
import { displayName, fmtTime, initials, LANG_LABEL } from "../utils/format";
import { isProfileComplete, validateProfileFields, VIETNAM_PROVINCES } from "../utils/profile";
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "../services/notificationSettingsService";
import "./Profile.css";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function ProfileForm({ initial = {}, onCancel, onSave, onLogout, isMandatory = false, isTeacher = false }) {
  const [form, setForm] = useState(() => ({
    displayName: initial.displayName ?? "",
    province: initial.province ?? "",
    className: initial.className ?? "",
    school: initial.school ?? "",
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleChange(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    const errors = validateProfileFields(form, isTeacher);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
    } catch (e) {
      setError(e.code === "permission-denied" ? "Không có quyền lưu hồ sơ. Hãy đăng nhập lại." : e.message || "Không lưu được hồ sơ.");
      setSaving(false);
    }
  }

  return (
    <div className="pf-overlay" role="dialog" aria-modal="true" aria-labelledby="pf-title">
      <form className="pf-modal" onSubmit={submit} noValidate>
        <div className="pf-header">
          <div className="pf-header-top">
            <div className="pf-brand">
              <span className="pf-brand-logo"><Logo /></span>
              <span className="pf-brand-text">Peanut<span>Code</span></span>
            </div>
            <div className="pf-kicker">
              <span className="pf-kicker-dot" />
              {isTeacher ? "KHÔNG GIAN GIÁO VIÊN" : "BẮT ĐẦU HÀNH TRÌNH CỦA BẠN"}
            </div>
          </div>
          <h2 id="pf-title" className="pf-title">
            {isTeacher ? "Hồ sơ giáo viên" : isMandatory ? "Hoàn tất thông tin cá nhân" : "Hồ sơ học viên"}
          </h2>
          <p className="pf-desc">
            {isTeacher
              ? "Cập nhật họ tên và đơn vị công tác của thầy cô."
              : isMandatory
              ? "Vui lòng nhập đầy đủ thông tin bên dưới để bắt đầu học và ghi nhận kết quả."
              : "Thông tin này giúp giáo viên nhận ra bạn trong lớp học và trên bảng xếp hạng."}
          </p>
        </div>

        <div className="pf-fields">
          {/* Họ và tên: toàn chiều rộng */}
          <div className="pf-field pf-field-full">
            <label htmlFor="pf-displayName">
              Họ và tên <em>*</em>
            </label>
            <input
              id="pf-displayName"
              name="displayName"
              autoComplete="name"
              className={fieldErrors.displayName ? "has-error" : ""}
              maxLength={80}
              value={form.displayName}
              placeholder={isTeacher ? "Ví dụ: Thầy Hoàng Nam" : "Ví dụ: Nguyễn Minh Anh"}
              onChange={(e) => handleChange("displayName", e.target.value)}
            />
            {fieldErrors.displayName && (
              <span className="pf-field-error">{fieldErrors.displayName}</span>
            )}
          </div>

          {/* Tỉnh / thành phố */}
          <div className={`pf-field ${isTeacher ? "pf-field-full" : ""}`}>
            <label htmlFor="pf-province">
              Tỉnh / thành phố <em>*</em>
            </label>
            <select
              id="pf-province"
              name="province"
              className={fieldErrors.province ? "has-error" : ""}
              value={form.province}
              onChange={(e) => handleChange("province", e.target.value)}
            >
              <option value="">-- Chọn tỉnh / thành phố --</option>
              {VIETNAM_PROVINCES.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
            {fieldErrors.province && (
              <span className="pf-field-error">{fieldErrors.province}</span>
            )}
          </div>

          {/* Lớp: Chỉ dành cho học sinh */}
          {!isTeacher && (
            <div className="pf-field">
              <label htmlFor="pf-className">
                Lớp <em>*</em>
              </label>
              <input
                id="pf-className"
                name="className"
                className={fieldErrors.className ? "has-error" : ""}
                maxLength={80}
                value={form.className}
                placeholder="Ví dụ: 9A2"
                onChange={(e) => handleChange("className", e.target.value)}
              />
              {fieldErrors.className && (
                <span className="pf-field-error">{fieldErrors.className}</span>
              )}
            </div>
          )}

          {/* Tên trường / đơn vị: toàn chiều rộng */}
          <div className="pf-field pf-field-full">
            <label htmlFor="pf-school">
              {isTeacher ? "Trường / Đơn vị công tác" : "Tên trường"} <em>*</em>
            </label>
            <input
              id="pf-school"
              name="school"
              className={fieldErrors.school ? "has-error" : ""}
              maxLength={80}
              value={form.school}
              placeholder={isTeacher ? "Ví dụ: THPT Chuyên Lê Hồng Phong" : "Ví dụ: THCS Chu Văn An"}
              onChange={(e) => handleChange("school", e.target.value)}
            />
            {fieldErrors.school && (
              <span className="pf-field-error">{fieldErrors.school}</span>
            )}
          </div>
        </div>

        {error && <p className="pf-error">{error}</p>}

        <div className="pf-actions">
          {isMandatory && onLogout && (
            <button
              type="button"
              className="pf-btn-secondary"
              onClick={onLogout}
              disabled={saving}
            >
              Đăng xuất
            </button>
          )}
          {!isMandatory && (
            <button
              type="button"
              className="pf-btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Hủy
            </button>
          )}
          <button type="submit" className="pf-btn-primary" disabled={saving}>
            <span>{saving ? "Đang lưu..." : isMandatory ? "Lưu và tiếp tục" : "Lưu hồ sơ"}</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14m-5-5 5 5-5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// Hồ sơ học viên: thông tin cá nhân + thống kê thật + điểm danh tháng từ thời gian học mỗi ngày.
export default function Profile({ user, uid, lang, data }) {
  const nav = useNavigate();
  const notice = useNotice();
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [notifSettings, setNotifSettings] = useState(() => getNotificationSettings(uid));

  function updateNotif(key, val) {
    const next = saveNotificationSettings(uid, { [key]: val });
    setNotifSettings(next);
    notice("Đã lưu cài đặt thông báo");
  }

  const p = data.profile;
  const isTeacher = p.role === "teacher";
  const complete = isProfileComplete(p);
  const showForm = editing || (!isTeacher && !data.loading && !complete && !dismissed);

  const month = monthGrid(data.daily);
  const streak = calcStreak(data.daily);
  const done = data.rows.filter((r) => r.completed).length;
  const scores = data.rows.map((r) => r.bestScore || 0);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  async function handleSave(form) {
    await saveProfile(uid, form);
    await data.reload();
    setEditing(false);
    notice("Đã lưu hồ sơ");
  }

  const stats = [
    { icon: "check", cls: "solved", label: "Chương đã hoàn thành", value: done, unit: `/ ${data.chapters.length} chương` },
    { icon: "trophy", cls: "xp", label: "Điểm quiz trung bình", value: avg, unit: "%" },
    { icon: "clock", cls: "hours", label: "Tổng thời gian học", value: fmtTime(p.studySeconds || 0), unit: "" },
    { icon: "fire", cls: "position", label: "Chuỗi ngày học", value: streak, unit: "ngày" },
  ];

  return (
    <div className="content profile-page">
      {/* ── THÔNG TIN CÁ NHÂN (HERO) ── */}
      {isTeacher ? (
        <section className="profile-hero">
          <div className="profile-identity">
            <div className="profile-large-avatar">{initials(user)}</div>
            <div>
              <span className="profile-label" style={{ background: "#2563eb", color: "#fff" }}>Hồ sơ Giáo viên</span>
              <h1>{displayName(user)}</h1>
              <p>{p.school || "Chưa cập nhật đơn vị công tác"}</p>
              <small><Icon name="globe" /> {p.province || "Chưa cập nhật địa phương"} · {user?.email}</small>
            </div>
          </div>
          <div className="profile-hero-actions">
            <button onClick={() => setEditing(true)}>Chỉnh sửa thông tin</button>
          </div>
        </section>
      ) : (
        <section className="profile-hero">
          <div className="profile-identity">
            <div className="profile-large-avatar">{initials(user)}</div>
            <div>
              <span className="profile-label">Hồ sơ học viên</span>
              <h1>{displayName(user)}</h1>
              <p>{p.school || "Chưa cập nhật trường"}{p.className ? ` · Lớp ${p.className}` : ""}</p>
              <small><Icon name="globe" /> {p.province || "Chưa cập nhật địa phương"}</small>
            </div>
          </div>
          <div className="profile-hero-actions">
            <div><span>Lộ trình hiện tại</span><strong>{LANG_LABEL[lang] ?? lang}</strong></div>
            <button onClick={() => setEditing(true)}>Chỉnh sửa hồ sơ</button>
          </div>
        </section>
      )}

      {/* ── KHÔNG GIAN QUẢN LÝ (CHỈ DÀNH CHO GIÁO VIÊN) ── */}
      {isTeacher && (
        <section className="profile-card" style={{ marginTop: "24px", padding: "24px", borderRadius: "16px", background: "var(--ps-surface, #fff)", border: "1px solid var(--ps-border, #e2e8f0)" }}>
          <h2 style={{ fontSize: "18px", margin: "0 0 16px", fontWeight: 800 }}>Không gian Quản lý Giảng dạy &amp; HSG</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <button
              type="button"
              onClick={() => nav("/teacher")}
              style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <strong style={{ color: "#2563eb", fontSize: "15px" }}>📊 Quản trị lớp học</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>Theo dõi tiến độ, bài tập và chuyên cần học sinh</small>
            </button>
            <button
              type="button"
              onClick={() => nav("/teacher/students")}
              style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <strong style={{ color: "#059669", fontSize: "15px" }}>👥 Quản lý học sinh</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>Quản lý tài khoản, mã học sinh và hỗ trợ</small>
            </button>
            <button
              type="button"
              onClick={() => nav("/teacher/contest-history")}
              style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <strong style={{ color: "#d97706", fontSize: "15px" }}>🏆 Tổng hợp Contest HSG</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>Bảng điểm, bài nộp chi tiết và export Excel</small>
            </button>
            <button
              type="button"
              onClick={() => nav("/ranking")}
              style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <strong style={{ color: "#7c3aed", fontSize: "15px" }}>🥇 Bảng xếp hạng Contest</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>BXH đồng bộ thời gian thực toàn hệ thống</small>
            </button>
          </div>
        </section>
      )}

      {/* ── TIẾN ĐỘ & ĐIỂM DANH (CHỈ HIỂN THỊ VỚI HỌC SINH) ── */}
      {!isTeacher && (
        <>
          <section className="profile-stat-grid">
            {stats.map((s) => (
              <article key={s.label}>
                <span className={`profile-stat-icon ${s.cls}`}><Icon name={s.icon} /></span>
                <div><small>{s.label}</small><strong>{s.value} <em>{s.unit}</em></strong></div>
              </article>
            ))}
          </section>

          <section className="attendance-card">
            <div className="profile-section-heading">
              <div><span>Chuyên cần</span><h2>Bảng điểm danh {month.title.toLowerCase()}</h2></div>
              <strong>{month.studiedDays}/{month.days.length} ngày</strong>
            </div>
            <div className="attendance-weekdays">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="attendance-calendar">
              {Array.from({ length: month.offset }, (_, i) => <i className="empty" key={`e${i}`} />)}
              {month.days.map((d) => (
                <button
                  key={d.key}
                  className={`${d.level === 2 ? "strong" : d.level === 1 ? "studied" : ""} ${d.isToday ? "today" : ""}`}
                  onClick={() => notice(d.level ? `Ngày ${d.day}: đã học ${Math.round(d.seconds / 60)} phút` : d.isFuture ? `Ngày ${d.day}: chưa tới` : `Ngày ${d.day}: chưa có hoạt động học`)}
                  aria-label={`Ngày ${d.day}`}
                >
                  {d.day}
                </button>
              ))}
            </div>
            <div className="attendance-legend">
              <span><i />Chưa học</span><span><i className="studied" />Đã học</span><span><i className="strong" />Trên 60 phút</span>
            </div>
            <div className="attendance-streak">
              <span><Icon name="fire" /></span>
              <div><strong>{streak} ngày liên tiếp</strong><small>Học ít nhất 1 phút mỗi ngày để giữ chuỗi.</small></div>
              <button onClick={() => nav("/calendar")}>Xem lịch học</button>
            </div>
          </section>
        </>
      )}

      {/* ── Cài đặt Thông báo ── */}
      <section className="profile-card" style={{ marginTop: "24px", padding: "24px", borderRadius: "16px", background: "var(--ps-surface, #fff)", border: "1px solid var(--ps-border, #e2e8f0)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: "0 0 4px", fontWeight: 800 }}>Cài đặt Thông báo</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ps-text-sub, #64748b)" }}>Tùy chỉnh quyền nhận thông báo trên PeanutCode</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>

          {/* Nhận thông báo chung */}
          <div style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong style={{ display: "block", fontSize: "14px", marginBottom: "2px" }}>Nhận thông báo</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>{notifSettings.enabled ? "Đang bật thông báo" : "Đã tắt tất cả thông báo"}</small>
            </div>
            <label className="contest-checkbox" style={{ cursor: "pointer", margin: 0 }}>
              <input
                type="checkbox"
                checked={notifSettings.enabled}
                onChange={(e) => updateNotif("enabled", e.target.checked)}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </label>
          </div>

          {/* Nhắc nhở mục tiêu học tập */}
          <div style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong style={{ display: "block", fontSize: "14px", marginBottom: "2px" }}>Nhắc nhở mục tiêu</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>Thông báo mục tiêu đến hạn trong ngày</small>
            </div>
            <label className="contest-checkbox" style={{ cursor: "pointer", margin: 0 }}>
              <input
                type="checkbox"
                disabled={!notifSettings.enabled}
                checked={notifSettings.enabled && notifSettings.goalReminders}
                onChange={(e) => updateNotif("goalReminders", e.target.checked)}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </label>
          </div>

          {/* Âm thanh thông báo */}
          <div style={{ padding: "16px", borderRadius: "12px", background: "var(--ps-bg, #f8fafc)", border: "1px solid var(--ps-border, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong style={{ display: "block", fontSize: "14px", marginBottom: "2px" }}>Âm thanh thông báo</strong>
              <small style={{ color: "var(--ps-text-sub, #64748b)" }}>Phát âm thanh khi có bài thi/thông báo mới</small>
            </div>
            <label className="contest-checkbox" style={{ cursor: "pointer", margin: 0 }}>
              <input
                type="checkbox"
                disabled={!notifSettings.enabled}
                checked={notifSettings.enabled && notifSettings.sound}
                onChange={(e) => updateNotif("sound", e.target.checked)}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
            </label>
          </div>
        </div>
      </section>

      {showForm && (
        <ProfileForm
          initial={p}
          isTeacher={isTeacher}
          onCancel={() => { setEditing(false); setDismissed(true); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
