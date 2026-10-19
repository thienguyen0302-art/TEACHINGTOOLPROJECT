import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import TeacherAuthoringNav from "../components/TeacherAuthoringNav";
import {
  listTeacherContests,
  loadScoreboard,
  loadContestSubmissions,
  listTeacherProblems,
} from "../services/contestService";
import { getClassOverview } from "../services/teacherService";
import { LANG_LABEL, initials } from "../utils/format";
import { contestPhase } from "../utils/contest";
import "../styles/pages-shared.css";
import "./Teacher.css";
import "./TeacherContestHistory.css";

function formatDateTime(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getVerdictInfo(status, passed, total) {
  const s = (status || "").toLowerCase();
  if (s === "accepted" || (passed !== undefined && total !== undefined && passed === total && total > 0)) {
    return { label: "Accepted (AC)", className: "ac", code: "AC" };
  }
  if (s === "wrong answer" || s === "wa") {
    return { label: "Wrong Answer (WA)", className: "wa", code: "WA" };
  }
  if (s === "time limit exceeded" || s === "tle") {
    return { label: "Time Limit (TLE)", className: "tle", code: "TLE" };
  }
  if (s === "runtime error" || s === "rte" || s === "re") {
    return { label: "Runtime Error (RTE)", className: "rte", code: "RTE" };
  }
  if (s === "compilation error" || s === "ce") {
    return { label: "Compile Error (CE)", className: "ce", code: "CE" };
  }
  if (s === "partial" || (passed > 0 && passed < total)) {
    return { label: "Partial", className: "partial", code: "Part" };
  }
  return { label: status || "Submitted", className: "ce", code: status || "Sub" };
}

export default function TeacherContestHistory() {
  const [searchParams] = useSearchParams();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "leaderboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Data states
  const [contests, setContests] = useState([]);
  const [problemsMap, setProblemsMap] = useState({});
  const [studentsMap, setStudentsMap] = useState({});
  const [selectedContestId, setSelectedContestId] = useState(
    () => searchParams.get("contestId") || ""
  );

  // Scoreboards & Submissions cache per contest: { [contestId]: rows }
  const [scoreboards, setScoreboards] = useState({});
  const [submissionsByContest, setSubmissionsByContest] = useState({});

  // Filters
  const [searchStudent, setSearchStudent] = useState(
    () => searchParams.get("studentId") || searchParams.get("search") || ""
  );
  const [filterVerdict, setFilterVerdict] = useState("all");
  const [filterLang, setFilterLang] = useState("all");

  // Code Viewer Modal
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load Initial Data: Contests, Students, Problem Bank
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError("");
      try {
        const [contestList, overview, problemsList] = await Promise.all([
          listTeacherContests().catch(() => []),
          getClassOverview().catch(() => null),
          listTeacherProblems().catch(() => []),
        ]);

        if (cancelled) return;

        const sortedContests = (contestList || []).sort(
          (a, b) => (b.startAt || 0) - (a.startAt || 0)
        );
        setContests(sortedContests);

        // Map problems by ID
        const pMap = {};
        (problemsList || []).forEach((p) => {
          pMap[p.id] = p;
        });
        setProblemsMap(pMap);

        // Map students by UID
        const sMap = {};
        (overview?.students || []).forEach((s) => {
          sMap[s.uid] = s;
        });
        setStudentsMap(sMap);

        // Default selected contest
        let currentContestId = selectedContestId;
        if (!currentContestId && sortedContests.length > 0) {
          currentContestId = sortedContests[0].id;
          setSelectedContestId(currentContestId);
        }

        // Fetch scoreboards & submissions for all contests in parallel
        const scMap = {};
        const subMap = {};
        await Promise.all(
          sortedContests.map(async (c) => {
            const [sc, subs] = await Promise.all([
              loadScoreboard(c.id).catch(() => []),
              loadContestSubmissions(c.id).catch(() => []),
            ]);
            scMap[c.id] = sc || [];
            subMap[c.id] = subs || [];
          })
        );

        if (cancelled) return;
        setScoreboards(scMap);
        setSubmissionsByContest(subMap);
      } catch (err) {
        if (!cancelled) setError("Lỗi khi tải dữ liệu tracking contest: " + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi mở trang
  }, []);

  function showToast(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  // Active Contest Detail
  const activeContest = useMemo(() => {
    return contests.find((c) => c.id === selectedContestId) || contests[0] || null;
  }, [contests, selectedContestId]);

  // Active Scoreboard
  const activeScoreboard = useMemo(() => {
    if (!activeContest) return [];
    return scoreboards[activeContest.id] || [];
  }, [activeContest, scoreboards]);

  // All Submissions Flatted
  const allSubmissions = useMemo(() => {
    const list = [];
    contests.forEach((c) => {
      const subs = submissionsByContest[c.id] || [];
      subs.forEach((s) => {
        list.push({
          ...s,
          contestId: c.id,
          contestTitle: c.title,
        });
      });
    });
    return list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }, [contests, submissionsByContest]);

  // Aggregate Stats across all contests
  const globalStats = useMemo(() => {
    const totalContests = contests.length;
    const participantUids = new Set();
    let totalSubmissions = 0;
    let totalAcSubmissions = 0;

    Object.values(scoreboards).forEach((rows) => {
      (rows || []).forEach((r) => participantUids.add(r.uid));
    });

    allSubmissions.forEach((s) => {
      totalSubmissions++;
      if (s.status === "Accepted" || (s.passed && s.passed === s.total)) {
        totalAcSubmissions++;
      }
    });

    const acRate =
      totalSubmissions > 0 ? Math.round((totalAcSubmissions / totalSubmissions) * 100) : 0;

    return {
      totalContests,
      totalParticipants: participantUids.size,
      totalSubmissions,
      acRate,
    };
  }, [contests, scoreboards, allSubmissions]);

  // Filtered Submissions for Tab 2
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter((s) => {
      // Contest filter
      if (selectedContestId && selectedContestId !== "all" && s.contestId !== selectedContestId) {
        return false;
      }

      // Search query (student name, uid, problemId)
      if (searchStudent) {
        const query = searchStudent.toLowerCase();
        const student = studentsMap[s.uid];
        const studentName = (student?.name || s.displayName || "").toLowerCase();
        const uid = (s.uid || "").toLowerCase();
        const problem = problemsMap[s.problemId];
        const problemTitle = (problem?.title || s.problemId || "").toLowerCase();
        const match =
          studentName.includes(query) || uid.includes(query) || problemTitle.includes(query);
        if (!match) return false;
      }

      // Verdict filter
      if (filterVerdict !== "all") {
        const info = getVerdictInfo(s.status, s.passed, s.total);
        if (filterVerdict === "ac" && info.className !== "ac") return false;
        if (filterVerdict === "wa" && info.className !== "wa") return false;
        if (filterVerdict === "tle" && info.className !== "tle") return false;
        if (filterVerdict === "rte" && info.className !== "rte") return false;
        if (filterVerdict === "ce" && info.className !== "ce") return false;
      }

      // Language filter
      if (filterLang !== "all" && s.language !== filterLang) {
        return false;
      }

      return true;
    });
  }, [allSubmissions, selectedContestId, searchStudent, filterVerdict, filterLang, studentsMap, problemsMap]);

  // Filtered Scoreboard for Tab 1
  const filteredScoreboard = useMemo(() => {
    if (!searchStudent) return activeScoreboard;
    const query = searchStudent.toLowerCase();
    return activeScoreboard.filter((row) => {
      const student = studentsMap[row.uid];
      const name = (student?.name || row.displayName || "").toLowerCase();
      const uid = (row.uid || "").toLowerCase();
      return name.includes(query) || uid.includes(query);
    });
  }, [activeScoreboard, searchStudent, studentsMap]);

  // Student summary map for Tab 3
  const studentSummaries = useMemo(() => {
    const map = {};
    // Populate from class roster
    Object.values(studentsMap).forEach((st) => {
      map[st.uid] = {
        student: st,
        contestsJoined: new Set(),
        submissionsCount: 0,
        acCount: 0,
        highestContestScore: 0,
        lastSubmittedAt: 0,
      };
    });

    // Populate from scoreboards
    Object.entries(scoreboards).forEach(([cid, rows]) => {
      rows.forEach((r) => {
        if (!map[r.uid]) {
          map[r.uid] = {
            student: { uid: r.uid, name: r.displayName || `Học sinh ${r.uid.slice(0, 6)}` },
            contestsJoined: new Set(),
            submissionsCount: 0,
            acCount: 0,
            highestContestScore: 0,
            lastSubmittedAt: 0,
          };
        }
        map[r.uid].contestsJoined.add(cid);
        if (r.totalScore > map[r.uid].highestContestScore) {
          map[r.uid].highestContestScore = r.totalScore;
        }
      });
    });

    // Populate from submissions
    allSubmissions.forEach((s) => {
      if (!map[s.uid]) {
        map[s.uid] = {
          student: { uid: s.uid, name: s.displayName || `Học sinh ${s.uid.slice(0, 6)}` },
          contestsJoined: new Set(),
          submissionsCount: 0,
          acCount: 0,
          highestContestScore: 0,
          lastSubmittedAt: 0,
        };
      }
      map[s.uid].submissionsCount++;
      map[s.uid].contestsJoined.add(s.contestId);
      if (s.status === "Accepted" || (s.passed && s.passed === s.total)) {
        map[s.uid].acCount++;
      }
      if (s.submittedAt > map[s.uid].lastSubmittedAt) {
        map[s.uid].lastSubmittedAt = s.submittedAt;
      }
    });

    return Object.values(map)
      .filter((item) => item.contestsJoined.size > 0 || item.submissionsCount > 0)
      .sort((a, b) => b.highestContestScore - a.highestContestScore || b.lastSubmittedAt - a.lastSubmittedAt);
  }, [studentsMap, scoreboards, allSubmissions]);

  // Export Leaderboard CSV
  function handleExportLeaderboardCSV() {
    if (!activeContest || !activeScoreboard || activeScoreboard.length === 0) {
      showToast("Không có dữ liệu bảng điểm để xuất CSV.");
      return;
    }

    const problemHeaders = (activeContest.problems || []).map(
      (p, i) => `Bài ${String.fromCharCode(65 + i)} (${p.points}đ)`
    );

    const header = [
      "Hạng",
      "Họ và tên",
      "Lớp",
      "Trường",
      "UID",
      "Tổng điểm",
      ...problemHeaders,
      "Thời gian nộp cuối",
    ];

    const rows = activeScoreboard.map((row, idx) => {
      const st = studentsMap[row.uid];
      const name = st?.name || row.displayName || `Học sinh ${row.uid.slice(0, 6)}`;
      const className = st?.className || "";
      const school = st?.school || "";

      const pScores = (activeContest.problems || []).map((p) => {
        const prob = row.problems?.[p.problemId];
        if (!prob) return "Chưa làm";
        return `${prob.earnedPoints || 0}đ (${prob.attempts || 1} lần, ${prob.lastStatus || ""})`;
      });

      return [
        idx + 1,
        `"${name.replaceAll('"', '""')}"`,
        `"${className.replaceAll('"', '""')}"`,
        `"${school.replaceAll('"', '""')}"`,
        row.uid,
        row.totalScore,
        ...pScores.map((s) => `"${s.replaceAll('"', '""')}"`),
        `"${formatDateTime(row.lastSubmissionAt)}"`,
      ];
    });

    const csvContent =
      "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Bang_diem_${activeContest.title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất bảng điểm contest ra file CSV thành công!");
  }

  // Export Submissions CSV
  function handleExportSubmissionsCSV() {
    if (!filteredSubmissions || filteredSubmissions.length === 0) {
      showToast("Không có bài nộp nào để xuất CSV.");
      return;
    }

    const header = [
      "STT",
      "Thời gian nộp",
      "Kỳ thi",
      "Học sinh",
      "Lớp",
      "Mã bài",
      "Ngôn ngữ",
      "Điểm đạt",
      "Tests đúng",
      "Kết quả",
    ];

    const rows = filteredSubmissions.map((s, idx) => {
      const st = studentsMap[s.uid];
      const name = st?.name || s.displayName || `Học sinh ${s.uid.slice(0, 6)}`;
      const prob = problemsMap[s.problemId];
      const pTitle = prob?.title || s.problemId;
      return [
        idx + 1,
        `"${formatDateTime(s.submittedAt)}"`,
        `"${s.contestTitle.replaceAll('"', '""')}"`,
        `"${name.replaceAll('"', '""')}"`,
        `"${(st?.className || "").replaceAll('"', '""')}"`,
        `"${pTitle.replaceAll('"', '""')}"`,
        s.language,
        s.earnedPoints ?? s.score ?? 0,
        `"${s.passed !== undefined ? `${s.passed}/${s.total}` : "—"}"`,
        `"${s.status}"`,
      ];
    });

    const csvContent =
      "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Lich_su_bai_nop_contest_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất nhật ký bài nộp contest ra file CSV thành công!");
  }

  // Handle Copy Source Code
  function handleCopyCode() {
    if (!viewingSubmission?.source) return;
    navigator.clipboard.writeText(viewingSubmission.source);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Calculate max score of contest
  const activeContestMaxScore = useMemo(() => {
    if (!activeContest?.problems) return 0;
    return activeContest.problems.reduce((sum, p) => sum + (p.points || 0), 0);
  }, [activeContest]);

  if (loading) {
    return (
      <div className="content ps-page">
        <TeacherAuthoringNav />
        <div className="ps-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#64748b", fontSize: 16 }}>Đang tải dữ liệu tracking Contest HSG...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content ps-page">
        <div className="ps-card">
          <p className="err">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content ps-page">
      {/* ── Page Header ── */}
      <div className="ps-page-header">
        <h1>Tracking Lịch sử Contest HSG</h1>
        <p>
          Theo dõi toàn diện kết quả, bảng điểm chi tiết và bài nộp mã nguồn của tất cả học sinh trong các kỳ thi Contest
        </p>
      </div>

      {/* ── Overview Statistics Cards ── */}
      <div className="tch-stats-grid">
        <div className="tch-stat-card">
          <div className="tch-stat-icon blue">
            <Icon name="trophy" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Tổng số kỳ thi</span>
            <span className="tch-stat-value">{globalStats.totalContests}</span>
          </div>
        </div>

        <div className="tch-stat-card">
          <div className="tch-stat-icon purple">
            <Icon name="user" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Thí sinh tham gia</span>
            <span className="tch-stat-value">{globalStats.totalParticipants}</span>
          </div>
        </div>

        <div className="tch-stat-card">
          <div className="tch-stat-icon orange">
            <Icon name="code" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Tổng số bài nộp</span>
            <span className="tch-stat-value">{globalStats.totalSubmissions}</span>
          </div>
        </div>

        <div className="tch-stat-card">
          <div className="tch-stat-icon green">
            <Icon name="check" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Tỉ lệ Accepted (AC)</span>
            <span className="tch-stat-value">{globalStats.acRate}%</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <div className="ps-card">
        {/* Navigation Tabs */}
        <div className="ps-tabs" style={{ marginBottom: "20px" }}>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => setActiveTab("leaderboard")}
          >
            <Icon name="trophy" /> Bảng điểm theo Kỳ thi
          </button>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === "submissions" ? "active" : ""}`}
            onClick={() => setActiveTab("submissions")}
          >
            <Icon name="code" /> Nhật ký toàn bộ bài nộp ({filteredSubmissions.length})
          </button>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === "students" ? "active" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            <Icon name="user" /> Thống kê theo học sinh ({studentSummaries.length})
          </button>
        </div>

        {/* ── TAB 1: LEADERBOARD THEO KỲ THI ── */}
        {activeTab === "leaderboard" && (
          <div>
            {/* Contest Selection & Toolbar */}
            <div className="ps-toolbar">
              <div className="ps-toolbar-left">
                <h2>Chọn kỳ thi Contest</h2>
                <p>Xem bảng xếp hạng trực tiếp và chi tiết điểm từng câu của thí sinh</p>
              </div>

              <select
                className="ps-select"
                style={{ minWidth: 260, fontWeight: 700 }}
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
              >
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status === "published" ? "Published" : "Draft"})
                  </option>
                ))}
              </select>

              <div className="ps-search" style={{ maxWidth: 240 }}>
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Tìm thí sinh trong bảng..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="ps-export-btn"
                onClick={handleExportLeaderboardCSV}
              >
                <Icon name="book" /> Xuất bảng điểm CSV
              </button>
            </div>

            {/* Active Contest Meta Banner */}
            {activeContest && (
              <div className="tch-contest-meta">
                <div>
                  <h3 className="tch-contest-title">
                    {activeContest.title}
                    <span
                      className={`contest-badge ${
                        contestPhase(activeContest) === "running"
                          ? "running"
                          : contestPhase(activeContest) === "ended"
                          ? "ended"
                          : ""
                      }`}
                    >
                      {contestPhase(activeContest) === "running"
                        ? "Đang diễn ra"
                        : contestPhase(activeContest) === "ended"
                        ? "Đã kết thúc"
                        : "Sắp diễn ra"}
                    </span>
                  </h3>
                  <div className="tch-contest-badges">
                    <span className="tch-meta-pill">
                      <Icon name="clock" /> Bắt đầu: {formatDateTime(activeContest.startAt)}
                    </span>
                    <span className="tch-meta-pill">
                      <Icon name="calendar" /> Thời lượng: {activeContest.durationMinutes} phút
                    </span>
                    <span className="tch-meta-pill">
                      <Icon name="code" /> {activeContest.problems?.length || 0} bài thi
                    </span>
                    <span className="tch-meta-pill">
                      <Icon name="trophy" /> Điểm tối đa: {activeContestMaxScore}đ
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Thí sinh nộp bài</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
                    {activeScoreboard.length} học sinh
                  </div>
                </div>
              </div>
            )}

            {/* Scoreboard Table */}
            {activeContest && (
              <div className="ps-table-wrap">
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Hạng</th>
                      <th>Thí sinh</th>
                      <th>Lớp / Trường</th>
                      <th>Tổng điểm</th>
                      {(activeContest.problems || []).map((p, idx) => {
                        const prob = problemsMap[p.problemId];
                        return (
                          <th key={p.problemId} style={{ textAlign: "center" }}>
                            Bài {String.fromCharCode(65 + idx)}
                            <small>{prob?.title || p.problemId}</small>
                            <small style={{ color: "#2563eb", fontWeight: 700 }}>{p.points}đ</small>
                          </th>
                        );
                      })}
                      <th>Lần nộp cuối</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScoreboard.map((row, idx) => {
                      const st = studentsMap[row.uid];
                      const name = st?.name || row.displayName || `Học sinh ${row.uid.slice(0, 6)}`;
                      const isTop1 = idx === 0;
                      const isTop2 = idx === 1;
                      const isTop3 = idx === 2;

                      return (
                        <tr key={row.uid}>
                          <td>
                            <div className="tch-rank-cell">
                              {isTop1 && <span className="tch-medal">🥇</span>}
                              {isTop2 && <span className="tch-medal">🥈</span>}
                              {isTop3 && <span className="tch-medal">🥉</span>}
                              <span className="tch-rank-num">#{idx + 1}</span>
                            </div>
                          </td>
                          <td style={{ minWidth: 180 }}>
                            <div className="ps-student-cell">
                              <div className="ps-avatar">{initials({ displayName: name })}</div>
                              <div>
                                <strong>{name}</strong>
                                <small>ID: {row.uid.slice(0, 8)}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ minWidth: 140 }}>
                            {st?.className ? (
                              <>
                                <strong>Lớp {st.className}</strong>
                                <small style={{ display: "block", color: "#64748b" }}>
                                  {st.school || "—"}
                                </small>
                              </>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <strong
                              style={{
                                color: row.totalScore > 0 ? "#16a34a" : "#64748b",
                                fontSize: 15,
                              }}
                            >
                              {row.totalScore}
                            </strong>
                            <span style={{ color: "#94a3b8", fontSize: 12 }}> / {activeContestMaxScore}đ</span>
                          </td>
                          {(activeContest.problems || []).map((p) => {
                            const pData = row.problems?.[p.problemId];
                            if (!pData) {
                              return (
                                <td key={p.problemId} style={{ textAlign: "center" }}>
                                  <span className="tch-score-none">—</span>
                                </td>
                              );
                            }

                            const isAc = pData.accepted;
                            const isPart = !isAc && (pData.earnedPoints || 0) > 0;
                            const cls = isAc
                              ? "tch-score-ac"
                              : isPart
                              ? "tch-score-partial"
                              : "tch-score-attempted";

                            return (
                              <td key={p.problemId} style={{ textAlign: "center" }}>
                                <div className={`tch-problem-score ${cls}`}>
                                  <span>{pData.earnedPoints || 0}đ</span>
                                  <small style={{ fontSize: 10, opacity: 0.85 }}>
                                    {pData.attempts || 1} lần
                                  </small>
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "#64748b" }}>
                            {formatDateTime(row.lastSubmissionAt)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ps-action-btn"
                              onClick={() => {
                                setSearchStudent(row.uid);
                                setSelectedContestId(activeContest.id);
                                setActiveTab("submissions");
                              }}
                            >
                              Xem bài nộp
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredScoreboard.length === 0 && (
                      <tr>
                        <td colSpan={6 + (activeContest.problems?.length || 0)}>
                          <div className="ps-empty">
                            <Icon name="trophy" />
                            <h3>Chưa có thí sinh tham gia kỳ thi này</h3>
                            <p>Khi học sinh nộp bài trong kỳ thi contest, bảng điểm sẽ tự động cập nhật tại đây.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: NHẬT KÝ BÀI NỘP TOÀN TRƯỜNG ── */}
        {activeTab === "submissions" && (
          <div>
            {/* Submissions Filters Toolbar */}
            <div className="ps-toolbar">
              <div className="ps-toolbar-left">
                <h2>Lịch sử nộp bài ({filteredSubmissions.length} bài)</h2>
                <p>Theo dõi từng lần submit mã nguồn, kiểm tra trạng thái và chấm chữa code của học sinh</p>
              </div>

              <div className="ps-search" style={{ maxWidth: 220 }}>
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Tìm học sinh, mã bài..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
              </div>

              <select
                className="ps-select"
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
              >
                <option value="all">Tất cả kỳ thi ({contests.length})</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <select
                className="ps-select"
                value={filterVerdict}
                onChange={(e) => setFilterVerdict(e.target.value)}
              >
                <option value="all">Tất cả kết quả</option>
                <option value="ac">Accepted (AC)</option>
                <option value="wa">Wrong Answer (WA)</option>
                <option value="tle">Time Limit (TLE)</option>
                <option value="rte">Runtime Error (RTE)</option>
                <option value="ce">Compile Error (CE)</option>
              </select>

              <select
                className="ps-select"
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
              >
                <option value="all">Tất cả ngôn ngữ</option>
                <option value="cpp">C++</option>
                <option value="python">Python</option>
              </select>

              <button
                type="button"
                className="ps-export-btn"
                onClick={handleExportSubmissionsCSV}
              >
                <Icon name="book" /> Xuất CSV
              </button>
            </div>

            {/* Submissions Table */}
            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>Thời gian nộp</th>
                    <th>Kỳ thi</th>
                    <th>Học sinh</th>
                    <th>Bài thi</th>
                    <th>Ngôn ngữ</th>
                    <th>Điểm</th>
                    <th>Test cases</th>
                    <th>Kết quả</th>
                    <th>Mã nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((s) => {
                    const st = studentsMap[s.uid];
                    const studentName = st?.name || s.displayName || `Học sinh ${s.uid?.slice(0, 6)}`;
                    const prob = problemsMap[s.problemId];
                    const probTitle = prob?.title || s.problemId;
                    const verdict = getVerdictInfo(s.status, s.passed, s.total);

                    return (
                      <tr key={s.id || s.submittedAt + s.uid}>
                        <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "#64748b" }}>
                          {formatDateTime(s.submittedAt)}
                        </td>
                        <td style={{ maxWidth: 160 }}>
                          <strong style={{ fontSize: 13, color: "#1e293b", display: "block" }}>
                            {s.contestTitle}
                          </strong>
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <div className="ps-student-cell">
                            <div className="ps-avatar">{initials({ displayName: studentName })}</div>
                            <div>
                              <strong>{studentName}</strong>
                              <small>
                                {st?.className ? `Lớp ${st.className}` : `ID: ${s.uid.slice(0, 6)}`}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td style={{ minWidth: 150 }}>
                          <strong>{probTitle}</strong>
                          <small style={{ display: "block", color: "#94a3b8" }}>{s.problemId}</small>
                        </td>
                        <td>
                          <span className={`ps-badge ${s.language}`}>
                            {LANG_LABEL[s.language] || s.language}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <strong
                            style={{
                              fontSize: 14,
                              color: (s.earnedPoints ?? s.score) > 0 ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {s.earnedPoints ?? s.score ?? 0}đ
                          </strong>
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "#475569" }}>
                          {s.passed !== undefined && s.total !== undefined ? (
                            <span>
                              <strong>{s.passed}</strong> / {s.total}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className={`tch-verdict-badge ${verdict.className}`}>
                            {verdict.label}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ps-action-btn"
                            onClick={() => setViewingSubmission(s)}
                          >
                            Xem Code
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <div className="ps-empty">
                          <Icon name="code" />
                          <h3>Không tìm thấy bài nộp nào</h3>
                          <p>Thử điều chỉnh lại bộ lọc kỳ thi, kết quả hoặc từ khóa tìm kiếm.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: THỐNG KÊ THEO HỌC SINH ── */}
        {activeTab === "students" && (
          <div>
            <div className="ps-toolbar">
              <div className="ps-toolbar-left">
                <h2>Hồ sơ thi đấu học sinh ({studentSummaries.length})</h2>
                <p>Tổng hợp thành tích tham dự các kỳ thi Contest của từng học sinh trong đội tuyển</p>
              </div>

              <div className="ps-search" style={{ maxWidth: 260 }}>
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Tìm tên học sinh, lớp..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
              </div>
            </div>

            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Lớp / Trường</th>
                    <th>Contest tham gia</th>
                    <th>Tổng bài nộp</th>
                    <th>Bài giải hoàn hảo (AC)</th>
                    <th>Điểm thi cao nhất</th>
                    <th>Lần thi gần nhất</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSummaries
                    .filter((sum) => {
                      if (!searchStudent) return true;
                      const q = searchStudent.toLowerCase();
                      const name = (sum.student.name || "").toLowerCase();
                      const cls = (sum.student.className || "").toLowerCase();
                      return name.includes(q) || cls.includes(q);
                    })
                    .map((sum) => {
                      const st = sum.student;
                      const name = st.name || `Học sinh ${st.uid.slice(0, 6)}`;
                      const acPercent =
                        sum.submissionsCount > 0
                          ? Math.round((sum.acCount / sum.submissionsCount) * 100)
                          : 0;

                      return (
                        <tr key={st.uid}>
                          <td style={{ minWidth: 180 }}>
                            <div className="ps-student-cell">
                              <div className="ps-avatar">{initials({ displayName: name })}</div>
                              <div>
                                <strong>{name}</strong>
                                <small>ID: {st.uid.slice(0, 8)}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ minWidth: 140 }}>
                            {st.className ? (
                              <>
                                <strong>Lớp {st.className}</strong>
                                <small style={{ display: "block", color: "#64748b" }}>
                                  {st.school || "—"}
                                </small>
                              </>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                          <td>
                            <strong>{sum.contestsJoined.size}</strong> kỳ thi
                          </td>
                          <td>
                            <strong>{sum.submissionsCount}</strong> bài
                          </td>
                          <td>
                            <strong style={{ color: "#16a34a" }}>{sum.acCount}</strong> bài
                            <small style={{ display: "block", color: "#64748b" }}>
                              {acPercent}% tỉ lệ AC
                            </small>
                          </td>
                          <td>
                            <strong style={{ color: "#2563eb", fontSize: 15 }}>
                              {sum.highestContestScore}đ
                            </strong>
                          </td>
                          <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "#64748b" }}>
                            {formatDateTime(sum.lastSubmittedAt)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ps-action-btn"
                              onClick={() => {
                                setSearchStudent(st.uid);
                                setSelectedContestId("all");
                                setActiveTab("submissions");
                              }}
                            >
                              Lịch sử bài nộp
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {studentSummaries.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="ps-empty">
                          <Icon name="user" />
                          <h3>Chưa có học sinh nào tham gia Contest</h3>
                          <p>Khi học sinh tham gia làm bài contest, thống kê thành tích sẽ xuất hiện tại đây.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Xem Mã Nguồn Bài Nộp (Code Viewer) ── */}
      {viewingSubmission && (
        <div
          className="tch-code-modal-backdrop"
          onClick={() => setViewingSubmission(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="tch-code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tch-code-modal-header">
              <div>
                <h3 className="tch-code-modal-title">
                  {problemsMap[viewingSubmission.problemId]?.title || viewingSubmission.problemId}
                </h3>
                <div className="tch-code-modal-meta">
                  <span>
                    <strong>Thí sinh:</strong>{" "}
                    {studentsMap[viewingSubmission.uid]?.name ||
                      viewingSubmission.displayName ||
                      viewingSubmission.uid}
                  </span>
                  <span>
                    <strong>Kỳ thi:</strong> {viewingSubmission.contestTitle}
                  </span>
                  <span>
                    <strong>Thời gian:</strong> {formatDateTime(viewingSubmission.submittedAt)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className={`tch-verdict-badge ${
                    getVerdictInfo(
                      viewingSubmission.status,
                      viewingSubmission.passed,
                      viewingSubmission.total
                    ).className
                  }`}
                  style={{ fontSize: 13, padding: "6px 14px" }}
                >
                  {viewingSubmission.status}
                </span>
                <button
                  type="button"
                  className="teacher-modal-close"
                  onClick={() => setViewingSubmission(null)}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="tch-code-modal-body">
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginBottom: 16,
                  background: "#f1f5f9",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <div>
                  <span style={{ color: "#64748b" }}>Điểm bài nộp: </span>
                  <strong style={{ color: "#16a34a", fontSize: 15 }}>
                    {viewingSubmission.earnedPoints ?? viewingSubmission.score ?? 0} điểm
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Test cases đúng: </span>
                  <strong>
                    {viewingSubmission.passed !== undefined
                      ? `${viewingSubmission.passed} / ${viewingSubmission.total}`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Ngôn ngữ: </span>
                  <strong>{LANG_LABEL[viewingSubmission.language] || viewingSubmission.language}</strong>
                </div>
              </div>

              <div className="tch-code-box">
                <div className="tch-code-box-header">
                  <span className="tch-code-lang">
                    {viewingSubmission.language === "python" ? "PYTHON 3" : "C++ 17"}
                  </span>
                  <button
                    type="button"
                    className="tch-copy-btn"
                    onClick={handleCopyCode}
                  >
                    <Icon name={copiedCode ? "check" : "code"} />
                    {copiedCode ? "Đã sao chép!" : "Sao chép code"}
                  </button>
                </div>
                <pre className="tch-code-content">
                  {viewingSubmission.source || "// Mã nguồn không khả dụng hoặc rỗng"}
                </pre>
              </div>
            </div>

            <div className="tch-code-modal-footer">
              <button
                type="button"
                className="teacher-btn-secondary"
                onClick={() => setViewingSubmission(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {notice && (
        <div
          className="toast"
          role="status"
          style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 200 }}
        >
          <span>
            <Icon name="check" />
          </span>
          {notice}
        </div>
      )}
    </div>
  );
}
