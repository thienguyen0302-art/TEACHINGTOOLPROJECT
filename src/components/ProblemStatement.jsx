export default function ProblemStatement({ problem }) {
  return (
    <>
      <p className="problem-text">{problem.statement}</p>
      <h2>Dữ liệu vào</h2>
      <p className="problem-text">{problem.inputDescription}</p>
      <h2>Dữ liệu ra</h2>
      <p className="problem-text">{problem.outputDescription}</p>
      <h2>Ví dụ</h2>
      {problem.samples.map((sample, index) => (
        <section className="problem-sample" key={index}>
          <h3>Ví dụ {index + 1}</h3>
          <div className="bank-sample-code">
            <div><h4>Input</h4><pre><code>{sample.input}</code></pre></div>
            <div><h4>Output</h4><pre><code>{sample.output}</code></pre></div>
          </div>
          {sample.explanation && (
            <p className="problem-text"><b>Giải thích: </b>{sample.explanation}</p>
          )}
        </section>
      ))}
      <h2>Ràng buộc</h2>
      <ul className="bank-constraints">
        {problem.constraints.map((constraint, index) => (
          <li key={index}><code>{constraint}</code></li>
        ))}
      </ul>
    </>
  );
}
