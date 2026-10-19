import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useNotice } from "../hooks/useNotice";
import { curriculum, LANG_BY_KEY } from "../data/curriculum";
import { getLocalChapterState } from "../services/progressService";

// Danh sách 12 chương theo thiết kế. Chương nào đã có file JSON (cùng số thứ tự) thì mở được và lấy tiến độ thật.
export default function Curriculum({ lang, data, onChangeLang }) {
  const nav = useNavigate();
  const notice = useNotice();
  const label = LANG_BY_KEY[lang];
  const list = curriculum[label];

  const contentByOrder = Object.fromEntries(data.chapters.map((c) => [c.order, c.id]));
  const progressById = Object.fromEntries(data.rows.map((r) => [r.chapterId, r]));

  const items = list.map((chapter, index) => {
    const id = contentByOrder[index + 1];
    let p = id ? progressById[id] : undefined;
    if (id && (!p || !p.completed)) {
      const local = getLocalChapterState(data?.profile?.uid, lang, id);
      if (local && (!p || (local.progressPercent ?? 0) > (p.progressPercent ?? 0) || local.completed)) {
        p = { ...p, ...local };
      }
    }
    const progress = p?.completed ? 100 : p ? Math.max(0, Math.min(99, Math.round(p.progressPercent ?? p.bestScore ?? 0))) : 0;
    return { ...chapter, index, id, progress, started: !!p && (progress > 0 || p.completed) };
  });
  // chương "đang học" = chương đầu tiên có tiến độ nhưng chưa xong, nếu không có thì chương đầu chưa học
  const current = items.find((c) => c.started && c.progress < 100) || items.find((c) => c.progress === 0);

  const totalLessons = list.reduce((t, c) => t + c.lessons, 0);
  const totalExercises = list.reduce((t, c) => t + c.exercises, 0);

  return (
    <div className="content curriculum-page">
      <section className="curriculum-hero">
        <div>
          <span className="curriculum-kicker"><Icon name="book" /> Chương trình học của bạn</span>
          <h1>Chinh phục {label}<br /><span>từ nền tảng đến nâng cao.</span></h1>
          <p>
            Toàn bộ kiến thức được sắp xếp thành {list.length} chương theo độ khó tăng dần, kết hợp lý
            thuyết, thực hành và bài tập học sinh giỏi.
          </p>
        </div>
        <div className="curriculum-summary">
          <div><strong>{list.length}</strong><span>Chương học</span></div>
          <div><strong>{totalLessons}</strong><span>Bài lý thuyết</span></div>
          <div><strong>{totalExercises}</strong><span>Bài thực hành</span></div>
        </div>
      </section>

      <section className="curriculum-toolbar">
        <div>
          <span>Lộ trình {label}</span>
          <h2>Tất cả các chương</h2>
        </div>
        <button onClick={onChangeLang}><Icon name="code" /> Đổi sang ngôn ngữ khác</button>
      </section>

      <section className="curriculum-list">
        {items.map((c) => {
          const status = c.progress === 100 ? "done" : c.started ? "learning" : "locked";
          const statusText = c.progress === 100 ? "Hoàn thành" : c.started ? "Đang học" : c.id ? "Chưa học" : "Sắp ra mắt";
          const action = () => (c.id ? nav(`/lesson/${c.id}`) : notice(`Chương ${c.index + 1} đang được biên soạn`));
          return (
            <article className={`curriculum-item ${current && current.index === c.index ? "current" : ""}`} key={c.title}>
              <div className="curriculum-order">
                <span>{String(c.index + 1).padStart(2, "0")}</span>
                {c.index < items.length - 1 && <i />}
              </div>
              <div className="curriculum-card">
                <div className="curriculum-card-main">
                  <div className={`curriculum-symbol symbol-${(c.index % 4) + 1}`}>
                    <Icon name={c.index < 2 ? "code" : c.index < 5 ? "check" : c.index < 9 ? "grid" : "trophy"} />
                  </div>
                  <div className="curriculum-copy">
                    <div className="curriculum-card-label">
                      <span>Chương {String(c.index + 1).padStart(2, "0")}</span>
                      <em className={`status-${status}`}>{statusText}</em>
                    </div>
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                    <div className="curriculum-meta">
                      <span><Icon name="book" />{c.lessons} bài học</span>
                      <span><Icon name="code" />{c.exercises} bài tập</span>
                      <span><Icon name="clock" />{c.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="curriculum-action">
                  {c.progress > 0 && (
                    <div className="curriculum-progress">
                      <div><span>Tiến độ</span><strong>{c.progress}%</strong></div>
                      <div className="progress-track"><span style={{ width: `${c.progress}%` }} /></div>
                    </div>
                  )}
                  <button onClick={action}>
                    {c.progress === 100 ? "Ôn tập lại" : c.progress > 0 ? "Tiếp tục học" : "Bắt đầu học"}
                    <Icon name="chevron" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="curriculum-finish">
        <span><Icon name="trophy" /></span>
        <div>
          <small>Đích đến của lộ trình</small>
          <h2>Sẵn sàng chinh phục đề thi HSG Tin học</h2>
          <p>Hoàn thành {list.length} chương để mở khóa toàn bộ kho đề thi và thử thách nâng cao.</p>
        </div>
        <strong>{items.filter((c) => c.progress === 100).length}/{list.length}</strong>
      </section>
    </div>
  );
}
