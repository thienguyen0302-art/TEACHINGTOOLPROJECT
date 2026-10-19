import LessonCodeExercise from "./LessonCodeExercise";
import { Link } from "react-router-dom";
import { difficultyLabels } from "../services/problemService";

export default function ProblemCard({ problem, variant = "lesson", language, chapterId, section }) {
  if (variant === "bank") return <BankProblemCard problem={problem} />;
  return (
    <article className="card">
      <h3>{problem.title}<span className="badge">{problem.difficulty === "advanced" ? "HSG" : "Luyện tập"}</span></h3>
      <p>{problem.problem}</p>
      <p><b>Input:</b> {problem.inputDescription}</p>
      <p><b>Output:</b> {problem.outputDescription}</p>
      <ul>{problem.constraints.map((constraint, i) => <li key={i}>{constraint}</li>)}</ul>
      <h4>Input mẫu</h4><pre><code>{problem.sampleInput}</code></pre>
      <h4>Output mẫu</h4><pre><code>{problem.sampleOutput}</code></pre>
      {language && chapterId && section && problem.runnable && <LessonCodeExercise problem={problem} language={language} chapterId={chapterId} section={section} />}
      {problem.hint && <details><summary>Gợi ý</summary><p>{problem.hint}</p></details>}
    </article>
  );
}

function BankProblemCard({ problem }) {
  return (
    <article className="problem-card">
      <div className="problem-card__heading">
        <h3><Link to={`/problem/${problem.slug}`}>{problem.title}</Link></h3>
        <span className={`difficulty-badge difficulty-badge--${problem.difficulty}`}>
          {difficultyLabels[problem.difficulty]}
        </span>
      </div>
      <p className="problem-meta">{problem.chapterId.toUpperCase()} · Cấp độ {problem.level} · {problem.type}</p>
      <p className="problem-card__summary">{problem.statement}</p>
      <div className="problem-tags">
        {problem.tags.map((tag) => <span className="question-tag" key={tag}>{tag}</span>)}
      </div>
    </article>
  );
}
