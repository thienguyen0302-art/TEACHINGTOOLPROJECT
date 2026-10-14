async function call(action, data = {}) {
  const r = await fetch("/api/mock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Test-User": localStorage.getItem("test-role") || "teacher",
    },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error);
  return result;
}
export const authoring = (action, data) => call(action, data);
export const getContest = (id) => call("contest", { id });
export const getPublicProblem = (id) => call("problem", { id });
export const listContests = () => call("contests");
export const getScoreboard = (id) => call("scoreboard", { id });
export const getContestSubmissions = (id, uid, teacher) =>
  call("submissions", { id, uid, teacher });
export const judgeContest = (body) => call("judge", { body });
