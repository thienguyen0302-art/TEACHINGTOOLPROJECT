export default function ProblemStatement({ problem, showTitle = true }) {
  return (
    <div className="contest-statement">
      {showTitle && <h1>{problem.title}</h1>}
      <p>{problem.statement}</p>
      <h2>Dữ liệu vào</h2>
      <p>{problem.inputDescription}</p>
      <h2>Dữ liệu ra</h2>
      <p>{problem.outputDescription}</p>
      <h2>Ràng buộc</h2>
      <ul>
        {problem.constraints.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <h2>Ví dụ</h2>
      {problem.samples.map((s, i) => (
        <section key={i} className="contest-sample">
          <h3>Ví dụ {i + 1}</h3>
          <div className="contest-grid">
            <div>
              <b>Input</b>
              <pre>{s.input}</pre>
            </div>
            <div>
              <b>Output</b>
              <pre>{s.output}</pre>
            </div>
          </div>
          {s.explanation && <p>{s.explanation}</p>}
        </section>
      ))}
    </div>
  );
}
