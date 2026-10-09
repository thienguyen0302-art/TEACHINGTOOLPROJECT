import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { listChapters } from "../services/contentService";

export default function Sidebar({ lang }) {
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    let on = true;
    listChapters(lang).then((c) => on && setChapters(c));
    return () => { on = false; };
  }, [lang]);

  return (
    <aside className="side">
      <NavLink to="/practice" className={({ isActive }) => isActive ? "side-link active" : "side-link"}>
        Problem Bank
      </NavLink>
      <h3>Các chương</h3>
      {chapters.map((c) => (
        <NavLink
          key={c.id}
          to={`/lesson/${c.id}`}
          className={({ isActive }) => (isActive ? "side-link active" : "side-link")}
        >
          {c.order}. {c.title}
        </NavLink>
      ))}
    </aside>
  );
}
