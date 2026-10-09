import { useState } from "react";
import ProblemCard from "../components/ProblemCard";
import { difficultyLabels, listProblems } from "../services/problemService";

export default function Practice() {
  const [difficulty, setDifficulty] = useState("");
  const problems = listProblems({ difficulty });

  return (
    <section className="practice-page">
      <h1>Problem Bank</h1>
      <p>Luyện tập lập trình theo chương với C++ và Python.</p>
      <div className="practice-toolbar">
        <label htmlFor="problem-difficulty">Độ khó</label>
        <select id="problem-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
          <option value="">Tất cả</option>
          {Object.entries(difficultyLabels).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
        <span role="status">{problems.length} bài tập</span>
      </div>
      <div className="problem-list">
        {problems.map((problem) => <ProblemCard variant="bank" key={problem.id} problem={problem} />)}
      </div>
      {problems.length === 0 && <p>Chưa có bài tập ở mức độ này.</p>}
    </section>
  );
}
