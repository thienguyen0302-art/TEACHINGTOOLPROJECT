import { NavLink } from "react-router-dom";

export default function TeacherAuthoringNav() {
  return (
    <nav className="contest-links teacher-nav-pills" aria-label="Quản lý giáo viên">
      <NavLink to="/teacher" end className={({ isActive }) => (isActive ? "active" : "")}>
        Tiến độ lớp
      </NavLink>
      <NavLink to="/teacher/students" className={({ isActive }) => (isActive ? "active" : "")}>
        Quản lý học sinh
      </NavLink>
      <NavLink
        to="/teacher/contest-history"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Tracking Contest HSG
      </NavLink>
      <NavLink to="/teacher/contests" className={({ isActive }) => (isActive ? "active" : "")}>
        Quản lý contest
      </NavLink>
      <NavLink to="/teacher/problems" className={({ isActive }) => (isActive ? "active" : "")}>
        Quản lý bài tập
      </NavLink>
      <NavLink to="/teacher/reviews" className={({ isActive }) => (isActive ? "active" : "")}>
        Duyệt đánh giá &amp; Báo lỗi
      </NavLink>
    </nav>
  );
}
