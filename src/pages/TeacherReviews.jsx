import { useState, useEffect, useMemo } from "react";
import Icon from "../components/Icon";
import TeacherAuthoringNav from "../components/TeacherAuthoringNav";
import {
  subscribeAllReviews,
  moderateReview,
} from "../services/reviewService";
import {
  subscribeAllBugReports,
  updateBugReportStatus,
} from "../services/bugReportService";
import { initials } from "../utils/format";
import "../styles/pages-shared.css";
import "./Teacher.css";

const STATUS_LABELS = {
  pending:  { label: "Chờ duyệt", cls: "warning", color: "#ea580c" },
  approved: { label: "Đã duyệt (Hiện trang đăng nhập)", cls: "good", color: "#16a34a" },
  rejected: { label: "Bị từ chối", cls: "inactive", color: "#dc2626" },
  hidden:   { label: "Bị ẩn", cls: "inactive", color: "#64748b" },
};

const BUG_CATEGORIES = {
  judge: "Hệ thống chấm (Judge)",
  ui: "Giao diện (UI/UX)",
  content: "Nội dung / Typo",
  account: "Tài khoản / Đăng nhập",
  feature: "Đề xuất tính năng",
  other: "Khác",
};

export default function TeacherReviews() {
  const [activeTab, setActiveTab] = useState("reviews"); // 'reviews' | 'bugs'

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewFilter, setReviewFilter] = useState("pending"); // 'all' | 'pending' | 'approved' | 'rejected'
  const [reviewSearch, setReviewSearch] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  // Bugs state
  const [bugs, setBugs] = useState([]);
  const [bugFilter, setBugFilter] = useState("all"); // 'all' | 'new' | 'investigating' | 'resolved'
  const [editingDevNoteId, setEditingDevNoteId] = useState(null);
  const [devNoteText, setDevNoteText] = useState("");

  // Subscribe to all reviews
  useEffect(() => {
    const unsub = subscribeAllReviews((items) => {
      setReviews(items || []);
    });
    return () => unsub?.();
  }, []);

  // Subscribe to all bug reports
  useEffect(() => {
    const unsub = subscribeAllBugReports((items) => {
      setBugs(items || []);
    });
    return () => unsub?.();
  }, []);

  function showNotice(msg) {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(""), 3000);
  }

  // Handle Review Moderation
  async function handleModerate(uid, status, studentName) {
    try {
      await moderateReview(uid, status);
      const actionText =
        status === "approved"
          ? `Đã DUYỆT đánh giá của ${studentName}! Đánh giá hiện đã xuất hiện trên trang đăng nhập.`
          : status === "rejected"
          ? `Đã từ chối đánh giá của ${studentName}.`
          : `Đã ẩn đánh giá của ${studentName}.`;
      showNotice(actionText);
    } catch (err) {
      showNotice("Lỗi kiểm duyệt: " + err.message);
    }
  }

  // Handle Bug Status Update
  async function handleBugStatus(bugId, status, note = "") {
    try {
      await updateBugReportStatus(bugId, status, note);
      showNotice(
        status === "resolved"
          ? "Đã đánh dấu sự cố là ĐÃ KHẮC PHỤC thành công!"
          : "Đã cập nhật trạng thái sự cố."
      );
      setEditingDevNoteId(null);
      setDevNoteText("");
    } catch (err) {
      showNotice("Lỗi cập nhật: " + err.message);
    }
  }

  // Counts
  const pendingCount = reviews.filter((r) => r.status === "pending" || !r.status).length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const newBugsCount = bugs.filter((b) => b.status === "new").length;

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (reviewFilter === "pending" && r.status !== "pending" && r.status) return false;
      if (reviewFilter === "approved" && r.status !== "approved") return false;
      if (reviewFilter === "rejected" && r.status !== "rejected") return false;
      if (reviewFilter === "hidden" && r.status !== "hidden") return false;

      if (reviewSearch) {
        const q = reviewSearch.toLowerCase();
        const name = (r.displayName || "").toLowerCase();
        const content = (r.content || "").toLowerCase();
        if (!name.includes(q) && !content.includes(q)) return false;
      }
      return true;
    });
  }, [reviews, reviewFilter, reviewSearch]);

  // Filtered Bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter((b) => {
      if (bugFilter !== "all" && b.status !== bugFilter) return false;
      return true;
    });
  }, [bugs, bugFilter]);

  return (
    <div className="content ps-page">
      <TeacherAuthoringNav />

      {/* ── Page Header ── */}
      <div className="ps-page-header">
        <h1>Quản lý Đánh giá &amp; Báo lỗi Người dùng</h1>
        <p>
          Phê duyệt đánh giá của học sinh để hiển thị lên trang Đăng nhập và theo dõi báo lỗi kỹ thuật gửi về cho người xây dựng web
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="tch-stat-card">
          <div className="tch-stat-icon orange">
            <Icon name="clock" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Chờ duyệt trang chủ</span>
            <span className="tch-stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="tch-stat-card">
          <div className="tch-stat-icon green">
            <Icon name="check" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Đã duyệt (Hiện login)</span>
            <span className="tch-stat-value">{approvedCount}</span>
          </div>
        </div>

        <div className="tch-stat-card">
          <div className="tch-stat-icon blue">
            <Icon name="trophy" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Tổng số đánh giá</span>
            <span className="tch-stat-value">{reviews.length}</span>
          </div>
        </div>

        <div className="tch-stat-card">
          <div className="tch-stat-icon purple">
            <Icon name="code" />
          </div>
          <div className="tch-stat-info">
            <span className="tch-stat-label">Báo lỗi kỹ thuật mới</span>
            <span className="tch-stat-value">{newBugsCount}</span>
          </div>
        </div>
      </div>

      {/* ── Main Container Card ── */}
      <div className="ps-card">
        {/* Main Tab selector */}
        <div className="ps-tabs" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <Icon name="trophy" /> Kiểm duyệt Đánh giá học sinh ({reviews.length})
            {pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: "#ea580c", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>
                {pendingCount} chờ duyệt
              </span>
            )}
          </button>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === "bugs" ? "active" : ""}`}
            onClick={() => setActiveTab("bugs")}
          >
            <Icon name="code" /> Báo lỗi kỹ thuật cho Web ({bugs.length})
            {newBugsCount > 0 && (
              <span style={{ marginLeft: 6, background: "#dc2626", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>
                {newBugsCount} mới
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1: KIỂM DUYỆT ĐÁNH GIÁ ── */}
        {activeTab === "reviews" && (
          <div>
            <div className="ps-toolbar">
              <div className="ps-toolbar-left">
                <h2>Danh sách đánh giá ({filteredReviews.length})</h2>
                <p>Nhấp vào "Duyệt" để đưa đánh giá trực tiếp lên trang Đăng nhập cho người dùng mới nhìn thấy</p>
              </div>

              <div className="ps-search" style={{ maxWidth: 260 }}>
                <Icon name="search" />
                <input
                  type="search"
                  placeholder="Tìm theo tên, nội dung..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                />
              </div>

              <select
                className="ps-select"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái ({reviews.length})</option>
                <option value="pending">Chờ phê duyệt ({pendingCount})</option>
                <option value="approved">Đã duyệt công khai ({approvedCount})</option>
                <option value="rejected">Bị từ chối</option>
                <option value="hidden">Đã ẩn</option>
              </select>
            </div>

            {/* Reviews Cards List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredReviews.map((r) => {
                const stCfg = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                const isPending = !r.status || r.status === "pending";
                const isApproved = r.status === "approved";

                return (
                  <div
                    key={r.id || r.uid}
                    style={{
                      padding: "18px 22px",
                      borderRadius: 14,
                      background: "var(--ps-bg, #f8fafc)",
                      border: "1px solid var(--ps-border, #e2e8f0)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div className="ps-student-cell">
                        <div className="ps-avatar">{initials({ displayName: r.displayName })}</div>
                        <div>
                          <strong>{r.displayName || "Học viên PeanutCode"}</strong>
                          <small>UID: {r.uid?.slice(0, 8)}</small>
                        </div>
                        {r.isVerifiedLearner && (
                          <span style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                            ✓ Học viên đã học thật
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: isApproved ? "#dcfce7" : isPending ? "#ffedd5" : "#fee2e2",
                            color: stCfg.color,
                          }}
                        >
                          {stCfg.label}
                        </span>

                        <span style={{ fontSize: 12, color: "var(--ps-text-sub, #64748b)" }}>
                          {r.isPublicConsent ? "✓ Đồng ý hiện trang chủ" : "✕ Chỉ gửi riêng"}
                        </span>
                      </div>
                    </div>

                    {/* Stars and Content */}
                    <div>
                      <div style={{ color: "#f59e0b", fontSize: 18, marginBottom: 4 }}>
                        {"★".repeat(r.rating || 5)}
                        <span style={{ color: "#cbd5e1" }}>{"★".repeat(5 - (r.rating || 5))}</span>
                        <strong style={{ fontSize: 13, color: "var(--ps-text-main, #334155)", marginLeft: 8 }}>
                          {r.rating}/5 sao
                        </strong>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ps-text-main, #1e293b)", fontStyle: "italic" }}>
                        “{r.content}”
                      </p>
                    </div>

                    {/* Actions and Footer */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--ps-border, #e2e8f0)", paddingTop: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        Thời gian: {new Date(r.createdAt || r.updatedAt || Date.now()).toLocaleString("vi-VN")}
                      </span>

                      <div style={{ display: "flex", gap: 8 }}>
                        {!isApproved && (
                          <button
                            type="button"
                            className="btn-add-goal"
                            style={{ background: "#16a34a", padding: "6px 14px", fontSize: 12 }}
                            onClick={() => handleModerate(r.uid, "approved", r.displayName)}
                          >
                            ✓ Duyệt hiển thị trang đăng nhập
                          </button>
                        )}
                        {isApproved && (
                          <button
                            type="button"
                            className="ps-action-btn"
                            style={{ fontSize: 12 }}
                            onClick={() => handleModerate(r.uid, "hidden", r.displayName)}
                          >
                            Ẩn khỏi trang chủ
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            type="button"
                            className="ps-action-btn"
                            style={{ color: "#dc2626", borderColor: "#fca5a5", fontSize: 12 }}
                            onClick={() => handleModerate(r.uid, "rejected", r.displayName)}
                          >
                            ✕ Từ chối
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredReviews.length === 0 && (
                <div className="ps-empty">
                  <Icon name="trophy" />
                  <h3>Không có đánh giá nào trong mục này</h3>
                  <p>Khi học sinh gửi đánh giá từ trang Đánh giá &amp; Góp ý, bạn có thể kiểm duyệt tại đây.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: BÁO LỖI KỸ THUẬT GỬI VỀ CHO NGƯỜI XÂY DỰNG WEB ── */}
        {activeTab === "bugs" && (
          <div>
            <div className="ps-toolbar">
              <div className="ps-toolbar-left">
                <h2>Báo lỗi kỹ thuật từ Học sinh ({filteredBugs.length})</h2>
                <p>Thu thập tự động chi tiết lỗi, môi trường thiết bị và thông tin gửi về từ học sinh</p>
              </div>

              <select
                className="ps-select"
                value={bugFilter}
                onChange={(e) => setBugFilter(e.target.value)}
              >
                <option value="all">Tất cả sự cố ({bugs.length})</option>
                <option value="new">Mới nhận ({newBugsCount})</option>
                <option value="investigating">Đang xử lý</option>
                <option value="resolved">Đã khắc phục</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredBugs.map((b) => {
                const isNew = b.status === "new";
                const isInvestigating = b.status === "investigating";
                const isResolved = b.status === "resolved";

                return (
                  <div
                    key={b.id}
                    style={{
                      padding: "18px 22px",
                      borderRadius: 14,
                      background: "var(--ps-bg, #f8fafc)",
                      border: "1px solid var(--ps-border, #e2e8f0)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: 16, color: "var(--ps-text-main, #1e293b)" }}>
                          {b.title}
                        </strong>
                        <div style={{ fontSize: 12, color: "var(--ps-text-sub, #64748b)", marginTop: 2 }}>
                          Người gửi: <b>{b.displayName}</b> ({b.email || b.uid}) · {new Date(b.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, background: "#f1f5f9", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                          {BUG_CATEGORIES[b.category] || b.category}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isResolved ? "#dcfce7" : isInvestigating ? "#ffedd5" : "#eff6ff",
                            color: isResolved ? "#16a34a" : isInvestigating ? "#ea580c" : "#2563eb",
                          }}
                        >
                          {isResolved ? "✓ Đã khắc phục" : isInvestigating ? "🔍 Đang xử lý" : "📬 Mới nhận"}
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--ps-text-main, #334155)" }}>
                      {b.description}
                    </p>

                    {b.stepsToReproduce && (
                      <div style={{ fontSize: 12, background: "rgba(0,0,0,0.03)", padding: "8px 12px", borderRadius: 8 }}>
                        <strong>Các bước tái hiện:</strong> {b.stepsToReproduce}
                      </div>
                    )}

                    {/* System info */}
                    {b.systemInfo && (
                      <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", flexWrap: "wrap", gap: 12 }}>
                        <span>URL: {b.systemInfo.url}</span>
                        <span>Màn hình: {b.systemInfo.screenResolution}</span>
                        <span title={b.systemInfo.userAgent}>
                          Trình duyệt: {b.systemInfo.userAgent?.slice(0, 60)}...
                        </span>
                      </div>
                    )}

                    {/* Developer Note display */}
                    {b.devNotes && (
                      <div className="bug-dev-note">
                        <strong>Ghi chú của Developer:</strong> {b.devNotes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--ps-border, #e2e8f0)", paddingTop: 10 }}>
                      <div>
                        {editingDevNoteId === b.id ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              type="text"
                              placeholder="Nhập phản hồi gửi cho học sinh..."
                              value={devNoteText}
                              onChange={(e) => setDevNoteText(e.target.value)}
                              style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, minWidth: 260 }}
                            />
                            <button
                              type="button"
                              className="btn-add-goal"
                              style={{ padding: "6px 12px", fontSize: 12 }}
                              onClick={() => handleBugStatus(b.id, b.status, devNoteText)}
                            >
                              Lưu phản hồi
                            </button>
                            <button
                              type="button"
                              className="ps-action-btn"
                              style={{ fontSize: 12 }}
                              onClick={() => setEditingDevNoteId(null)}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="ps-action-btn"
                            style={{ fontSize: 12 }}
                            onClick={() => {
                              setEditingDevNoteId(b.id);
                              setDevNoteText(b.devNotes || "");
                            }}
                          >
                            + Viết phản hồi cho học sinh
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {!isInvestigating && !isResolved && (
                          <button
                            type="button"
                            className="ps-action-btn"
                            style={{ color: "#ea580c", fontSize: 12 }}
                            onClick={() => handleBugStatus(b.id, "investigating")}
                          >
                            Đang xử lý
                          </button>
                        )}
                        {!isResolved && (
                          <button
                            type="button"
                            className="btn-add-goal"
                            style={{ background: "#16a34a", padding: "6px 14px", fontSize: 12 }}
                            onClick={() => handleBugStatus(b.id, "resolved", "Đã kiểm tra và khắc phục lỗi.")}
                          >
                            ✓ Đã khắc phục xong
                          </button>
                        )}
                        {isResolved && (
                          <button
                            type="button"
                            className="ps-action-btn"
                            style={{ fontSize: 12 }}
                            onClick={() => handleBugStatus(b.id, "new")}
                          >
                            Mở lại sự cố
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredBugs.length === 0 && (
                <div className="ps-empty">
                  <Icon name="code" />
                  <h3>Không có báo lỗi nào</h3>
                  <p>Hệ thống hoạt động ổn định. Báo lỗi của học sinh sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Toast notification ── */}
      {actionNotice && (
        <div
          className="toast"
          role="status"
          style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 200 }}
        >
          <span>
            <Icon name="check" />
          </span>
          {actionNotice}
        </div>
      )}
    </div>
  );
}
