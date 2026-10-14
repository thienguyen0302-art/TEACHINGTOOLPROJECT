import StepVisualizer from "./StepVisualizer";
import TheorySelfCheck from "./TheorySelfCheck";

const COL = { type: "Kiểu", purpose: "Công dụng", typicalRange: "Khoảng giá trị", example: "Ví dụ", operator: "Toán tử", meaning: "Ý nghĩa", concept: "Khái niệm", cpp: "C++", python: "Python" };
const FIELDS = [
  ["example", "Ví dụ", "text"], ["exampleInput", "Input mẫu", "code"], ["template", "Mẫu code", "code"],
  ["code", "Code", "code"], ["output", "Output", "code"], ["result", "Kết quả", "code"],
  ["typicalOutput", "Output thường gặp", "code"], ["trapExample", "Ví dụ dễ sai", "code"],
  ["trapResult", "Kết quả của ví dụ dễ sai", "text"], ["dangerCode", "Code nguy hiểm", "code"],
  ["correctCode", "Code đúng", "code"], ["table", "", "table"], ["steps", "Các bước", "list"],
  ["strategy", "Chiến lược", "list"], ["applications", "Ứng dụng", "list"],
  ["commonMistakes", "Lỗi thường gặp", "list"], ["explanation", "Giải thích", "text"],
  ["cppComparison", "So sánh với C++", "text"], ["warning", "Lưu ý", "warn"], ["hsgNote", "Ghi chú HSG", "note"],
];

export function LessonTable({ rows = [] }) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  return <div className="lesson-table-wrap"><table><thead><tr>{keys.map((key) => <th key={key}>{COL[key] || key}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{keys.map((key) => <td key={key}>{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div>;
}

function Field({ label, kind, value }) {
  if (kind === "code") return <><h4>{label}</h4><pre><code>{value}</code></pre></>;
  if (kind === "text") return <p><b>{label}:</b> {value}</p>;
  if (kind === "list") return <><h4>{label}</h4><ul>{value.map((item, index) => <li key={index}>{item}</li>)}</ul></>;
  if (kind === "table") return <LessonTable rows={value} />;
  if (kind === "warn") return <div className="callout warn"><b>{label}:</b> {value}</div>;
  return <div className="callout"><b>{label}:</b> {value}</div>;
}

function ExampleCard({ example }) {
  return <article className="lesson-example">
    <div className="lesson-example__heading"><span>VÍ DỤ ÁP DỤNG</span><h4>{example.title}</h4>{example.difficulty && <span className="badge">{example.difficulty}</span>}</div>
    <p>{example.description}</p>
    <pre><code>{example.code}</code></pre>
    {example.input && <Field label="Input" kind="code" value={example.input} />}
    {example.output && <Field label="Output" kind="code" value={example.output} />}
    <p><b>Giải thích:</b> {example.explanation}</p>
    {example.complexity && <p><b>Độ phức tạp:</b> thời gian {example.complexity.time}, bộ nhớ {example.complexity.space}</p>}
    {example.wrongCode && <Field label="Code sai" kind="code" value={example.wrongCode} />}
    {example.correctCode && <Field label="Code đúng" kind="code" value={example.correctCode} />}
    {example.hsgLesson && <Field label="Bài học HSG" kind="note" value={example.hsgLesson} />}
  </article>;
}

export default function LessonTheory({ chapter, language }) {
  const theoryIds = new Set(chapter.theory.map((item) => item.id));
  const examplesFor = (theoryId) => chapter.examples.filter((example) => example.theoryId === theoryId);
  const generalExamples = chapter.examples.filter((example) => !example.theoryId || !theoryIds.has(example.theoryId));
  return <div className="theory-reader">
    <nav className="theory-reader__contents" aria-label="Mục lục lý thuyết"><b>Trong bài này</b><ol>{chapter.theory.map((item) => <li key={item.id}><a href={`#${item.id}`}>{item.title.replace(/^\d+\.\s*/, "")}</a></li>)}</ol></nav>
    {chapter.theory.map((item) => <article className="card theory-article" id={item.id} key={item.id}>
      <div className="theory-article__heading"><span>KHÁI NIỆM</span><h3>{item.title}</h3></div>
      <p className="theory-article__intro">{item.content}</p>
      {item.sections?.map((section, index) => <section className="theory-section" key={index}><h4>{section.title}</h4>{section.paragraphs?.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}{section.bullets?.length > 0 && <ul>{section.bullets.map((text, bulletIndex) => <li key={bulletIndex}>{text}</li>)}</ul>}</section>)}
      {FIELDS.map(([key, label, kind]) => item[key] && !(key === "code" && item.visualization) ? <Field key={key} label={label} kind={kind} value={item[key]} /> : null)}
      {item.visualization && <StepVisualizer visualization={item.visualization} code={item.visualization.code ?? item.code} />}
      {item.selfCheck && <TheorySelfCheck selfCheck={item.selfCheck} language={language} chapterId={chapter.id} theoryId={item.id} />}
      {examplesFor(item.id).map((example) => <ExampleCard key={example.id} example={example} />)}
    </article>)}
    {generalExamples.length > 0 && <section className="lesson-general-examples" aria-labelledby="general-examples-title"><div className="lesson-section-heading"><span>VÍ DỤ TỔNG HỢP</span><h3 id="general-examples-title">Đưa kiến thức vào bài toán</h3></div>{generalExamples.map((example) => <ExampleCard key={example.id} example={example} />)}</section>}
  </div>;
}
