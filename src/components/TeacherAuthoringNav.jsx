import { NavLink } from 'react-router-dom';
export default function TeacherAuthoringNav() {
  return <nav className="contest-links" aria-label="Quản lý giáo viên"><NavLink end to="/teacher">Tiến độ lớp</NavLink><NavLink to="/teacher/problems">Thư viện bài tập</NavLink><NavLink to="/teacher/contests">Quản lý contest</NavLink></nav>;
}
