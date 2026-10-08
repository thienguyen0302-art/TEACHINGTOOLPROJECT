import { Link } from "react-router-dom";

export default function Navbar({ email, lang, onChangeLang, onLogout }) {
  return (
    <header className="nav">
      <Link to="/" className="brand">Luyện HSG Tin học</Link>
      <div className="nav-right">
        <span className="tag">{lang === "cpp" ? "C++" : "Python"}</span>
        <span className="nav-mail">{email}</span>
        <button onClick={onChangeLang}>Đổi ngôn ngữ</button>
        <button onClick={onLogout}>Đăng xuất</button>
      </div>
    </header>
  );
}