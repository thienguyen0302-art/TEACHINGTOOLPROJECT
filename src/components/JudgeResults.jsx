export default function JudgeResults({ busy, error, submission }) {
  return (
            <div className="judge-results" aria-live="polite" aria-busy={Boolean(busy)}>
              {busy && <p role="status">Đang gửi code tới máy chấm Judge0…</p>}
              {error && <p role="alert" className="err">{error}</p>}
              {submission && <p>Ngôn ngữ đã gửi: {submission.language === "cpp" ? "C++" : "Python"}</p>}
              {submission?.mode === "run" && <>
                <h3>{submission.result.status}</h3>
                <p>Thời gian: {submission.result.time ?? "—"} s · Bộ nhớ: {submission.result.memory ?? "—"} KB</p>
                <h4>Output</h4><pre>{submission.result.stdout || "(Không có output)"}</pre>
                {(submission.result.compileOutput || submission.result.stderr || submission.result.message) && <><h4>Thông báo máy chấm</h4><pre>{submission.result.compileOutput || submission.result.stderr || submission.result.message}</pre></>}
              </>}
              {submission?.mode === "submit" && <>
                <h3>Điểm: {submission.score}/100 · Đạt {submission.passed}/{submission.total} test</h3>
                {submission.results.map((test) => <details key={test.index}>
                  <summary>Test {test.index} {test.hidden ? "(ẩn)" : "(ví dụ)"}: {test.status}</summary>
                  <p>Thời gian: {test.time ?? "—"} s · Bộ nhớ: {test.memory ?? "—"} KB</p>
                  {!test.hidden && <><h4>Input</h4><pre>{test.input}</pre><h4>Kết quả mong đợi</h4><pre>{test.expected}</pre><h4>Output</h4><pre>{test.stdout || "(Không có output)"}</pre>{(test.compileOutput || test.stderr || test.message) && <pre>{test.compileOutput || test.stderr || test.message}</pre>}</>}
                </details>)}
              </>}
            </div>
  );
}
