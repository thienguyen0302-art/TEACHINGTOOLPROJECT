import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TeacherProblems from "../../src/pages/authoring/TeacherProblems";
import ProblemEditor from "../../src/pages/authoring/ProblemEditor";
import TeacherContests from "../../src/pages/authoring/TeacherContests";
import ContestEditor from "../../src/pages/authoring/ContestEditor";
import Contests from "../../src/pages/contest/Contests";
import Contest from "../../src/pages/contest/Contest";
import ContestProblem from "../../src/pages/contest/ContestProblem";
const teacher = (localStorage.getItem("test-role") || "teacher") === "teacher";
const user = { uid: teacher ? "t" : "s" };
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/teacher/problems" element={<TeacherProblems />} />
      <Route path="/teacher/problems/new" element={<ProblemEditor />} />
      <Route
        path="/teacher/problems/:problemId/edit"
        element={<ProblemEditor />}
      />
      <Route path="/teacher/contests" element={<TeacherContests />} />
      <Route path="/teacher/contests/new" element={<ContestEditor />} />
      <Route
        path="/teacher/contests/:contestId/edit"
        element={<ContestEditor />}
      />
      <Route path="/contests" element={<Contests />} />
      <Route
        path="/contest/:contestId"
        element={<Contest user={user} teacher={teacher} />}
      />
      <Route
        path="/contest/:contestId/scoreboard"
        element={<Contest user={user} teacher={teacher} scoreboardOnly />}
      />
      <Route
        path="/contest/:contestId/problem/:problemId"
        element={<ContestProblem user={user} />}
      />
      <Route path="*" element={<Navigate to="/contests" />} />
    </Routes>
  </BrowserRouter>,
);
