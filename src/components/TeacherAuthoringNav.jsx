import { Link } from 'react-router-dom';
export default function TeacherAuthoringNav() {
  return <nav className="contest-links" aria-label="Quản lý giáo viên"><Link to="/teacher">Tiến độ lớp</Link><Link to="/teacher/problems">Quản lý bài tập</Link><Link to="/teacher/contests">Quản lý contest</Link></nav>;
}
