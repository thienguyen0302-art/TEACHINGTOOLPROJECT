import useContestData from '../hooks/useContestData.js';
import {listPracticeProblems} from '../services/contestService.js';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { difficultyLabels, listProblems, problemChapterIds } from "../services/problemService";
import "./Practice.css";

const levelDescriptions = {
  basic: "Nắm vững nền tảng",
  intermediate: "Rèn tư duy giải bài",
  advanced: "Thử sức bài toán HSG",
};

function ProblemRow({ problem }) {
  const url = problem.practicePublished ? `/practice/problem/${problem.id}` : `/problem/${problem.slug}`;
  return (
    <tr className="practice-table-row">
      <td className="practice-col-id">{problem.id}</td>
      <td className="practice-col-main">
        <Link className="practice-prob-title" to={url}>{problem.title}</Link>
        <div className="practice-row-tags">
          {problem.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </td>
      <td className="practice-col-diff">
        <span className={`practice-diff-badge practice-diff--${problem.difficulty}`}>
          {difficultyLabels[problem.difficulty]}
        </span>
      </td>
      <td className="practice-col-chapter">{problem.practicePublished?'Giáo viên đăng':`Chương ${Number(problem.chapterId.slice(2))}`}</td>
      <td className="practice-col-action">
        <Link className="practice-open-btn" aria-label={`Làm bài ${problem.title}`} to={url}>→</Link>
      </td>
    </tr>
  );
}

export default function Practice() {
  const nav = useNavigate();
  const [difficulty, setDifficulty] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const bank=useContestData(listPracticeProblems,{poll:15000});
  const additional=bank.value??[];
  const allProblems = listProblems({additional});
  const topics = [...new Set(allProblems.flatMap((problem) => problem.tags))].sort();
  const TOPICS_COLLAPSED = 8;
  // Thu gọn: chỉ hiện vài chủ đề đầu, nhưng luôn giữ chủ đề đang chọn hiển thị.
  const visibleTopics = showAllTopics || topics.length <= TOPICS_COLLAPSED
    ? topics
    : [...topics.slice(0, TOPICS_COLLAPSED), ...(topic && !topics.slice(0, TOPICS_COLLAPSED).includes(topic) ? [topic] : [])];
  const hiddenTopicCount = topics.length - visibleTopics.length;
  const problems = listProblems({ difficulty, chapterId, topic, query, sort, additional });
  const hasFilters = Boolean(difficulty || chapterId || topic || query || sort !== "default");
  const emptyChapter = chapterId && listProblems({ chapterId, additional }).length === 0;

  function resetFilters() {
    setDifficulty("");
    setChapterId("");
    setTopic("");
    setQuery("");
    setSort("default");
  }

  return (
    <div className="content practice-page">
      {bank.loading&&<p role="status">Đang tải bài tập giáo viên…</p>}
      {bank.error&&<p role="alert">Chưa tải được bài giáo viên: {bank.error} <button onClick={bank.refresh}>Thử lại</button></p>}
      <section className="practice-hero">
        <div>
          <span><Icon name="code" /> LUYỆN TẬP LẬP TRÌNH</span>
          <h1>Kho bài tập</h1>
          <p>Từng bài một, từng bước tiến bộ. Luyện giải với C++ và Python.</p>
        </div>
        <div className="practice-hero-stat">
          <strong>{allProblems.length}</strong>
          <span>tổng số bài tập</span>
          <button type="button" onClick={() => nav("/curriculum")}>
            Xem lộ trình
          </button>
        </div>
      </section>

      <div className="practice-overview">
        {Object.entries(difficultyLabels).map(([value, label]) => {
          const count = allProblems.filter((p) => p.difficulty === value).length;
          const isSelected = difficulty === value;
          return (
            <button
              key={value}
              type="button"
              className={`practice-level-card practice-level--${value} ${isSelected ? "selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => setDifficulty(isSelected ? "" : value)}
            >
              <div className="practice-level-info">
                <span className="practice-level-title">
                  <i className="practice-level-dot" aria-hidden="true" />
                  {label}
                </span>
                <small>{levelDescriptions[value]}</small>
              </div>
              <strong className="practice-level-count">{count}</strong>
            </button>
          );
        })}
      </div>

      <section className="practice-browser-card">
        <div className="practice-card-heading">
          <div>
            <span>DANH SÁCH BÀI TẬP</span>
            <h2>Danh sách bài tập</h2>
          </div>
          <strong>C++ / Python</strong>
        </div>

        <div className="practice-filters">
          <label className="practice-search" htmlFor="bank-search">
            <Icon name="search" />
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

        <div className="practice-topics" role="group" aria-label="Lọc theo chủ đề">
          <button
            type="button"
            className={`practice-topic-chip ${!topic ? "active" : ""}`}
            aria-pressed={!topic}
            onClick={() => setTopic("")}
          >
            Tất cả chủ đề
          </button>
          {visibleTopics.map((tag) => {
            const isSelected = topic === tag;
            return (
              <button
                key={tag}
                type="button"
                className={`practice-topic-chip ${isSelected ? "active" : ""}`}
                aria-pressed={isSelected}
                onClick={() => setTopic(isSelected ? "" : tag)}
              >
                {tag}
              </button>
            );
          })}
          {topics.length > TOPICS_COLLAPSED && (
            <button
              type="button"
              className="practice-topic-chip practice-topic-toggle"
              aria-expanded={showAllTopics}
              onClick={() => setShowAllTopics((v) => !v)}
            >
              {showAllTopics ? "Thu gọn" : `+${hiddenTopicCount} chủ đề`}
            </button>
          )}
        </div>

        <div className="practice-results-bar">
          <span role="status" aria-live="polite">
            Hiển thị <b>{problems.length}</b> / {allProblems.length} bài tập
          </span>
          {hasFilters && (
            <button type="button" className="practice-clear-filters" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="practice-table-wrap" tabIndex={0} role="region" aria-label="Bảng bài tập, cuộn ngang trên màn hình nhỏ">
          <table className="practice-table">
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
          <div className="practice-empty">
            <Icon name="search" />
            <h3>{emptyChapter ? "Chương này chưa có bài tập" : allProblems.length === 0 ? "Chưa có bài tập" : "Không tìm thấy bài phù hợp"}</h3>
            <p>Thử từ khóa khác hoặc bỏ bớt bộ lọc để xem thêm bài tập.</p>
            <button type="button" onClick={resetFilters}>Xem tất cả bài tập</button>
          </div>
        )}

        <footer className="practice-footer">Chọn một bài để đọc đề, xem ví dụ và viết lời giải.</footer>
      </section>
    </div>
  );
}