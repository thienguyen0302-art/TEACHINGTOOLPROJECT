import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../hooks/useNotice";
import { curriculum, LANG_BY_KEY } from "../data/curriculum";
import { firstName, greeting, todayText } from "../utils/format";
import { calcStreak, weekSummary } from "../utils/activity";
import { getLocalChapterState } from "../services/progressService";

const TONES = ["blue", "purple", "cyan", "orange"];
const ICONS = ["code", "check", "clock", "grid"];

// Trang "Tiến độ của tôi" (màn hình Dashboard trong thiết kế).
// Thật: tên, ngôn ngữ, 4 chương đầu + tiến độ, thời gian học, độ chính xác. Mẫu: chuỗi ngày, biểu đồ tuần.
export default function Dashboard({ user, lang, data }) {
  const nav = useNavigate();
  const notice = useNotice();
  const label = LANG_BY_KEY[lang];
  const list = curriculum[label];
  const contentByOrder = Object.fromEntries(data.chapters.map((c) => [c.order, c.id]));
  const progressById = Object.fromEntries(data.rows.map((r) => [r.chapterId, r]));

  const all = list.map((c, i) => {
    const id = contentByOrder[i + 1];
    let p = id ? progressById[id] : undefined;
    if (id && (!p || !p.completed)) {
      const local = getLocalChapterState(data?.profile?.uid, lang, id);
      if (local && (!p || (local.progressPercent ?? 0) > (p.progressPercent ?? 0) || local.completed)) {
        p = { ...p, ...local };
      }
    }
    const progress = p?.completed ? 100 : p ? Math.max(0, Math.min(99, Math.round(p.progressPercent ?? p.bestScore ?? 0))) : 0;
    return { ...c, n: i + 1, id, progress };
  });
  // Hiển thị 4 chương bắt đầu từ chương chưa hoàn thành đầu tiên (không cố định 4 chương đầu).
  const resumeIndex = Math.max(0, all.findIndex((c) => c.id && c.progress < 100));
  const cards = all.slice(resumeIndex, resumeIndex + 4);
  const resume = all[resumeIndex];
  const week = weekSummary(data.daily);
  const streak = calcStreak(data.daily);
  const maxSeconds = Math.max(...week.days.map((d) => d.seconds), 1);

  const hours = ((data.profile.studySeconds || 0) / 3600).toFixed(1);
  const avg = data.rows.length
    ? Math.round(data.rows.reduce((s, r) => s + (r.bestScore || 0), 0) / data.rows.length)
    : 0;

  const open = (c) => (c.id ? nav(`/lesson/${c.id}`) : notice(`Chương ${c.n} đang được biên soạn`));

  return (
    <div className="content">
      <section className="welcome">
        <div>
          <p>{todayText()}</p>
          <h1>{greeting()}, {firstName(user)}!</h1>
          <span>Tiếp tục hành trình chinh phục Tin học nhé.</span>
        </div>
        <div className="streak-card">
          <span><Icon name="fire" /></span>
          <div><small>Chuỗi ngày học</small><strong>{streak} <em>ngày</em></strong></div>
        </div>
      </section>

      <section className="resume-card">
        <div className="resume-art" aria-hidden="true">
          <span className="code-chip">&lt;/&gt;</span><i>{"{ }"}</i><b>01</b>
        </div>
        <div className="resume-copy">
          <span className="resume-eyebrow">Tiếp tục bài học</span>
          <h2>{resume.title}</h2>
          <p>Chương {resume.n} · {label}</p>
          <div className="resume-progress">
            <div><span>Tiến độ chương</span><strong>{resume.progress}%</strong></div>
            <div className="progress-track"><span style={{ width: `${resume.progress}%` }} /></div>
          </div>
          <button onClick={() => open(resume)}><span><Icon name="play" /></span>Học tiếp</button>
        </div>
      </section>

      <div className="section-heading">
        <div><span>Lộ trình của bạn</span><h2>Chương trình học {label}</h2></div>
        <button onClick={() => nav("/curriculum")}>Xem tất cả {list.length} chương <Icon name="chevron" /></button>
      </div>

      <div className="chapter-grid">
        {cards.map((c, i) => (
          <article className="chapter-card" key={c.title} onClick={() => open(c)}>
            <div className={`chapter-icon ${TONES[i]}`}><Icon name={ICONS[i]} /></div>
            <span className="chapter-number">Chương {String(c.n).padStart(2, "0")}</span>
            <h3>{c.title}</h3>
            <p>
              <span><Icon name="book" />{c.lessons} bài học</span>
              <span><Icon name="clock" />{c.duration}</span>
            </p>
            <div className="chapter-progress">
              <div><span>Tiến độ</span><strong>{c.progress}%</strong></div>
              <div className="progress-track"><span style={{ width: `${c.progress}%` }} /></div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); open(c); }}>
              {c.progress ? "Tiếp tục học" : "Bắt đầu học"} <Icon name="chevron" />
            </button>
          </article>
        ))}
      </div>

      <section className="bottom-grid">
        <div className="activity-card">
          <div className="card-title">
            <div><span>Hoạt động học tập</span><h2>Tuần này của bạn</h2></div>
            <button onClick={() => notice(`Tuần này bạn học ${week.activeCount}/7 ngày`)}>Tuần này <Icon name="chevron" /></button>
          </div>
          <div className="chart">
            {week.days.map((day) => (
              <div key={day.key} title={`${Math.round(day.seconds / 60)} phút`}>
                <span style={{ height: `${Math.max(4, Math.round((day.seconds / maxSeconds) * 100))}%` }} className={day.isToday ? "peak" : ""} />
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="summary-card">
          <span>Thành tích của bạn</span>
          <h2>Bạn đang làm rất tốt!</h2>
          <div className="summary-stats">
            <div><strong>{data.rows.length}</strong><small>Chương đã làm</small></div>
            <div><strong>{hours}h</strong><small>Thời gian học</small></div>
            <div><strong>{avg}%</strong><small>Điểm trung bình</small></div>
          </div>
        </div>
      </section>
    </div>
  );
}
