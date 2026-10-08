import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadChapter } from "../services/contentService";

const COL = {
  type: "Kiểu", purpose: "Công dụng", typicalRange: "Khoảng giá trị",
  example: "Ví dụ", operator: "Toán tử", meaning: "Ý nghĩa",
  concept: "Khái niệm", cpp: "C++", python: "Python",
};

// [tên trường, nhãn, kiểu hiển thị]; thứ tự là thứ tự hiện trên trang
const FIELDS = [
  ["example", "Ví dụ", "text"],
  ["exampleInput", "Input mẫu", "code"],
  ["template", "Mẫu code", "code"],
  ["code", "Code", "code"],
  ["output", "Output", "code"],
  ["result", "Kết quả", "code"],
  ["typicalOutput", "Output thường gặp", "code"],
  ["trapExample", "Ví dụ dễ sai", "code"],
  ["trapResult", "Kết quả của ví dụ dễ sai", "text"],
  ["dangerCode", "Code nguy hiểm", "code"],
  ["correctCode", "Code đúng", "code"],
  ["table", "", "table"],
  ["steps", "Các bước", "list"],
  ["strategy", "Chiến lược", "list"],
  ["applications", "Ứng dụng", "list"],
  ["commonMistakes", "Lỗi thường gặp", "list"],
  ["explanation", "Giải thích", "text"],
  ["cppComparison", "So sánh với C++", "text"],
  ["warning", "Lưu ý", "warn"],
  ["hsgNote", "Ghi chú HSG", "note"],
];

function Table({ rows }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  return (
    <table>
      <thead><tr>{keys.map((k) => <th key={k}>{COL[k] || k}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{keys.map((k) => <td key={k}>{String(r[k] ?? "")}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function Field({ label, kind, value }) {
  if (kind === "code")
    return <><h4>{label}</h4><pre><code>{value}</code></pre></>;
  if (kind === "text")
    return <p><b>{label}:</b> {value}</p>;
  if (kind === "list")
    return <><h4>{label}</h4><ul>{value.map((x, i) => <li key={i}>{x}</li>)}</ul></>;
  if (kind === "table") return <Table rows={value} />;
  if (kind === "warn")
    return <div className="callout warn"><b>{label}:</b> {value}</div>;
  return <div className="callout"><b>{label}:</b> {value}</div>;
}

function Theory({ items }) {
  return items.map((t) => (
    <div className="card" key={t.id}>
      <h3>{t.title}</h3>
      <p>{t.content}</p>
      {FIELDS.map(([k, label, kind]) =>
        t[k] ? <Field key={k} label={label} kind={kind} value={t[k]} /> : null
      )}
    </div>
  ));
}

function Examples({ items }) {
  return items.map((e) => (
    <div className="card" key={e.id}>
      <h3>{e.title}<span className="badge">{e.difficulty}</span></h3>
      <p>{e.description}</p>
      <pre><code>{e.code}</code></pre>
      {e.input && <Field label="Input" kind="code" value={e.input} />}
      {e.output && <Field label="Output" kind="code" value={e.output} />}
      <p><b>Giải thích:</b> {e.explanation}</p>
      {e.complexity && (
        <p><b>Độ phức tạp:</b> thời gian {e.complexity.time}, bộ nhớ {e.complexity.space}</p>
      )}
      {e.wrongCode && <Field label="Code sai" kind="code" value={e.wrongCode} />}
      {e.correctCode && <Field label="Code đúng" kind="code" value={e.correctCode} />}
      {e.hsgLesson && <Field label="Bài học HSG" kind="note" value={e.hsgLesson} />}
    </div>
  ));
}

export default function Lesson({ lang }) {
  const { id } = useParams();
  const [ch, setCh] = useState(undefined); // undefined = đang tải, null = không có
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    let on = true;
    setCh(undefined);
    setTab("overview");
    loadChapter(lang, id).then((c) => on && setCh(c));
    return () => { on = false; };
  }, [lang, id]);

  if (ch === undefined) return <p>Đang tải bài học...</p>;
  if (ch === null) return <p>Không tìm thấy chương này.</p>;

  const tabs = [
    ["overview", "Tổng quan"], ["theory", "Lý thuyết"], ["examples", "Ví dụ"],
    ["mistakes", "Lỗi thường gặp"], ["summary", "Tóm tắt"],
  ];

  return (
    <div>
      <h2>Chương {ch.order}: {ch.title}</h2>
      <div className="tabs">
        {tabs.map(([k, name]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {name}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <p>{ch.description}</p>
          <h4>Mục tiêu học tập</h4>
          <ul>{ch.objectives.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <h4>Kiến thức cần có trước</h4>
          <ul>{ch.prerequisites.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {tab === "theory" && <Theory items={ch.theory} />}
      {tab === "examples" && <Examples items={ch.examples} />}
      {tab === "mistakes" && (
        <div>
          {ch.commonMistakes.map((m, i) => (
            <div className="card" key={i}>
              <p><b>Lỗi:</b> {m.mistake}</p>
              <p><b>Cách sửa:</b> {m.fix}</p>
            </div>
          ))}
          {ch.cppVsPython && (
            <>
              <h4>So sánh C++ và Python</h4>
              <Table rows={ch.cppVsPython} />
            </>
          )}
        </div>
      )}
      {tab === "summary" && (
        <ul>{ch.chapterSummary.map((x, i) => <li key={i}>{x}</li>)}</ul>
      )}
    </div>
  );
}