import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { ANNOUNCEMENT_TYPES } from "../services/announcementService";
import "./NotificationDrawer.css";

function formatRelativeTime(isoString) {
  if (!isoString) return "Vừa xong";
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date) / 1000);
  if (diffSec < 60)          return "Vừa xong";
  if (diffSec < 3600)        return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400)       return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 7)   return `${Math.floor(diffSec / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isNew(isoString) {
  if (!isoString) return false;
  return Date.now() - new Date(isoString) < 86400 * 1000; // trong 24h
}

// Icon tròn theo loại thông báo
function NotifIcon({ typeConfig }) {
  return (
    <div className={`nd-icon nd-icon--${typeConfig.color}`} aria-hidden="true">
      <Icon name={typeConfig.icon} />
    </div>
  );
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  anchorRef,
  announcements = [],
  readIds = [],
  onMarkRead,
  onMarkAllRead,
  isTeacher = false,
  onOpenCreateModal,
}) {
  const [filter, setFilter]         = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpen, setMenuOpen]     = useState(false);
  const popupRef  = useRef(null);
  const menuRef   = useRef(null);

  // Đóng khi bấm ngoài popup
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e) {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, onClose, anchorRef]);

  // Đóng khi nhấn Esc
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) { if (e.key === "Escape") { setMenuOpen(false); onClose(); } }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Đóng menu 3 chấm khi click ngoài
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  if (!isOpen) return null;

  const unreadCount   = announcements.filter((a) => !readIds.includes(a.id)).length;
  const displayedList = filter === "unread"
    ? announcements.filter((a) => !readIds.includes(a.id))
    : announcements;

  // Chia nhóm Mới (< 24h) / Trước đó
  const newItems  = displayedList.filter((a) => isNew(a.createdAt));
  const prevItems = displayedList.filter((a) => !isNew(a.createdAt));

  function handleItemClick(item) {
    if (!readIds.includes(item.id)) onMarkRead?.(item.id);
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  }

  function renderItem(item) {
    const isUnread     = !readIds.includes(item.id);
    const typeConfig   = ANNOUNCEMENT_TYPES[item.type] || ANNOUNCEMENT_TYPES.general;
    const isExpanded   = expandedId === item.id;

    return (
      <article
        key={item.id}
        className={`nd-item${isUnread ? " nd-item--unread" : ""}${isExpanded ? " nd-item--expanded" : ""}`}
        onClick={() => handleItemClick(item)}
        tabIndex={0}
        role="button"
        aria-pressed={isExpanded}
        onKeyDown={(e) => e.key === "Enter" && handleItemClick(item)}
      >
        {/* Icon tròn bên trái */}
        <NotifIcon typeConfig={typeConfig} />

        {/* Nội dung giữa */}
        <div className="nd-item-body">
          <div className="nd-item-top">
            <span className="nd-item-title">{item.title}</span>
            {item.pinned && <span className="nd-item-pin" title="Đã ghim">📌</span>}
          </div>
          <p className={`nd-item-text${isExpanded ? " nd-item-text--full" : ""}`}>
            {item.content}
          </p>
          {isExpanded && item.authorName && (
            <span className="nd-item-author">👤 {item.authorName}</span>
          )}
          <time className="nd-item-time">{formatRelativeTime(item.createdAt)}</time>
        </div>

        {/* Chấm xanh bên phải */}
        {isUnread && <span className="nd-unread-dot" aria-label="Chưa đọc" />}
      </article>
    );
  }

  return (
    <div
      ref={popupRef}
      className="nd-popup"
      role="dialog"
      aria-modal="false"
      aria-label="Thông báo"
    >
      {/* Mũi tên nhỏ */}
      <div className="nd-arrow" aria-hidden="true" />

      {/* ── Header ─────────────────────────────────── */}
      <div className="nd-header">
        <h2 className="nd-title">Thông báo</h2>

        <div className="nd-header-right">
          {/* Menu 3 chấm */}
          <div className="nd-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="nd-icon-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Tuỳ chọn"
              title="Tuỳ chọn"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <circle cx="10" cy="4"  r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="nd-dropdown-menu" role="menu">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    role="menuitem"
                    className="nd-menu-item"
                    onClick={() => { onMarkAllRead?.(); setMenuOpen(false); }}
                  >
                    <Icon name="check" /> Đánh dấu tất cả đã đọc
                  </button>
                )}
                {isTeacher && (
                  <button
                    type="button"
                    role="menuitem"
                    className="nd-menu-item"
                    onClick={() => { setMenuOpen(false); onClose(); onOpenCreateModal?.(); }}
                  >
                    <Icon name="megaphone" /> Đăng thông báo mới
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Nút đóng */}
          <button
            type="button"
            className="nd-icon-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <Icon name="x" />
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="nd-tabs">
        <button
          type="button"
          className={`nd-tab${filter === "all" ? " nd-tab--active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`nd-tab${filter === "unread" ? " nd-tab--active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          Chưa đọc
          {unreadCount > 0 && (
            <span className="nd-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </button>
      </div>

      {/* ── Danh sách ─────────────────────────────────── */}
      <div className="nd-list" role="list">
        {displayedList.length === 0 ? (
          <div className="nd-empty">
            <div className="nd-empty-icon"><Icon name="bell" /></div>
            <p>{filter === "unread" ? "Bạn đã đọc hết thông báo 🎉" : "Chưa có thông báo nào."}</p>
          </div>
        ) : (
          <>
            {newItems.length > 0 && (
              <>
                <div className="nd-group-label">Mới</div>
                {newItems.map(renderItem)}
              </>
            )}
            {prevItems.length > 0 && (
              <>
                {newItems.length > 0 && <div className="nd-group-label">Trước đó</div>}
                {prevItems.map(renderItem)}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────── */}
      <div className="nd-footer">
        <button
          type="button"
          className="nd-footer-link"
          onClick={onClose}
        >
          Xem tất cả thông báo
        </button>
      </div>
    </div>
  );
}
