import { Link } from "react-router-dom";
import "../contest/Contest.css";
export default function AuthoringLayout({ title, children }) {
  return (
    <section className="content contest-ui">
      <nav className="contest-actions">
        <Link to="/teacher">Tổng quan giáo viên</Link>
        <Link to="/teacher/problems">Quản lý bài</Link>
        <Link to="/teacher/contests">Quản lý contest</Link>
      </nav>
      <h1>{title}</h1>
      {children}
    </section>
  );
}
