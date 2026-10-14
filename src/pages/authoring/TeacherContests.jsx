import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authoring } from "../../services/contestService";
import { contestStatus } from "../../utils/contest";
import AuthoringLayout from "./AuthoringLayout";
export default function TeacherContests() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  useEffect(() => {
    let live = true;
    authoring("listContests")
      .then((r) => {
        if (live) setState({ ...r, loading: false });
      })
      .catch((e) => {
        if (live) setState({ items: [], error: e.message });
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <AuthoringLayout title="Contest của tôi">
      <Link className="contest-primary" to="/teacher/contests/new">
        + Tạo contest
      </Link>
      {state.loading && <p>Đang tải…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <div className="contest-cards">
        {state.items.map((c) => (
          <article key={c.id}>
            <h2>{c.title}</h2>
            <p>
              {c.status} · {contestStatus(c)} · {c.problems.length} bài
            </p>
            <div className="contest-actions">
              <Link to={`/teacher/contests/${c.id}/edit`}>Cấu hình</Link>
              <Link to={`/contest/${c.id}`}>Theo dõi / Bài nộp</Link>
              <Link to={`/contest/${c.id}/scoreboard`}>Leaderboard</Link>
            </div>
          </article>
        ))}
      </div>
      {!state.loading && !state.items.length && <p>Chưa có contest.</p>}
    </AuthoringLayout>
  );
}
