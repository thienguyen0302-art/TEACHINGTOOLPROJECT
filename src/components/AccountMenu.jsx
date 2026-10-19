import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { displayName, initials } from "../utils/format";
import "./AccountMenu.css";

/**
 * AccountMenu – Dropdown menu tài khoản neo dưới avatar.
 *
 * Props:
 *  user        – { displayName, email, uid }
 *  isTeacher   – boolean
 *  isAdmin     – boolean
 *  onLogout    – callback
 *  anchorRef   – ref của nút avatar để tránh đóng khi click vào nó
 *  isOpen      – boolean
 *  onClose     – callback
 */

function truncateEmail(email = "", maxLen = 30) {
  if (email.length <= maxLen) return email;
  const [local, domain] = email.split("@");
  const shortLocal = local.length > 12 ? local.slice(0, 10) + "…" : local;
  return `${shortLocal}@${domain}`;
}

function MenuItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      className={`am-item${danger ? " am-item--danger" : ""}`}
      onClick={onClick}
      role="menuitem"
    >
      <span className="am-item-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <span className="am-item-label">{label}</span>
    </button>
  );
}

function MenuSection({ children }) {
  return (
    <div className="am-section" role="group">
      {children}
    </div>
  );
}

export default function AccountMenu({
  user,
  isTeacher = false,
  isAdmin = false,
  onLogout,
  anchorRef,
  isOpen,
  onClose,
  onOpenHelp,
}) {
  const nav      = useNavigate();
  const location = useLocation();
  const menuRef  = useRef(null);
  const [noticeMsg, setNoticeMsg] = useState("");

  // Đóng khi bấm ngoài
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, onClose, anchorRef]);

  // Đóng khi nhấn Esc
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Đóng khi chuyển trang
  useEffect(() => { onClose?.(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  function go(path) {
    onClose();
    nav(path);
  }

  function soon(feature) {
    setNoticeMsg(`${feature} sẽ sớm có mặt`);
    setTimeout(() => setNoticeMsg(""), 2500);
  }

  function handleLogout() {
    // Không cần cảnh báo bài chưa lưu ở đây – có thể mở rộng sau
    onClose();
    onLogout?.();
  }

  const role     = isAdmin ? "Quản trị viên" : isTeacher ? "Giáo viên" : "Học sinh";
  const roleClass = isAdmin ? "admin" : isTeacher ? "teacher" : "student";

  return (
    <>
      <div
        ref={menuRef}
        className="am-popup"
        role="menu"
        aria-label="Menu tài khoản"
      >
        {/* ── Phần thông tin tài khoản ── */}
        <button
          type="button"
          className="am-identity"
          onClick={() => go("/profile")}
          role="menuitem"
          aria-label="Xem hồ sơ cá nhân"
        >
          <div className="am-avatar">{initials(user)}</div>
          <div className="am-identity-info">
            <strong className="am-name">{displayName(user)}</strong>
            <span className="am-email">{truncateEmail(user?.email)}</span>
            <span className={`am-role-badge am-role--${roleClass}`}>{role}</span>
          </div>
          <span className="am-identity-chevron" aria-hidden="true">
            <Icon name="chevron" />
          </span>
        </button>

        <div className="am-divider" role="separator" />

        {/* ── Nhóm 1: Cá nhân ── */}
        {isTeacher ? (
          // GIÁO VIÊN
          <MenuSection>
            <MenuItem icon="chart"    label="Quản trị lớp học"        onClick={() => go("/teacher")} />
            <MenuItem icon="user"     label="Quản lý học sinh"        onClick={() => go("/teacher/students")} />
            <MenuItem icon="trophy"   label="Tổng hợp Contest"        onClick={() => go("/teacher/contest-history")} />
            <MenuItem icon="trophy"   label="Tổ chức Contest"         onClick={() => go("/teacher/contests")} />
            <MenuItem icon="code"     label="Bài tập tự soạn"         onClick={() => go("/teacher/problems")} />
            <MenuItem icon="trophy"   label="Bảng xếp hạng Contest"   onClick={() => go("/ranking")} />
            <MenuItem icon="message"  label="Duyệt đánh giá & Báo lỗi" onClick={() => go("/teacher/reviews")} />
          </MenuSection>
        ) : (
          // HỌC SINH
          <MenuSection>
            <MenuItem icon="user"     label="Hồ sơ của tôi"     onClick={() => go("/profile")} />
            <MenuItem icon="chart"    label="Tiến độ học tập"   onClick={() => go("/progress")} />
            <MenuItem icon="calendar" label="Lịch học & mục tiêu" onClick={() => go("/calendar")} />
            <MenuItem icon="bookmark" label="Bài tập đã lưu"    onClick={() => soon("Bài tập đã lưu")} />
            <MenuItem icon="list"     label="Lịch sử bài nộp"   onClick={() => soon("Lịch sử bài nộp")} />
            <MenuItem icon="history"  label="Lịch sử nộp bài"       onClick={() => go("/submissions")} />
            <MenuItem icon="message"  label="Đánh giá & góp ý"  onClick={() => go("/feedback")} />
          </MenuSection>
        )}

        {/* Quản trị viên */}
        {isAdmin && (
          <>
            <div className="am-divider" role="separator" />
            <MenuSection>
              <MenuItem icon="admin" label="Quản trị hệ thống" onClick={() => soon("Trang quản trị")} />
            </MenuSection>
          </>
        )}

        <div className="am-divider" role="separator" />

        {/* ── Nhóm 2: Cài đặt ── */}
        <MenuSection>
          <MenuItem icon="shield"   label="Tài khoản & bảo mật"    onClick={() => go("/profile?tab=security")} />
          <MenuItem icon="bell"     label="Cài đặt thông báo"       onClick={() => go("/profile?tab=notifications")} />
          <MenuItem icon="globe"    label="Ngôn ngữ"                onClick={() => soon("Chọn ngôn ngữ")} />
        </MenuSection>

        <div className="am-divider" role="separator" />

        {/* ── Nhóm 3: Trợ giúp & đăng xuất ── */}
        <MenuSection>
          <MenuItem
            icon="help"
            label="Trung tâm trợ giúp"
            onClick={() => {
              onClose();
              if (onOpenHelp) onOpenHelp();
            }}
          />
          <MenuItem icon="message" label="Đánh giá & góp ý"      onClick={() => go("/feedback")} />
          <MenuItem icon="send"    label="Gửi góp ý / Báo lỗi"   onClick={() => go("/feedback")} />
        </MenuSection>

        <div className="am-divider" role="separator" />

        <MenuSection>
          <MenuItem icon="logout" label="Đăng xuất" onClick={handleLogout} danger />
        </MenuSection>

        {/* Notice toast nội bộ */}
        {noticeMsg && (
          <div className="am-notice" role="status" aria-live="polite">{noticeMsg}</div>
        )}
      </div>
    </>
  );
}
