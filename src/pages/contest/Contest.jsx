import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicProblem } from "../../services/contestService";
import useContest from "./useContest";
import {
  ContestClock,
  ContestNav,
  Leaderboard,
  SubmissionHistory,
} from "./ContestShared";
import "./Contest.css";
export default function Contest({
  user,
  teacher = false,
  scoreboardOnly = false,
}) {
  const { contestId } = useParams();
  const state = useContest(contestId, user, teacher);
  const [titles, setTitles] = useState({});
  useEffect(() => {
    if (!state.contest) return;
    let live = true;
    Promise.all(
      state.contest.problems.map(async (p) => [
        p.problemId,
        (await getPublicProblem(p.problemId))?.title ?? p.problemId,
      ]),
    )
      .then((entries) => {
        if (live) setTitles(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [state.contest]);
  if (state.loading)
    return <section className="content contest-ui">Đang tải…</section>;
  if (!state.contest)
    return (
      <section className="content contest-ui">
        <p role="alert">{state.error}</p>
      </section>
    );
  const c = state.contest,
    mine = state.scoreboard.find((s) => s.uid === user.uid);
  return (
    <section className="content contest-ui">
      <ContestNav id={contestId} />
      <header className="contest-header">
        <div>
          <h1>{c.title}</h1>
          <p>{c.description}</p>
          <p>{c.status === "draft" ? "DRAFT · Chỉ giáo viên thấy" : ""}</p>
        </div>
        <div>
          <ContestClock contest={c} />
          <p>
            Điểm của tôi: <strong>{mine?.totalScore ?? 0}</strong>
          </p>
        </div>
      </header>
      <button onClick={state.reload}>Tải lại kết quả</button>
      {state.error && <p role="alert">{state.error}</p>}
      {!scoreboardOnly && (
        <>
          <div className="contest-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Điểm tối đa</th>
                  <th>Kết quả tốt nhất</th>
                </tr>
              </thead>
              <tbody>
                {c.problems.map((p) => (
                  <tr key={p.problemId}>
                    <td>
                      <Link to={`/contest/${contestId}/problem/${p.problemId}`}>
                        {p.label} · {titles[p.problemId] ?? "Đang tải tên bài…"}
                      </Link>
                    </td>
                    <td>{p.points}</td>
                    <td>
                      {mine?.problems[p.problemId]?.accepted
                        ? "AC"
                        : (mine?.problems[p.problemId]?.earnedPoints ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {teacher && (
            <p>
              {state.scoreboard.length} participants ·{" "}
              {state.submissions.length} submissions
            </p>
          )}
          <SubmissionHistory
            rows={state.submissions}
            contest={c}
            teacher={teacher}
          />
        </>
      )}
      <h2>Leaderboard</h2>
      <Leaderboard contest={c} rows={state.scoreboard} />
    </section>
  );
}
