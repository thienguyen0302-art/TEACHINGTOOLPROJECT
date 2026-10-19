import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { getCodeSubmissionHistory } from "../services/submissionPersistence";
import { listContests, loadContestSubmissions } from "../services/contestService";
import { auth } from "../services/firebase";
import { LANG_LABEL } from "../utils/format";
import "../styles/pages-shared.css";

// Student history for code submissions and programming contests.
export default function SubmissionHistory() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("code"); // 'code' | 'contest'
  const [loading, setLoading] = useState(true);

  // Data states
  const [codeHistory, setCodeHistory] = useState([]);
  const [contestHistory, setContestHistory] = useState([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [langFilter, setLangFilter] = useState("all");

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;

    async function loadAllHistory() {
      setLoading(true);
      try {
        const [codeSubs, contests] = await Promise.all([
          getCodeSubmissionHistory(uid).catch(() => []),
          listContests().catch(() => []),
        ]);

        if (cancelled) return;
        setCodeHistory(codeSubs || []);

        // Load contest submissions for the student across contests
        if (contests && contests.length > 0) {
          const studentContests = [];
          for (const c of contests) {
            try {
              const subs = await loadContestSubmissions(c.id).catch(() => []);
              if (subs && subs.length > 0) {
                // Find best submission per problem or student's activity
                const totalEarned = subs.reduce((maxSum, s) => maxSum + (s.earnedPoints || 0), 0);
                studentContests.push({
                  contest: c,
                  submissions: subs,
                  submissionCount: subs.length,
                  lastSubmittedAt: Math.max(...subs.map((s) => s.submittedAt || 0)),
                  totalEarned,
                });
              }
            } catch {
              // ignore single contest load error
            }
          }
          studentContests.sort((a, b) => (b.lastSubmittedAt || 0) - (a.lastSubmittedAt || 0));
          if (!cancelled) setContestHistory(studentContests);
        }
      } catch (err) {
        console.error("Lỗi khi tải lịch sử:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAllHistory();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Code Filtered Data
  const filteredCodeHistory = useMemo(() => {
    return codeHistory.filter((item) => {
      const matchSearch =
        !searchQuery ||
        (item.slug && item.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.problemId && item.problemId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "solved" && item.solved) ||
        (statusFilter === "attempted" && !item.solved);

      const matchLang = langFilter === "all" || item.language === langFilter;

      return matchSearch && matchStatus && matchLang;
    });
  }, [codeHistory, searchQuery, statusFilter, langFilter]);

  // Stats calculation
  const codeStats = useMemo(() => {
    const total = codeHistory.length;
    const solved = codeHistory.filter((c) => c.solved).length;
    const totalAttempts = codeHistory.reduce((sum, c) => sum + (c.attempts || 1), 0);
    return { total, solved, totalAttempts };
  }, [codeHistory]);

  const formatSlugName = (slug, problemId) => {
    if (problemId) return problemId;
    if (!slug) return "Bài tập";
    const parts = slug.split("/");
    return parts[parts.length - 1] || slug;
  };

  return (
    <div className="content ps-page">
      {/* Header */}
      <div className="ps-page-header">
        <h1>Lịch sử nộp bài & Kết quả học tập</h1>
        <p>Theo dõi tiến trình giải bài tập và tham gia các kỳ thi Contest HSG</p>
      </div>

      {/* Tabs */}
      <div className="ps-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`ps-tab-btn ${activeTab === "code" ? "active" : ""}`}
          onClick={() => setActiveTab("code")}
          style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700 }}
        >
          <Icon name="code" /> Bài nộp Code ({codeHistory.length})
        </button>
        <button
          type="button"
          className={`ps-tab-btn ${activeTab === "contest" ? "active" : ""}`}
          onClick={() => setActiveTab("contest")}
          style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700 }}
        >
          <Icon name="trophy" /> Kỳ thi Contest HSG ({contestHistory.length})
        </button>
      </div>

      {/* TAB 1: BÀI NỘP CODE */}
      {activeTab === "code" && (
        <div className="ps-card">
          {/* Quick Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 18px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Tổng bài đã thử</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>
                {codeStats.total} <small style={{ fontSize: 13, color: "#94a3b8" }}>bài</small>
              </div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "14px 18px", border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>Đã giải đúng (AC)</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
                {codeStats.solved}{" "}
                <small style={{ fontSize: 13, color: "#16a34a" }}>
                  ({codeStats.total ? Math.round((codeStats.solved / codeStats.total) * 100) : 0}%)
                </small>
              </div>
            </div>
            <div style={{ background: "#eff6ff", borderRadius: 14, padding: "14px 18px", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb" }}>Tổng số lượt nộp</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
                {codeStats.totalAttempts} <small style={{ fontSize: 13, color: "#60a5fa" }}>lần</small>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ps-toolbar" style={{ marginBottom: 16 }}>
            <div className="ps-search" style={{ maxWidth: 280 }}>
              <Icon name="search" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên bài..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="ps-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="solved">Đã hoàn thành (AC)</option>
              <option value="attempted">Chưa xong (Đang thử)</option>
            </select>

            <select
              className="ps-select"
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
            >
              <option value="all">Tất cả ngôn ngữ</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="ps-empty"><p>Đang tải lịch sử bài nộp code...</p></div>
          ) : filteredCodeHistory.length === 0 ? (
            <div className="ps-empty">
              <Icon name="code" />
              <h3>Chưa có bài nộp nào</h3>
              <p>Hãy vào kho bài tập hoặc bài học để bắt đầu viết mã và nộp bài nhé!</p>
              <button
                type="button"
                className="ps-action-btn"
                style={{ marginTop: 12, height: 36, padding: "0 16px", fontSize: 13 }}
                onClick={() => nav("/practice")}
              >
                Đến Kho bài tập
              </button>
            </div>
          ) : (
            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>Bài tập</th>
                    <th>Ngôn ngữ</th>
                    <th>Trạng thái</th>
                    <th>Test đúng</th>
                    <th>Điểm cao nhất</th>
                    <th>Số lần nộp</th>
                    <th>Thời gian nộp cuối</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodeHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ fontSize: 14, color: "#1e293b", display: "block" }}>
                          {formatSlugName(item.slug, item.problemId)}
                        </strong>
                        <small style={{ color: "#94a3b8", fontSize: 11 }}>
                          {item.slug || item.problemId}
                        </small>
                      </td>
                      <td>
                        <span className={`ps-badge ${item.language}`}>
                          {LANG_LABEL[item.language] || item.language}
                        </span>
                      </td>
                      <td>
                        {item.solved ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#dcfce7",
                              color: "#166534",
                              fontWeight: 700,
                              fontSize: 12,
                              padding: "3px 8px",
                              borderRadius: 6,
                            }}
                          >
                            <Icon name="check" /> Đã AC
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontWeight: 700,
                              fontSize: 12,
                              padding: "3px 8px",
                              borderRadius: 6,
                            }}
                          >
                            Chưa đạt ({item.lastStatus || "Attempted"})
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                        {item.passed != null && item.total != null ? (
                          <>
                            <b style={{ color: "#1e293b" }}>{item.passed}</b> / {item.total}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className="ps-score" style={{ fontWeight: 800 }}>
                          {item.bestScore ?? item.lastScore ?? 0} / 100
                        </span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>
                        {item.attempts || 1} lần
                      </td>
                      <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {item.lastSubmittedAt
                          ? new Date(item.lastSubmittedAt).toLocaleString("vi-VN")
                          : "Gần đây"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ps-tab-btn"
                          style={{
                            height: 28,
                            padding: "0 10px",
                            fontSize: 11,
                            borderColor: "#2563eb",
                            color: "#2563eb",
                          }}
                          onClick={() => {
                            if (item.slug && item.slug.startsWith("lesson/")) {
                              nav("/curriculum");
                            } else {
                              nav("/practice");
                            }
                          }}
                        >
                          Làm lại →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KỲ THI CONTEST HSG */}
      {activeTab === "contest" && (
        <div className="ps-card">
          <div className="ps-toolbar" style={{ marginBottom: 16 }}>
            <div className="ps-toolbar-left">
              <h2>Lịch sử Contest HSG</h2>
              <p>Các kỳ thi lập trình thi đấu bạn đã tham gia và nộp bài</p>
            </div>
            <button
              type="button"
              className="ps-tab-btn active"
              onClick={() => nav("/contests")}
              style={{ height: 34, padding: "0 14px", fontSize: 12 }}
            >
              Xem danh sách Contest
            </button>
          </div>

          {loading ? (
            <div className="ps-empty"><p>Đang tải lịch sử contest...</p></div>
          ) : contestHistory.length === 0 ? (
            <div className="ps-empty">
              <Icon name="trophy" />
              <h3>Chưa tham gia Contest nào</h3>
              <p>Bạn chưa nộp bài trong kỳ thi Contest HSG nào. Hãy tham gia contest tiếp theo nhé!</p>
              <button
                type="button"
                className="ps-action-btn"
                style={{ marginTop: 12, height: 36, padding: "0 16px", fontSize: 13 }}
                onClick={() => nav("/contests")}
              >
                Khám phá Contest
              </button>
            </div>
          ) : (
            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>Tên kỳ thi</th>
                    <th>Trạng thái kỳ thi</th>
                    <th>Số lượt nộp</th>
                    <th>Tổng điểm đạt được</th>
                    <th>Lần nộp cuối</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {contestHistory.map((item) => (
                    <tr key={item.contest.id}>
                      <td>
                        <strong style={{ fontSize: 14, color: "#1e293b", display: "block" }}>
                          {item.contest.title}
                        </strong>
                        <small style={{ color: "#64748b", fontSize: 12 }}>
                          {item.contest.problems?.length || 0} bài toán
                        </small>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              item.contest.status === "published" ? "#eff6ff" : "#f1f5f9",
                            color:
                              item.contest.status === "published" ? "#2563eb" : "#64748b",
                          }}
                        >
                          {item.contest.status === "published" ? "Chính thức" : "Bản nháp"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                        {item.submissionCount} bài nộp
                      </td>
                      <td>
                        <span className="ps-score" style={{ fontWeight: 800, color: "#2563eb" }}>
                          {item.totalEarned} điểm
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {item.lastSubmittedAt
                          ? new Date(item.lastSubmittedAt).toLocaleString("vi-VN")
                          : "N/A"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ps-tab-btn"
                          style={{
                            height: 28,
                            padding: "0 12px",
                            fontSize: 11,
                            borderColor: "#2563eb",
                            color: "#2563eb",
                          }}
                          onClick={() => nav(`/contest/${item.contest.id}/submissions`)}
                        >
                          Xem bài làm →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
