import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authoring } from "../../services/contestService";
import {
  DIFFICULTIES,
  importProblemJson,
  problemTemplate,
  slugify,
  validateProblem,
} from "../../utils/problemAuthoring";
import ProblemStatement from "../../components/ProblemStatement";
import AuthoringLayout from "./AuthoringLayout";
const empty = () => ({
  title: "",
  slug: "",
  difficulty: "basic",
  tags: [],
  statement: "",
  inputDescription: "",
  outputDescription: "",
  constraints: [],
  samples: [{ input: "", output: "", explanation: "" }],
  hiddenTests: [{ input: "", output: "" }],
  allowedLanguages: ["cpp", "python"],
  starterCode: { cpp: "", python: "" },
  published: false,
});
function TestFields({ title, value, onChange, samples, limit }) {
  return (
    <fieldset>
      <legend>
        {title} ({value.length}/{limit})
      </legend>
      {value.map((t, i) => (
        <div className="contest-test" key={i}>
          <h3>
            {title} {i + 1}
          </h3>
          {["input", "output", ...(samples ? ["explanation"] : [])].map((f) => (
            <label key={f}>
              {f === "output"
                ? "Expected output"
                : f === "explanation"
                  ? "Giải thích"
                  : "Input"}
              <textarea
                spellCheck={false}
                className="contest-code"
                value={t[f] ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((x, j) =>
                      i === j ? { ...x, [f]: e.target.value } : x,
                    ),
                  )
                }
                rows={3}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            Xóa {title} {i + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={value.length >= limit}
        onClick={() =>
          onChange([
            ...value,
            { input: "", output: "", ...(samples ? { explanation: "" } : {}) },
          ])
        }
      >
        + Thêm {title}
      </button>
    </fieldset>
  );
}
export default function ProblemEditor() {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(!!problemId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!!problemId);
  useEffect(() => {
    if (!problemId) return;
    let live = true;
    authoring("getProblem", { id: problemId })
      .then((r) => {
        if (live) {
          setForm(r.item);
          setLoading(false);
        }
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
  }, [problemId]);
  function change(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
    setReviewed(false);
  }
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const locked = form.lockedUntil > now;
  async function importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 3000000) throw new Error("File vượt 3 MB.");
      const imported = importProblemJson(await file.text());
      setForm((p) => ({ ...p, ...imported }));
      setSlugEdited(true);
      setPreview(true);
      setReviewed(false);
      setError("");
    } catch (e) {
      setError(e.message);
    }
    e.target.value = "";
  }
  function template() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(problemTemplate, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "problem-template.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    const errors = validateProblem(form);
    if (errors.length) {
      setError(errors.join("\n"));
      return;
    }
    if (!reviewed) {
      setPreview(true);
      setError("Hãy xem preview và xác nhận đã kiểm tra trước khi lưu.");
      return;
    }
    setBusy(true);
    try {
      await authoring("saveProblem", { id: problemId, data: form });
      navigate("/teacher/problems");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return <AuthoringLayout title="Bài tập">Đang tải…</AuthoringLayout>;
  return (
    <AuthoringLayout title={problemId ? "Chỉnh sửa bài tập" : "Tạo bài tập"}>
      {locked && (
        <p role="status">
          Bài đang được khóa bởi contest đã publish đến{" "}
          {new Date(form.lockedUntil).toLocaleString("vi-VN")}. Bạn có thể xem
          và preview.
        </p>
      )}
      <div className="contest-actions">
        <button onClick={template}>Tải mẫu JSON</button>
        <label>
          Import bài từ JSON
          <input
            disabled={locked || busy}
            type="file"
            accept=".json,application/json"
            onChange={importFile}
          />
        </label>
      </div>
      <form onSubmit={save}>
        <fieldset disabled={busy || locked}>
          <legend>Thông tin bài tập</legend>
          <label>
            Tên bài
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((p) => ({
                  ...p,
                  title,
                  ...(!slugEdited ? { slug: slugify(title) } : {}),
                }));
                setReviewed(false);
              }}
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                change("slug", e.target.value);
              }}
            />
          </label>
          <label>
            Độ khó
            <select
              value={form.difficulty}
              onChange={(e) => change("difficulty", e.target.value)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Tags (cách nhau bằng dấu phẩy)
            <input
              value={form.tags.join(",")}
              onChange={(e) => change("tags", e.target.value.split(","))}
            />
          </label>
          {["statement", "inputDescription", "outputDescription"].map(
            (f, i) => (
              <label key={f}>
                {["Đề bài", "Dữ liệu vào", "Dữ liệu ra"][i]}
                <textarea
                  rows={f === "statement" ? 7 : 3}
                  value={form[f]}
                  onChange={(e) => change(f, e.target.value)}
                />
              </label>
            ),
          )}
          <label>
            Ràng buộc (mỗi dòng một mục)
            <textarea
              rows={3}
              value={form.constraints.join("\n")}
              onChange={(e) =>
                change("constraints", e.target.value.split("\n"))
              }
            />
          </label>
          <TestFields
            title="Sample"
            value={form.samples}
            samples
            limit={10}
            onChange={(v) => change("samples", v)}
          />
          <TestFields
            title="Hidden test"
            value={form.hiddenTests}
            limit={50}
            onChange={(v) => change("hiddenTests", v)}
          />
          <fieldset>
            <legend>Ngôn ngữ & starter code</legend>
            {["cpp", "python"].map((l) => (
              <div key={l}>
                <label className="contest-check">
                  <input
                    type="checkbox"
                    checked={form.allowedLanguages.includes(l)}
                    onChange={(e) =>
                      change(
                        "allowedLanguages",
                        e.target.checked
                          ? [...form.allowedLanguages, l]
                          : form.allowedLanguages.filter((x) => x !== l),
                      )
                    }
                  />
                  {l === "cpp" ? "C++" : "Python"}
                </label>
                <label>
                  Starter code {l}
                  <textarea
                    className="contest-code"
                    rows={5}
                    value={form.starterCode[l]}
                    onChange={(e) =>
                      change("starterCode", {
                        ...form.starterCode,
                        [l]: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </fieldset>
          <label>
            Trạng thái
            <select
              value={String(form.published)}
              onChange={(e) => change("published", e.target.value === "true")}
            >
              <option value="false">Draft</option>
              <option value="true">Published</option>
            </select>
          </label>
        </fieldset>
        <div className="contest-actions">
          <button type="button" onClick={() => setPreview(!preview)}>
            {preview ? "Ẩn preview" : "Preview"}
          </button>
          <button
            className="contest-primary"
            disabled={busy || locked}
            type="submit"
          >
            {busy ? "Đang lưu…" : "Lưu bài"}
          </button>
        </div>
        {error && (
          <p className="err contest-error" role="alert">
            {error}
          </p>
        )}
        {preview && (
          <section className="contest-panel">
            <h2>Preview học sinh</h2>
            <ProblemStatement problem={form} />
            {form.allowedLanguages.map((l) => (
              <div key={l}>
                <h3>Starter code {l}</h3>
                <pre>{form.starterCode[l]}</pre>
              </div>
            ))}
            <label className="contest-check">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              Tôi đã kiểm tra preview
            </label>
          </section>
        )}
      </form>
    </AuthoringLayout>
  );
}
