import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authoring, getContest } from "../../services/contestService";
import { problemLabel, toMillis, validateContest } from "../../utils/contest";
import AuthoringLayout from "./AuthoringLayout";
const dateInput = (value) => {
  const d = new Date(toMillis(value));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export default function ContestEditor() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    status: "draft",
    startAt: dateInput(Date.now() + 3600000),
    durationMinutes: 120,
    problems: [],
  }));
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([
      authoring("listProblems"),
      contestId ? getContest(contestId) : null,
    ])
      .then(([r, c]) => {
        if (!live) return;
        setCatalog(r.items);
        if (contestId && !c) throw new Error("Không tìm thấy contest.");
        if (c) {
          setForm({ ...c, startAt: dateInput(c.startAt) });
          setLocked(
            c.status === "published" && Date.now() >= toMillis(c.startAt),
          );
        }
        setLoading(false);
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [contestId]);
  const change = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const update = (i, key, value) =>
    change(
      "problems",
      form.problems.map((p, j) => (i === j ? { ...p, [key]: value } : p)),
    );
  function move(i, delta) {
    const ps = [...form.problems];
    [ps[i], ps[i + delta]] = [ps[i + delta], ps[i]];
    change("problems", ps);
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    // Secrets are checked on the server, never attached to the picker payload.
    const data = { ...form, startAt: new Date(form.startAt).getTime() };
    const errors = validateContest({ ...data, status: "draft" });
    if (errors.length) {
      setError(errors.join("\n"));
      return;
    }
    setBusy(true);
    try {
      await authoring("saveContest", { id: contestId, data });
      navigate("/teacher/contests");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthoringLayout title={contestId ? "Cấu hình contest" : "Tạo contest"}>
      {loading ? (
        <p>Đang tải…</p>
      ) : (
        <form onSubmit={save}>
          {locked && (
            <p>Contest đã bắt đầu. Cấu hình được khóa để giữ công bằng.</p>
          )}
          <fieldset disabled={busy || locked}>
            <legend>Thông tin contest</legend>
            <label>
              Tên contest
              <input
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <label>
              Mô tả
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
            </label>
            <div className="contest-grid">
              <label>
                Ngày giờ bắt đầu (giờ địa phương)
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => change("startAt", e.target.value)}
                />
              </label>
              <label>
                Thời lượng (phút)
                <input
                  type="number"
                  min="1"
                  max="10080"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    change("durationMinutes", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <h2>Chọn bài & điểm</h2>
            {form.problems.map((p, i) => (
              <div className="contest-picker" key={i}>
                <strong>Problem {problemLabel(i)}</strong>
                <label>
                  Bài tập
                  <select
                    value={p.problemId}
                    onChange={(e) => update(i, "problemId", e.target.value)}
                  >
                    <option value="">Chọn bài…</option>
                    {catalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.published ? "Published" : "Draft"})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Điểm
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={p.points}
                    onChange={(e) =>
                      update(i, "points", Number(e.target.value))
                    }
                  />
                </label>
                <div className="contest-actions">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === form.problems.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      change(
                        "problems",
                        form.problems.filter((_, j) => i !== j),
                      )
                    }
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={form.problems.length >= 26}
              onClick={() =>
                change("problems", [
                  ...form.problems,
                  { problemId: "", points: 100 },
                ])
              }
            >
              + Thêm bài
            </button>
            <label>
              Trạng thái
              <select
                value={form.status}
                onChange={(e) => change("status", e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Publish</option>
              </select>
            </label>
            <button type="submit" className="contest-primary">
              {busy ? "Đang lưu…" : "Lưu contest"}
            </button>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="err contest-error">
          {error}
        </p>
      )}
    </AuthoringLayout>
  );
}
