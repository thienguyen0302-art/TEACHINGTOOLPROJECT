export default function ProblemCard({ problem }) {
  return (
    <article className="card">
      <h3>{problem.title}<span className="badge">{problem.difficulty === "advanced" ? "HSG" : "Luyện tập"}</span></h3>
      <p>{problem.problem}</p>
      <p><b>Input:</b> {problem.inputDescription}</p>
      <p><b>Output:</b> {problem.outputDescription}</p>
      <ul>{problem.constraints.map((constraint, i) => <li key={i}>{constraint}</li>)}</ul>
      <h4>Input mẫu</h4><pre><code>{problem.sampleInput}</code></pre>
      <h4>Output mẫu</h4><pre><code>{problem.sampleOutput}</code></pre>
      {problem.hint && <details><summary>Gợi ý</summary><p>{problem.hint}</p></details>}
      <details>
        <summary>Xem lời giải sau khi tự làm</summary>
        <p>{problem.explanation}</p>
        {problem.solutionCode && <pre><code>{problem.solutionCode}</code></pre>}
        {problem.betterApproach && <div className="callout"><b>Hướng cải thiện:</b> {problem.betterApproach}</div>}
        {problem.complexity && <p><b>Độ phức tạp:</b> thời gian {problem.complexity.time}, bộ nhớ {problem.complexity.space}.</p>}
      </details>
    </article>
  );
}
