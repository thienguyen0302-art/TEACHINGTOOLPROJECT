import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import Logo from "./Logo";
import { displayName, initials } from "../utils/format";
import NotificationDrawer from "./NotificationDrawer";
import CreateAnnouncementModal from "./CreateAnnouncementModal";
import AccountMenu from "./AccountMenu";
import {
  subscribeAnnouncements,
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/announcementService";

// Thông báo nhỏ ở góc dưới (toast) dùng chung cho mọi trang
import { NoticeContext } from "../hooks/useNotice";

const STUDENT_NAV = [
  { label: "Tổng quan", icon: "grid", path: "/" },
  { label: "Chương trình học", icon: "book", path: "/curriculum" },
  { label: "Kho bài tập", icon: "code", path: "/practice" },
  { label: "Luyện đề HSG", icon: "clock", path: "/exam" },
  { label: "Lịch học", icon: "calendar", path: "/calendar" },
  { label: "Tiến độ của tôi", icon: "chart", path: "/progress" },
  { label: "Bảng xếp hạng", icon: "trophy", path: "/ranking" },
];

const TEACHER_NAV = [
  { label: "Quản trị lớp học", icon: "chart",   path: "/teacher" },
  { label: "Quản lý học sinh", icon: "user",    path: "/teacher/students" },
  { label: "Kho bài tập",      icon: "code",    path: "/practice-bank" },
  { label: "Đề thi HSG",       icon: "clock",   path: "/exam" },
  { label: "Lịch sử thi",      icon: "trophy",  path: "/exam-history" },
  { label: "Bảng xếp hạng",    icon: "trophy",  path: "/ranking" },
];

function isActive(item, pathname) {
  if (!item.path) return false;
  if (item.path === "/") return pathname === "/";
  if (item.path === "/teacher") return pathname === "/teacher";
  if (item.path === "/teacher/students") return pathname === "/teacher/students";
  if (item.path === "/curriculum") return pathname.startsWith("/curriculum") || pathname.startsWith("/lesson");
  return pathname.startsWith(item.path);
}

export default function AppShell({ user, isTeacher = false, weekActive = 0, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const timer = useRef(null);
  const { pathname } = useLocation();
  const nav = useNavigate();

  // Trạng thái hệ thống thông báo
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createNotifOpen, setCreateNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(() => getReadNotificationIds(user?.uid));
  const bellRef = useRef(null); // ref cho nút chuông – dùng để neo popup
  const avatarRef = useRef(null); // ref cho nút avatar – dùng để neo popup tài khoản

  useEffect(() => {
    setReadIds(getReadNotificationIds(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    const unsub = subscribeAnnouncements((items) => {
      setAnnouncements(items);
    });
    return () => unsub?.();
  }, []);

  const handleMarkRead = (id) => {
    markNotificationAsRead(user?.uid, id);
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleMarkAllRead = () => {
    const allIds = announcements.map((a) => a.id);
    markAllNotificationsAsRead(user?.uid, allIds);
    setReadIds(allIds);
  };

  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length;

  const showNotice = useCallback((message) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 2600);
  }, []);

  const choose = (item) => {
    setMenuOpen(false);
    if (item.path) nav(item.path);
    else showNotice(`${item.label} đang được cập nhật`);
  };

  const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV;

  return (
    <NoticeContext.Provider value={showNotice}>
      <main className="dashboard-shell">
        <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
          <div className="brand-row">
            <span className="brand-logo"><Logo /></span>
            <span className="brand-text">Peanut<span>Code</span></span>
            <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Đóng menu">
              <Icon name="x" />
            </button>
          </div>

          <button
            className={`profile-card ${pathname.startsWith("/profile") ? "active" : ""}`}
            onClick={() => { nav("/profile"); setMenuOpen(false); }}
          >
            <div className="profile-avatar">{initials(user)}</div>
            <div>
              <strong>{displayName(user)}</strong>
              <span>{isTeacher ? "Giáo viên" : "Học viên"}</span>
            </div>
            <span className="profile-chevron"><Icon name="chevron" /></span>
          </button>

          <nav className="side-nav" aria-label="Điều hướng học tập">
            <p>{isTeacher ? "Không gian Quản lý" : "Không gian học tập"}</p>
            {navItems.map((item) => (
              <button
                key={item.label}
                className={isActive(item, pathname) ? "active" : ""}
                onClick={() => choose(item)}
              >
                <Icon name={item.icon} /><span>{item.label}</span>
                {item.label === "Kho bài tập" && <em>24</em>}
              </button>
            ))}
          </nav>

          {isTeacher ? (
            <div className="weekly-goal" style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.08))" }}>
              <div className="goal-heading">
                <span style={{ background: "#eff6ff", color: "#2563eb" }}><Icon name="chart" /></span>
                <div><strong>Quản lý lớp học</strong><small>Bồi dưỡng HSG</small></div>
              </div>
              <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                Theo dõi sát sao năng lực học sinh để kịp thời bồi dưỡng chuyên đề yếu.
              </p>
            </div>
          ) : (
            <div className="weekly-goal">
              <div className="goal-heading">
                <span><Icon name="fire" /></span>
                <div><strong>Mục tiêu tuần</strong><small>{weekActive} / 7 ngày</small></div>
              </div>
              <div className="goal-bar"><span style={{ width: `${Math.round((weekActive / 7) * 100)}%` }} /></div>
              <p>{weekActive >= 7 ? "Tuyệt vời, bạn đã học đủ cả tuần!" : `Còn ${7 - weekActive} ngày nữa, cố lên nhé!`}</p>
            </div>
          )}

          <div className="sidebar-bottom">
            <button onClick={() => showNotice("Trung tâm trợ giúp sẽ sớm có mặt")}>
              <Icon name="help" />Trợ giúp
            </button>
            <button onClick={onLogout}><Icon name="logout" />Đăng xuất</button>
          </div>
        </aside>

        <section className="dashboard-main">
          <header className="topbar">
            <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Mở menu">
              <Icon name="menu" />
            </button>
            <div className="search-box">
              <Icon name="search" />
              <input
                aria-label="Tìm kiếm bài học"
                placeholder="Tìm bài học, bài tập..."
                onKeyDown={(e) => e.key === "Enter" && showNotice("Tính năng tìm kiếm sẽ sớm có mặt")}
              />
            </div>
            <div className="top-actions">
              <button className="language-button" onClick={() => showNotice("Phiên bản tiếng Anh sẽ sớm có mặt")}>
                <Icon name="globe" /><span>VI</span>
              </button>
              {/* Nút chuông + popup neo bên dưới */}
              <div style={{ position: "relative" }}>
                <button
                  ref={bellRef}
                  className="notification-button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  aria-label="Thông báo"
                  aria-expanded={notifOpen}
                  title="Thông báo"
                >
                  <Icon name="bell" />
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>

                <NotificationDrawer
                  isOpen={notifOpen}
                  onClose={() => setNotifOpen(false)}
                  anchorRef={bellRef}
                  announcements={announcements}
                  readIds={readIds}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                  isTeacher={isTeacher}
                  onOpenCreateModal={() => setCreateNotifOpen(true)}
                />
              </div>
              {/* Nút avatar + popup menu tài khoản neo bên dưới */}
              <div style={{ position: "relative" }}>
                <button
                  ref={avatarRef}
                  className="avatar-button"
                  onClick={() => setAccountOpen((prev) => !prev)}
                  aria-label="Menu tài khoản"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  {initials(user)}
                </button>

                <AccountMenu
                  user={user}
                  isTeacher={isTeacher}
                  onLogout={onLogout}
                  anchorRef={avatarRef}
                  isOpen={accountOpen}
                  onClose={() => setAccountOpen(false)}
                />
              </div>
            </div>
          </header>
          {children}
        </section>

        {menuOpen && <button className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Đóng menu" />}
        {notice && (
          <div className="toast" role="status">
            <span><Icon name="check" /></span>{notice}
          </div>
        )}

        {isTeacher && (
          <CreateAnnouncementModal
            isOpen={createNotifOpen}
            onClose={() => setCreateNotifOpen(false)}
            currentUser={user}
            onCreated={() => showNotice("Đã đăng thông báo thành công!")}
          />
        )}
      </main>
    </NoticeContext.Provider>
  );
}
