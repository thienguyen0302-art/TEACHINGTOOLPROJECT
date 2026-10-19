import { useState, useMemo } from "react";
import Icon from "./Icon";
import { ANNOUNCEMENT_TYPES, deleteAnnouncement, togglePinAnnouncement } from "../services/announcementService";
import CreateAnnouncementModal from "./CreateAnnouncementModal";
import "./AllAnnouncementsModal.css";

function formatFullTime(isoString) {
  if (!isoString) return "Vừa xong";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Vừa xong";

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  let relative = "Vừa xong";
  if (diffSec >= 60 && diffSec < 3600) relative = `${Math.floor(diffSec / 60)} phút trước`;
  else if (diffSec >= 3600 && diffSec < 86400) relative = `${Math.floor(diffSec / 3600)} giờ trước`;
  else if (diffSec >= 86400 && diffSec < 86400 * 7) relative = `${Math.floor(diffSec / 86400)} ngày trước`;

  const dateStr = date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${dateStr} (${relative})`;
}

export default function AllAnnouncementsModal({
  isOpen,
  onClose,
  announcements = [],
  readIds = [],
  onMarkRead,
  onMarkAllRead,
  isTeacher = false,
  onOpenCreateModal,
}) {
  const [filterType, setFilterType] = useState("all"); // "all" | "unread" | "pinned" | type
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [pinningId, setPinningId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Sắp xếp TẤT CẢ thông báo từ MỚI NHẤT ĐẾN CŨ NHẤT
  const sortedAll = useMemo(() => {
    return [...announcements].sort((a, b) => {
      // Ưu tiên ghim nếu ở tab "all"
      if (filterType === "all") {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
      }
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [announcements, filterType]);

  // Lọc theo tabs và tìm kiếm
  const filteredList = useMemo(() => {
    return sortedAll.filter((item) => {
      // Bộ lọc loại
      if (filterType === "unread" && readIds.includes(item.id)) return false;
      if (filterType === "pinned" && !item.pinned) return false;
      if (filterType !== "all" && filterType !== "unread" && filterType !== "pinned") {
        if (item.type !== filterType) return false;
      }

      // Bộ lọc từ khóa
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchContent = (item.content || "").toLowerCase().includes(q);
        const matchAuthor = (item.authorName || "").toLowerCase().includes(q);
        return matchTitle || matchContent || matchAuthor;
      }

      return true;
    });
  }, [sortedAll, filterType, searchQuery, readIds]);

  if (!isOpen) return null;

  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length;
  const pinnedCount = announcements.filter((a) => a.pinned).length;

  async function handleDelete(id, title) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thông báo: "${title}"?`)) return;
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTogglePin(id, currentPinned) {
    setPinningId(id);
    try {
      await togglePinAnnouncement(id, currentPinned);
    } finally {
      setPinningId(null);
    }
  }

  return (
    <div className="aam-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="aam-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ────────────────────────────────────────── */}
        <div className="aam-header">
          <div className="aam-header-left">
            <span className="aam-kicker">
              <Icon name="megaphone" /> BẢNG TIN LỚP HỌC
            </span>
            <h2 className="aam-title">
              Tất cả thông báo <span className="aam-count">({announcements.length})</span>
            </h2>
            <p className="aam-desc">
              Toàn bộ thông báo, lịch thi và lời dặn dò từ giáo viên được sắp xếp từ mới nhất đến cũ nhất.
            </p>
          </div>
          <button
            type="button"
            className="aam-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng cửa sổ"
          >
            <Icon name="x" />
          </button>
        </div>

        {/* ── Toolbar: Tìm kiếm & Hành động ─────────────────── */}
        <div className="aam-toolbar">
          <div className="aam-search-box">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc người gửi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm thông báo"
            />
            {searchQuery && (
              <button
                type="button"
                className="aam-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa từ khóa"
              >
                ✕
              </button>
            )}
          </div>

          <div className="aam-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="aam-btn-secondary"
                onClick={onMarkAllRead}
                title="Đánh dấu tất cả thông báo là đã đọc"
              >
                <Icon name="check" />
                <span>Đánh dấu đã đọc hết</span>
              </button>
            )}

            {isTeacher && (
              <button
                type="button"
                className="aam-btn-primary"
                onClick={() => {
                  onClose();
                  onOpenCreateModal?.();
                }}
              >
                <Icon name="megaphone" />
                <span>Đăng thông báo mới</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Tabs ───────────────────────────────────── */}
        <div className="aam-tabs" role="tablist">
          <button
            type="button"
            className={`aam-tab ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            Tất cả ({announcements.length})
          </button>

          <button
            type="button"
            className={`aam-tab ${filterType === "unread" ? "active" : ""}`}
            onClick={() => setFilterType("unread")}
          >
            Chưa đọc
            {unreadCount > 0 && <span className="aam-tab-badge">{unreadCount}</span>}
          </button>

          {pinnedCount > 0 && (
            <button
              type="button"
              className={`aam-tab ${filterType === "pinned" ? "active" : ""}`}
              onClick={() => setFilterType("pinned")}
            >
              📌 Đã ghim ({pinnedCount})
            </button>
          )}

          {Object.entries(ANNOUNCEMENT_TYPES).map(([key, meta]) => {
            const count = announcements.filter((a) => a.type === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                type="button"
                className={`aam-tab ${filterType === key ? "active" : ""}`}
                onClick={() => setFilterType(key)}
              >
                {meta.badge} ({count})
              </button>
            );
          })}
        </div>

        {/* ── Danh sách thông báo (MỚI ĐẾN CŨ) ──────────────── */}
        <div className="aam-list" role="feed">
          {filteredList.length === 0 ? (
            <div className="aam-empty">
              <div className="aam-empty-icon">
                <Icon name="bell" />
              </div>
              <h3>Không tìm thấy thông báo nào</h3>
              <p>
                {searchQuery
                  ? `Không có thông báo nào khớp với từ khóa "${searchQuery}". Hãy thử tìm với từ khác.`
                  : "Chưa có thông báo nào trong mục này."}
              </p>
            </div>
          ) : (
            filteredList.map((item, index) => {
              const isUnread = !readIds.includes(item.id);
              const meta = ANNOUNCEMENT_TYPES[item.type] || ANNOUNCEMENT_TYPES.general;

              return (
                <article
                  key={item.id}
                  className={`aam-card ${isUnread ? "is-unread" : ""} ${item.pinned ? "is-pinned" : ""}`}
                  onClick={() => isUnread && onMarkRead?.(item.id)}
                >
                  <div className="aam-card-header">
                    <div className="aam-card-badges">
                      <span className={`aam-type-badge aam-type--${meta.color}`}>
                        <Icon name={meta.icon} />
                        {meta.label}
                      </span>
                      {item.pinned && (
                        <span className="aam-pinned-badge">
                          📌 Đã ghim
                        </span>
                      )}
                      {isUnread && (
                        <span className="aam-unread-badge">
                          Mới
                        </span>
                      )}
                    </div>

                    <div className="aam-card-meta-right">
                      <span className="aam-order-num">#{index + 1}</span>
                      {isTeacher && (
                        <>
                          <button
                            type="button"
                            className={`aam-card-pin-btn ${item.pinned ? "is-pinned" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(item.id, item.pinned);
                            }}
                            disabled={pinningId === item.id}
                            title={item.pinned ? "Bỏ ghim thông báo" : "Ghim thông báo lên đầu"}
                            aria-label="Ghim thông báo"
                          >
                            <Icon name="pin" />
                          </button>
                          <button
                            type="button"
                            className="aam-card-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                            }}
                            title="Chỉnh sửa thông báo"
                            aria-label="Chỉnh sửa thông báo"
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="aam-card-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.title);
                            }}
                            disabled={deletingId === item.id}
                            title="Xóa thông báo này"
                            aria-label="Xóa thông báo"
                          >
                            <Icon name="trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="aam-card-title">{item.title}</h3>

                  <p className="aam-card-content">{item.content}</p>

                  <div className="aam-card-footer">
                    <div className="aam-card-author">
                      <span className="aam-author-avatar">
                        👤
                      </span>
                      <span>{item.authorName || "Giáo viên phụ trách"}</span>
                    </div>

                    <div className="aam-card-time">
                      <Icon name="clock" />
                      <time dateTime={item.createdAt}>
                        {formatFullTime(item.createdAt)}
                      </time>
                    </div>

                    {isUnread && (
                      <button
                        type="button"
                        className="aam-mark-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkRead?.(item.id);
                        }}
                      >
                        ✓ Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="aam-footer">
          <span>
            Hiển thị <strong>{filteredList.length}</strong> / {announcements.length} thông báo từ mới đến cũ
          </span>
          <button type="button" className="aam-btn-close-bottom" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>

      {editingItem && (
        <CreateAnnouncementModal
          isOpen={!!editingItem}
          editItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
