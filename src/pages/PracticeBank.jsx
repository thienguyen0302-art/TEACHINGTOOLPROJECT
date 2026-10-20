import useContestData from '../hooks/useContestData.js';
import {listPracticeProblems} from '../services/contestService.js';
import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { difficultyLabels, listProblems, problemChapterIds } from "../services/problemService";
import "../styles/pages-shared.css";
import "./Practice.css";


function ProblemRow({ problem }) {
  const url = problem.practicePublished ? `/practice/problem/${problem.id}` : `/problem/${problem.slug}`;
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", color: "#64748b", fontSize: 12, fontWeight: 700 }}>{problem.id}</td>
      <td style={{ minWidth: 240 }}>
        <Link
          to={url}
          style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
        >
          {problem.title}
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {problem.tags.map((tag) => (
            <span key={tag} className="ps-chip active" style={{ height: "auto", padding: "1px 8px", fontSize: 11 }}>
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td>
        <span className={`ps-diff ${problem.difficulty}`}>
          {difficultyLabels[problem.difficulty]}
        </span>
      </td>
      <td style={{ color: "#64748b", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
        {problem.practicePublished?'Giáo viên đăng':`Chương ${Number(problem.chapterId.slice(2))}`}
      </td>
      <td>
        <Link className="ps-open-btn" aria-label={`Làm bài ${problem.title}`} to={url}>→</Link>
      </td>
    </tr>
  );
}

export default function PracticeBank() {
  const [difficulty, setDifficulty] = useState("");
  const [chapterId, setChapterId]   = useState("");
  const [topic, setTopic]           = useState("");
  const [query, setQuery]           = useState("");
  const [sort, setSort]             = useState("default");

  const bank=useContestData(listPracticeProblems,{poll:15000});
  const additional=bank.value??[];
  const allProblems = listProblems({additional});
  const topics      = [...new Set(allProblems.flatMap((p) => p.tags))].sort();
  const problems    = listProblems({ difficulty, chapterId, topic, query, sort, additional });
  const hasFilters  = Boolean(difficulty || chapterId || topic || query || sort !== "default");
  const emptyChapter = chapterId && listProblems({ chapterId, additional }).length === 0;

  function resetFilters() {
    setDifficulty(""); setChapterId(""); setTopic(""); setQuery(""); setSort("default");
  }

  return (
    <div className="content ps-page">

      {bank.loading&&<p role="status">Đang tải bài tập giáo viên…</p>}
      {bank.error&&<p role="alert">Chưa tải được bài giáo viên: {bank.error} <button onClick={bank.refresh}>Thử lại</button></p>}
      {/* Header */}
      <div className="ps-page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Kho bài tập</h1>
          <p>Từng bài một, từng bước tiến bộ · Luyện giải với C++ và Python</p>
        </div>
        <span className="ps-badge cpp" style={{ fontSize: 13, padding: "4px 14px", alignSelf: "center" }}>
          C++ / Python
        </span>
      </div>

      {/* Card chứa bảng */}
      <div className="ps-card">

        {/* Toolbar */}
        <div className="ps-toolbar">
          <div className="ps-search">
            <Icon name="search" />
            <input
              id="bank-search"
              type="search"
              placeholder="Tìm tên bài, mã bài, chủ đề…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="ps-select" value={chapterId} onChange={(e) => setChapterId(e.target.value)} aria-label="Lọc theo chương">
            <option value="">Tất cả chương</option>
            {problemChapterIds.map((id) => (
              <option key={id} value={id}>Chương {Number(id.slice(2))}</option>
            ))}
          </select>
          <select className="ps-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Lọc độ khó">
            <option value="">Mọi độ khó</option>
            {Object.entries(difficultyLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select className="ps-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp">
            <option value="default">Theo mã bài</option>
            <option value="difficulty">Độ khó tăng dần</option>
            <option value="title">Tên bài A–Z</option>
          </select>
        </div>

        {/* Topic chips */}
        <div className="ps-chips" role="group" aria-label="Lọc theo chủ đề">
          <button
            type="button"
            className={`ps-chip ${!topic ? "active" : ""}`}
            aria-pressed={!topic}
            onClick={() => setTopic("")}
          >Tất cả chủ đề</button>
          {topics.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`ps-chip ${topic === tag ? "active" : ""}`}
              aria-pressed={topic === tag}
              onClick={() => setTopic(topic === tag ? "" : tag)}
            >{tag}</button>
          ))}
        </div>

        {/* Results bar */}
        <div className="ps-results-bar">
          <span role="status" aria-live="polite">
            Hiển thị <b>{problems.length}</b> / {allProblems.length} bài tập
          </span>
          {hasFilters && (
            <button type="button" className="ps-clear-btn" onClick={resetFilters}>Xóa bộ lọc</button>
          )}
        </div>

        {/* Table */}
        <div className="ps-table-wrap" tabIndex={0} role="region" aria-label="Bảng bài tập, cuộn ngang trên màn hình nhỏ">
          <table className="ps-table">
            <caption style={{ display: "none" }}>Danh sách bài tập lập trình</caption>
            <thead>
              <tr>
                <th scope="col">Mã bài</th>
                <th scope="col">Tên bài tập &amp; Chủ đề</th>
                <th scope="col">Độ khó</th>
                <th scope="col">Chương</th>
                <th scope="col"><span style={{ visibility: "hidden" }}>Mở bài</span></th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <ProblemRow key={problem.id} problem={problem} />
              ))}
              {problems.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="ps-empty">
                      <Icon name="search" />
                      <h3>{emptyChapter ? "Chương này chưa có bài tập" : allProblems.length === 0 ? "Chưa có bài tập" : "Không tìm thấy bài phù hợp"}</h3>
                      <p>Thử từ khóa khác hoặc bỏ bớt bộ lọc để xem thêm bài tập.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="ps-footer-hint">Chọn một bài để đọc đề, xem ví dụ và viết lời giải.</p>
      </div>
    </div>
  );
}
