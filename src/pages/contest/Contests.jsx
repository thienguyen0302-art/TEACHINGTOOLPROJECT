import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listContests } from "../../services/contestService";
import { contestStatus, toMillis } from "../../utils/contest";
import "./Contest.css";
export default function Contests() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let live = true;
    listContests()
      .then((items) => {
        if (live) setState({ loading: false, items, error: "" });
      })
      .catch((e) => {
        if (live) setState({ loading: false, items: [], error: e.message });
      });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);
  return (
    <section className="content contest-ui">
      <h1>Đấu trường lập trình</h1>
      <p>
        Luyện HSG Tin học với C++ và Python. Mỗi bài tính điểm theo số test đạt;
        leaderboard giữ kết quả tốt nhất.
      </p>
      {state.loading && <p>Đang tải…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {[
        ["running", "Đang diễn ra"],
        ["upcoming", "Sắp diễn ra"],
        ["ended", "Đã kết thúc"],
      ].map(([status, label]) => (
        <section key={status}>
          <h2>{label}</h2>
          <div className="contest-cards">
            {state.items
              .filter((c) => contestStatus(c, now) === status)
              .sort((a, b) => toMillis(a.startAt) - toMillis(b.startAt))
              .map((c) => (
                <article key={c.id}>
                  <h3>
                    <Link to={`/contest/${c.id}`}>{c.title}</Link>
                  </h3>
                  <p>
                    {new Date(toMillis(c.startAt)).toLocaleString("vi-VN")} ·{" "}
                    {c.durationMinutes} phút
                  </p>
                  <p>
                    {c.problems.length} bài · {label}
                  </p>
                  <Link to={`/contest/${c.id}`}>Mở contest →</Link>
                </article>
              ))}
          </div>
          {!state.loading &&
            !state.items.some((c) => contestStatus(c, now) === status) && (
              <p>Chưa có contest.</p>
            )}
        </section>
      ))}
    </section>
  );
}
