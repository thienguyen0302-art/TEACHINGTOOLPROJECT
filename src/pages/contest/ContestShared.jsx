import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contestStatus, toMillis } from "../../utils/contest";
export function ContestClock({ contest, onStatus }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const status = contestStatus(contest, now);
  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);
  const ms = Math.max(
    0,
    (status === "upcoming"
      ? toMillis(contest.startAt)
      : toMillis(contest.startAt) + contest.durationMinutes * 60000) - now,
  );
  const seconds = Math.ceil(ms / 1000);
  const clock = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
  return (
    <p className="contest-clock" role="timer">
      {status === "ended"
        ? "Contest đã kết thúc"
        : `${status === "upcoming" ? "Contest chưa bắt đầu · Bắt đầu sau" : "Còn lại"} ${clock}`}
    </p>
  );
}
export function ContestNav({ id }) {
  return (
    <nav className="contest-actions">
      <Link to="/contests">← Contests</Link>
      <Link to={`/contest/${id}`}>Bài thi & lịch sử</Link>
      <Link to={`/contest/${id}/scoreboard`}>Leaderboard</Link>
    </nav>
  );
}
export function Leaderboard({ contest, rows }) {
  return (
    <div
      className="contest-table-wrap"
      tabIndex={0}
      aria-label="Leaderboard, cuộn ngang"
    >
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student</th>
            {contest.problems.map((p) => (
              <th key={p.problemId}>{p.label}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.uid}>
              <td>{i + 1}</td>
              <td>{s.displayName}</td>
              {contest.problems.map((p) => (
                <td key={p.problemId}>
                  {s.problems[p.problemId]?.accepted ? "AC · " : ""}
                  {s.problems[p.problemId]?.earnedPoints ?? "—"} / {p.points}
                </td>
              ))}
              <td>
                <strong>{s.totalScore}</strong>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={contest.problems.length + 3}>Chưa có bài nộp.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function SubmissionHistory({ rows, contest, teacher }) {
  const [student, setStudent] = useState("");
  const students = [...new Set(rows.map((r) => r.uid))];
  return (
    <section>
      <h2>{teacher ? "Bài nộp học sinh" : "My submissions"}</h2>
      {teacher && (
        <label>
          Lọc học sinh
          <select value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="">Tất cả ({students.length} học sinh)</option>
            {students.map((uid) => (
              <option key={uid}>{uid}</option>
            ))}
          </select>
        </label>
      )}
      <div className="contest-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              {teacher && <th>Student</th>}
              <th>Problem</th>
              <th>Language</th>
              <th>Score</th>
              <th>Verdict / Source</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => !student || r.uid === student)
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {new Date(toMillis(r.submittedAt)).toLocaleString("vi-VN")}
                  </td>
                  {teacher && (
                    <td>
                      <button onClick={() => setStudent(r.uid)}>{r.uid}</button>
                    </td>
                  )}
                  <td>
                    {contest.problems.find((p) => p.problemId === r.problemId)
                      ?.label ?? r.problemId}
                  </td>
                  <td>{r.language}</td>
                  <td>
                    {r.earnedPoints} ({r.score}%)
                  </td>
                  <td>
                    <details>
                      <summary>{r.status} · Xem code</summary>
                      <pre>{r.source}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            {!rows.length && (
              <tr>
                <td colSpan={teacher ? 7 : 6}>Chưa có bài nộp.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
