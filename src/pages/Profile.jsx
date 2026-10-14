import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../hooks/useNotice";
import { saveProfile } from "../services/progressService";
import { calcStreak, monthGrid } from "../utils/activity";
import { displayName, fmtTime, initials, LANG_LABEL } from "../utils/format";
import { isProfileComplete, PROFILE_FIELDS } from "../utils/profile";
import "./Profile.css";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const PLACEHOLDERS = {
  displayName: "Ví dụ: Nguyễn Minh Anh",
  school: "Ví dụ: THCS Hạ Long",
  className: "Ví dụ: 9A2",
  province: "Ví dụ: Quảng Ninh",
  district: "Ví dụ: Thành phố Hạ Long",
};

function ProfileForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() => Object.fromEntries(PROFILE_FIELDS.map(([k]) => [k, initial[k] ?? ""])));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
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
      <form className="pf-modal" onSubmit={submit}>
        <h2 id="pf-title">Hồ sơ học viên</h2>
        <p>Thông tin này giúp giáo viên nhận ra bạn trong lớp.</p>
        <div className="pf-fields">
          {PROFILE_FIELDS.map(([key, label]) => (
            <label key={key} className={key === "displayName" || key === "school" ? "full" : ""}>
              <span>{label[0].toUpperCase() + label.slice(1)} <em>*</em></span>
              <input
                required
                maxLength={80}
                value={form[key]}
                placeholder={PLACEHOLDERS[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {error && <p className="pf-error">{error}</p>}
        <div className="pf-actions">
          <button type="button" className="ghost" onClick={onCancel} disabled={saving}>Để sau</button>
          <button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button>
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

  const p = data.profile;
  const complete = isProfileComplete(p);
  const showForm = editing || (!data.loading && !complete && !dismissed);

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
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="profile-large-avatar">{initials(user)}</div>
          <div>
            <span className="profile-label">Hồ sơ học viên</span>
            <h1>{displayName(user)}</h1>
            <p>{p.school || "Chưa cập nhật trường"}{p.className ? ` · Lớp ${p.className}` : ""}</p>
            <small><Icon name="globe" /> {[p.district, p.province].filter(Boolean).join(", ") || "Chưa cập nhật địa phương"}</small>
          </div>
        </div>
        <div className="profile-hero-actions">
          <div><span>Lộ trình hiện tại</span><strong>{LANG_LABEL[lang] ?? lang}</strong></div>
          <button onClick={() => setEditing(true)}>Chỉnh sửa hồ sơ</button>
        </div>
      </section>

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

      {showForm && (
        <ProfileForm
          initial={p}
          onCancel={() => { setEditing(false); setDismissed(true); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
