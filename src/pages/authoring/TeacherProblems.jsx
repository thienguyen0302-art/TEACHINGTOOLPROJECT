import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authoring } from "../../services/contestService";
import AuthoringLayout from "./AuthoringLayout";
export default function TeacherProblems() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  useEffect(() => {
    let live = true;
    authoring("listProblems")
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
    <AuthoringLayout title="Bài tập của tôi">
      <Link className="contest-primary" to="/teacher/problems/new">
        + Tạo bài tập
      </Link>
      {state.loading && <p>Đang tải…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <div className="contest-cards">
        {state.items.map((p) => (
          <article key={p.id}>
            <h2>{p.title}</h2>
            <p>
              {p.slug} · {p.published ? "Published" : "Draft"}
            </p>
            <Link to={`/teacher/problems/${p.id}/edit`}>Chỉnh sửa / Xem</Link>
          </article>
        ))}
      </div>
      {!state.loading && !state.items.length && <p>Chưa có bài tập.</p>}
    </AuthoringLayout>
  );
}
