import { useState } from "react";
import { Link } from "react-router-dom";
import { difficultyLabels, listProblems, problemChapterIds } from "../services/problemService";
import "./ProblemBank.css";

const levelDescriptions = {
  basic: "Nắm vững nền tảng",
  intermediate: "Rèn tư duy giải bài",
  advanced: "Thử sức bài toán HSG",
};

function ProblemRow({ problem }) {
  const url = `/problem/${problem.slug}`;
  return (
    <tr>
      <td className="bank-id">{problem.id}</td>
      <td>
        <Link className="bank-title" to={url}>{problem.title}</Link>
        <div className="bank-row-tags">
          {problem.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </td>
      <td>
        <span className={`difficulty-badge difficulty-badge--${problem.difficulty}`}>
          {difficultyLabels[problem.difficulty]}
        </span>
      </td>
      <td className="bank-chapter">Chương {Number(problem.chapterId.slice(2))}</td>
      <td>
        <Link className="bank-open" aria-label={`Làm bài ${problem.title}`} to={url}>→</Link>
      </td>
    </tr>
  );
}

export default function Practice() {
  const [difficulty, setDifficulty] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const allProblems = listProblems();
  const topics = [...new Set(allProblems.flatMap((problem) => problem.tags))].sort();
  const problems = listProblems({ difficulty, chapterId, topic, query, sort });
  const hasFilters = Boolean(difficulty || chapterId || topic || query || sort !== "default");
  const emptyChapter = chapterId && listProblems({ chapterId }).length === 0;

  function resetFilters() {
    setDifficulty("");
    setChapterId("");
    setTopic("");
    setQuery("");
    setSort("default");
  }

  return (
    <section className="practice-page bank-ui">
      <header className="bank-header">
        <div>
          <span className="bank-eyebrow">LUYỆN TẬP LẬP TRÌNH</span>
          <h1>Problem Bank<span className="bank-count">{allProblems.length}</span></h1>
          <p>Từng bài một, từng bước tiến bộ. Luyện giải với C++ và Python.</p>
        </div>
        <Link className="bank-outline-link" to="/">
          Xem lộ trình <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <div className="bank-overview">
        {Object.entries(difficultyLabels).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`bank-level bank-level--${value}`}
            aria-pressed={difficulty === value}
            onClick={() => setDifficulty(difficulty === value ? "" : value)}
          >
            <span className="bank-level__dot" aria-hidden="true" />
            <span>{label}<small>{levelDescriptions[value]}</small></span>
            <strong>{allProblems.filter((problem) => problem.difficulty === value).length}</strong>
          </button>
        ))}
      </div>
      <div className="bank-browser">
        <div className="bank-browser__heading">
          <h2>Danh sách bài tập</h2><span>C++ / Python</span>
        </div>
        <div className="bank-filters">
          <label className="bank-search" htmlFor="bank-search">
            <span aria-hidden="true">⌕</span>
            <span className="bank-sr-only">Tìm bài tập</span>
            <input
              id="bank-search"
              type="search"
              placeholder="Tìm tên bài, mã bài, chủ đề…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="bank-sr-only" htmlFor="bank-chapter">Lọc theo chương</label>
          <select id="bank-chapter" value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
            <option value="">Tất cả chương</option>
            {problemChapterIds.map((id) => (
              <option key={id} value={id}>Chương {Number(id.slice(2))}</option>
            ))}
          </select>
          <label className="bank-sr-only" htmlFor="bank-difficulty">Lọc độ khó</label>
          <select id="bank-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">Mọi độ khó</option>
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <label className="bank-sr-only" htmlFor="bank-sort">Sắp xếp bài tập</label>
          <select id="bank-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="default">Theo mã bài</option>
            <option value="difficulty">Độ khó tăng dần</option>
            <option value="title">Tên bài A–Z</option>
          </select>
        </div>
        <div className="bank-topics" role="group" aria-label="Lọc theo chủ đề">
          <button type="button" aria-pressed={!topic} onClick={() => setTopic("")}>Tất cả chủ đề</button>
          {topics.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={topic === tag}
              onClick={() => setTopic(topic === tag ? "" : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="bank-results">
          <span role="status" aria-live="polite">
            Hiển thị <b>{problems.length}</b> / {allProblems.length} bài tập
          </span>
          {hasFilters && <button type="button" onClick={resetFilters}>Xóa bộ lọc</button>}
        </div>
        <div className="bank-table-wrap" tabIndex={0} role="region" aria-label="Bảng bài tập, cuộn ngang trên màn hình nhỏ">
          <table className="bank-table">
            <caption className="bank-sr-only">Danh sách bài tập lập trình</caption>
            <thead>
              <tr>
                <th scope="col">Mã bài</th>
                <th scope="col">Tên bài tập</th>
                <th scope="col">Độ khó</th>
                <th scope="col">Chương</th>
                <th scope="col"><span className="bank-sr-only">Mở bài tập</span></th>
              </tr>
            </thead>
            <tbody>{problems.map((problem) => <ProblemRow key={problem.id} problem={problem} />)}</tbody>
          </table>
        </div>
        {problems.length === 0 && (
          <div className="bank-empty">
            <span aria-hidden="true">⌕</span>
            <h3>{emptyChapter ? "Chương này chưa có bài tập" : allProblems.length === 0 ? "Chưa có bài tập" : "Không tìm thấy bài phù hợp"}</h3>
            <p>Thử từ khóa khác hoặc bỏ bớt bộ lọc để xem thêm bài tập.</p>
            <button type="button" onClick={resetFilters}>Xem tất cả bài tập</button>
          </div>
        )}
        <footer className="bank-footer">Chọn một bài để đọc đề, xem ví dụ và viết lời giải.</footer>
      </div>
    </section>
  );
}
