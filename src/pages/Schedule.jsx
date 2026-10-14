import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { calcStreak, monthGrid, weekSummary } from "../utils/activity";
import { firstName, fmtTime } from "../utils/format";
import "./Schedule.css";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Lịch học: lịch tháng thể hiện thời gian học thật mỗi ngày + chi tiết ngày đang chọn.
export default function Schedule({ user, data }) {
  const nav = useNavigate();
  const month = monthGrid(data.daily);
  const week = weekSummary(data.daily);
  const streak = calcStreak(data.daily);
  const today = month.days.find((d) => d.isToday);
  const [selectedKey, setSelectedKey] = useState(today?.key);
  const selected = month.days.find((d) => d.key === selectedKey) ?? today;

  return (
    <div className="content calendar-page">
      <section className="calendar-hero">
        <div>
          <span><Icon name="calendar" /> Kế hoạch học tập</span>
          <h1>Lịch học của {firstName(user)}</h1>
          <p>Theo dõi những ngày bạn đã học và giữ nhịp học đều mỗi tuần.</p>
        </div>
        <div>
          <strong>{month.studiedDays}</strong>
          <span>ngày đã học trong {month.title.toLowerCase()}</span>
          <button onClick={() => nav("/curriculum")}>Học tiếp</button>
        </div>
      </section>

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
    </div>
  );
}
