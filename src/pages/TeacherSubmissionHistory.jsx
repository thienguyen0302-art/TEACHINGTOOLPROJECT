import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { getClassOverview } from "../services/teacherService";
import { loadStudentRecords, loadContestRecords } from "../services/studentHistoryService";
import {
  CATEGORIES, CODE_KIND_LABEL, buildTheoryRows, buildExerciseRows, buildContestRows, summarizeHistory, filterRows,
} from "../utils/submissionHistory";
import { LANG_LABEL, initials } from "../utils/format";
import "../styles/pages-shared.css";
import "./Teacher.css";
import "./TeacherSubmissionHistory.css";

const fmt = (ms) => (ms ? new Date(ms).toLocaleString("vi-VN", { hour12: false }) : "—");
const chapterLabel = (r) => (r.chapterOrder ? `Chương ${r.chapterOrder}` : "—");

export default function TeacherSubmissionHistory() {
  const [params, setParams] = useSearchParams();
  const studentId = params.get("studentId") || "";
  const tab = CATEGORIES.some((c) => c.id === params.get("tab")) ? params.get("tab") : "exercise";

  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [state, setState] = useState({ loading: false, error: "", records: null, contestRecords: null });
  const [filters, setFilters] = useState({ search: "", language: "all", status: "all", kind: "all", contestId: "all" });
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getClassOverview()
      .then((o) => setStudents(o.students))
      .catch((e) => setState((s) => ({ ...s, error: `Không tải được danh sách học sinh: ${e.code || e.message}` })));
  }, []);

  useEffect(() => {
    if (!studentId) return undefined;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ loading: true, error: "", records: null, contestRecords: null });
    Promise.all([loadStudentRecords(studentId), loadContestRecords()])
      .then(([records, contestRecords]) => {
        if (!cancelled) setState({ loading: false, error: "", records, contestRecords });
      })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: `Không tải được lịch sử nộp bài: ${e.code || e.message}`, records: null, contestRecords: null });
      });
    return () => { cancelled = true; };
  }, [studentId]);

  const student = students.find((s) => s.uid === studentId) ?? null;

  const data = useMemo(() => {
    if (!state.records) return { theory: [], exercise: [], contest: [] };
    const { progress, submissions, chapters } = state.records;
    return {
      theory: buildTheoryRows(progress, chapters),
      exercise: buildExerciseRows(progress, submissions),
      contest: buildContestRows(studentId, state.contestRecords?.contests, state.contestRecords?.submissionsByContest),
    };
  }, [state.records, state.contestRecords, studentId]);

  const summary = useMemo(() => summarizeHistory(data), [data]);
  const rows = useMemo(() => filterRows(data[tab], filters), [data, tab, filters]);

  const pickStudent = (uid) => {
    setOpenId(null);
    setParams(uid ? { studentId: uid, tab } : {});
  };
  const pickTab = (id) => {
    setOpenId(null);
    setFilters((f) => ({ ...f, status: "all", kind: "all", contestId: "all" }));
    setParams({ studentId, tab: id });
  };
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const studentChoices = students
    .filter((s) => `${s.name} ${s.className} ${s.school}`.toLowerCase().includes(studentSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div className="content ps-page">
      <div className="ps-page-header">
        <div>
          <h1>Lịch sử nộp bài của học sinh</h1>
          <p>Xem riêng từng nhóm: Lý thuyết (Self-Check), Bài tập (quiz và bài code) và Contest.</p>
        </div>
      </div>

      <div className="ps-card tsh-picker">
        <div className="ps-search">
          <Icon name="search" />
          <input type="search" placeholder="Tìm học sinh, lớp, trường..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
        </div>
        <select className="ps-select" value={studentId} onChange={(e) => pickStudent(e.target.value)} aria-label="Chọn học sinh">
          <option value="">— Chọn học sinh ({studentChoices.length}) —</option>
          {studentChoices.map((s) => (
            <option key={s.uid} value={s.uid}>
              {s.name}{s.className ? ` · Lớp ${s.className}` : ""}
            </option>
          ))}
        </select>
      </div>

      {state.error && <div className="ps-card tsh-error">{state.error}</div>}

      {!studentId && !state.error && (
        <div className="ps-card ps-empty">Chọn một học sinh để xem lịch sử nộp bài.</div>
      )}

      {studentId && (
        <div className="ps-card">
          <div className="tsh-student">
            <span className="ps-avatar">{initials({ displayName: student?.name ?? "?" })}</span>
            <div>
              <strong>{student?.name ?? "Học sinh"}</strong>
              <small>
                {student?.className ? `Lớp ${student.className}` : "Chưa có lớp"}
                {student?.school ? ` · ${student.school}` : ""}
                {student?.language ? ` · ${LANG_LABEL[student.language]}` : ""}
              </small>
            </div>
          </div>

          <div className="tsh-cards">
            <button type="button" className={`tsh-stat ${tab === "theory" ? "active" : ""}`} onClick={() => pickTab("theory")}>
              <span>Lý thuyết</span>
              <strong>{summary.theory.count}</strong>
              <small>câu Self-Check · {summary.theory.chapters} chương</small>
            </button>
            <button type="button" className={`tsh-stat ${tab === "exercise" ? "active" : ""}`} onClick={() => pickTab("exercise")}>
              <span>Bài tập</span>
              <strong>{summary.exercise.count}</strong>
              <small>{summary.exercise.solved} đạt · {summary.exercise.attempts} lần nộp</small>
            </button>
            <button type="button" className={`tsh-stat ${tab === "contest" ? "active" : ""}`} onClick={() => pickTab("contest")}>
              <span>Contest</span>
              <strong>{summary.contest.count}</strong>
              <small>{summary.contest.accepted} Accepted · {summary.contest.contests} kỳ thi</small>
            </button>
          </div>

          <div className="ps-tabs">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={`ps-tab-btn ${tab === c.id ? "active" : ""}`} onClick={() => pickTab(c.id)}>
                {c.label} ({data[c.id].length})
              </button>
            ))}
          </div>

          <div className="ps-toolbar">
            <div className="ps-search">
              <Icon name="search" />
              <input type="search" placeholder="Tìm theo tên bài, nội dung..." value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
            </div>
            <select className="ps-select" value={filters.language} onChange={(e) => setFilter("language", e.target.value)} aria-label="Ngôn ngữ">
              <option value="all">Mọi ngôn ngữ</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
            {tab === "exercise" && (
              <>
                <select className="ps-select" value={filters.kind} onChange={(e) => setFilter("kind", e.target.value)} aria-label="Loại bài tập">
                  <option value="all">Mọi loại bài tập</option>
                  <option value="quiz">Quiz chương</option>
                  {Object.entries(CODE_KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <select className="ps-select" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Trạng thái">
                  <option value="all">Mọi trạng thái</option>
                  <option value="done">Đã đạt</option>
                  <option value="notyet">Chưa đạt</option>
                </select>
              </>
            )}
            {tab === "contest" && (
              <>
                <select className="ps-select" value={filters.contestId} onChange={(e) => setFilter("contestId", e.target.value)} aria-label="Kỳ thi">
                  <option value="all">Mọi kỳ thi</option>
                  {(state.contestRecords?.contests ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select className="ps-select" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Kết quả">
                  <option value="all">Mọi kết quả</option>
                  <option value="done">Accepted</option>
                  <option value="notyet">Chưa Accepted</option>
                </select>
              </>
            )}
          </div>

          {state.loading ? (
            <div className="ps-empty">Đang tải lịch sử...</div>
          ) : rows.length === 0 ? (
            <div className="ps-empty">Chưa có bài nộp nào trong nhóm này{data[tab].length ? " khớp bộ lọc" : ""}.</div>
          ) : (
            <div className="ps-table-wrap">
              {tab === "theory" && <TheoryTable rows={rows} openId={openId} setOpenId={setOpenId} />}
              {tab === "exercise" && <ExerciseTable rows={rows} />}
              {tab === "contest" && <ContestTable rows={rows} openId={openId} setOpenId={setOpenId} />}
            </div>
          )}

          <p className="ps-footer-hint">
            {tab === "contest"
              ? "Contest lưu từng lần nộp kèm mã nguồn."
              : "Quiz và bài code trong bài học chỉ lưu bản tổng hợp theo từng bài (số lần nộp, điểm cao nhất, lần nộp cuối), không lưu từng lần nộp. Mã nguồn bài học không được lưu."}
          </p>
        </div>
      )}
    </div>
  );
}

function TheoryTable({ rows, openId, setOpenId }) {
  return (
    <table className="ps-table">
      <thead><tr><th>Chương</th><th>Câu hỏi Self-Check</th><th>Ngôn ngữ</th><th>Đã làm trong chương</th><th>Cập nhật</th><th /></tr></thead>
      <tbody>
        {rows.map((r) => (
          <FragmentRow key={r.id} open={openId === r.id} colSpan={6}
            detail={<div className="tsh-answer"><b>Câu trả lời của học sinh:</b><p>{r.answer}</p></div>}>
            <td>{chapterLabel(r)}</td>
            <td><strong>{r.title}</strong></td>
            <td>{LANG_LABEL[r.language] ?? r.language}</td>
            <td>{r.answeredInChapter}{r.totalInChapter ? `/${r.totalInChapter}` : ""} câu</td>
            <td>{fmt(r.at)}</td>
            <td><button type="button" className="ps-open-btn" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? "Ẩn" : "Xem"}</button></td>
          </FragmentRow>
        ))}
      </tbody>
    </table>
  );
}

function ExerciseTable({ rows }) {
  return (
    <table className="ps-table">
      <thead><tr><th>Loại</th><th>Bài</th><th>Chương</th><th>Ngôn ngữ</th><th>Lần nộp</th><th>Điểm cao nhất</th><th>Kết quả</th><th>Nộp gần nhất</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td><span className="tsh-tag" data-kind={r.kind}>{r.kindLabel}</span></td>
            <td><strong>{r.title}</strong>{r.detail && <small className="tsh-sub">{r.detail}</small>}</td>
            <td>{chapterLabel(r)}</td>
            <td>{LANG_LABEL[r.language] ?? r.language}</td>
            <td>{r.attempts}</td>
            <td><b>{r.score}%</b></td>
            <td><span className={`tsh-badge ${r.solved ? "ok" : "no"}`}>{r.solved ? "Đạt" : "Chưa đạt"}</span></td>
            <td>{fmt(r.at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContestTable({ rows, openId, setOpenId }) {
  return (
    <table className="ps-table">
      <thead><tr><th>Kỳ thi</th><th>Bài</th><th>Ngôn ngữ</th><th>Kết quả</th><th>Test</th><th>Điểm</th><th>Thời gian nộp</th><th /></tr></thead>
      <tbody>
        {rows.map((r) => (
          <FragmentRow key={r.id} open={openId === r.id} colSpan={8}
            detail={r.source ? <pre className="tsh-code">{r.source}</pre> : <div className="tsh-answer">Không có mã nguồn lưu cho lần nộp này.</div>}>
            <td>{r.contestTitle}</td>
            <td><strong>{r.problemId}</strong></td>
            <td>{LANG_LABEL[r.language] ?? r.language}</td>
            <td><span className={`tsh-badge ${r.accepted ? "ok" : "no"}`}>{r.status}</span></td>
            <td>{r.total ? `${r.passed}/${r.total}` : "—"}</td>
            <td><b>{r.earnedPoints}</b> <small>({r.score}%)</small></td>
            <td>{fmt(r.at)}</td>
            <td><button type="button" className="ps-open-btn" onClick={() => setOpenId(openId === r.id ? null : r.id)}>{openId === r.id ? "Ẩn code" : "Xem code"}</button></td>
          </FragmentRow>
        ))}
      </tbody>
    </table>
  );
}

function FragmentRow({ open, colSpan, detail, children }) {
  return (
    <>
      <tr>{children}</tr>
      {open && <tr className="tsh-detail"><td colSpan={colSpan}>{detail}</td></tr>}
    </>
  );
}
