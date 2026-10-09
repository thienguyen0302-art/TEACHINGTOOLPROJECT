import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import Logo from "./Logo";
import { displayName, initials } from "../utils/format";

// Thông báo nhỏ ở góc dưới (toast) dùng chung cho mọi trang
const NoticeContext = createContext(() => {});
export const useNotice = () => useContext(NoticeContext);

const NAV = [
  { label: "Tổng quan", icon: "grid", path: "/" },
  { label: "Chương trình học", icon: "book", path: "/curriculum" },
  { label: "Kho bài tập", icon: "code", path: "/practice" },
  { label: "Tiến độ của tôi", icon: "chart", path: "/progress" },
  { label: "Bảng xếp hạng", icon: "trophy", path: null },
];

function isActive(item, pathname) {
  if (!item.path) return false;
  if (item.path === "/") return pathname === "/";
  if (item.path === "/curriculum") return pathname.startsWith("/curriculum") || pathname.startsWith("/lesson");
  return pathname.startsWith(item.path);
}

export default function AppShell({ user, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const timer = useRef(null);
  const { pathname } = useLocation();
  const nav = useNavigate();

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
            className={`profile-card ${pathname.startsWith("/progress") ? "active" : ""}`}
            onClick={() => { nav("/progress"); setMenuOpen(false); }}
          >
            <div className="profile-avatar">{initials(user)}</div>
            <div>
              <strong>{displayName(user)}</strong>
              <span>Học viên</span>
            </div>
            <span className="profile-chevron"><Icon name="chevron" /></span>
          </button>

          <nav className="side-nav" aria-label="Điều hướng học tập">
            <p>Không gian học tập</p>
            {NAV.map((item) => (
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

          <div className="weekly-goal">
            <div className="goal-heading">
              <span><Icon name="fire" /></span>
              <div><strong>Mục tiêu tuần</strong><small>5 / 7 ngày</small></div>
            </div>
            <div className="goal-bar"><span /></div>
            <p>Còn 2 ngày nữa, cố lên nhé!</p>
          </div>

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
              <button className="notification-button" onClick={() => showNotice("Bạn chưa có thông báo mới")} aria-label="Thông báo">
                <span />
              </button>
              <button className="avatar-button" onClick={() => nav("/progress")} aria-label="Tài khoản">
                {initials(user)}
              </button>
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
      </main>
    </NoticeContext.Provider>
  );
}
