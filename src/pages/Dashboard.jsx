import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../components/AppShell";
import { curriculum, LANG_BY_KEY } from "../data/curriculum";
import { firstName, greeting, todayText } from "../utils/format";

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

  const cards = list.slice(0, 4).map((c, i) => {
    const id = contentByOrder[i + 1];
    const p = id ? progressById[id] : undefined;
    const progress = p?.completed ? 100 : p ? Math.min(99, Math.round(p.bestScore || 0)) : 0;
    return { ...c, n: i + 1, id, progress };
  });
  const resume = cards.find((c) => c.id && c.progress < 100) || cards[0];

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
          <div><strong>5 ngày</strong><small>Chuỗi học liên tiếp</small></div>
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
            <button onClick={() => notice("Thống kê theo ngày đang được cập nhật")}>7 ngày qua <Icon name="chevron" /></button>
          </div>
          <div className="chart">
            {[32, 52, 38, 76, 55, 88, 44].map((height, index) => (
              <div key={index}>
                <span style={{ height: `${height}%` }} className={index === 5 ? "peak" : ""} />
                <small>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}</small>
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
