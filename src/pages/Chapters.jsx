import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listChapters } from "../services/contentService";

export default function Chapters({ lang }) {
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    let on = true;
    listChapters(lang).then((c) => on && setChapters(c));
    return () => { on = false; };
  }, [lang]);

  return (
    <div>
      <h2>Chương trình học {lang === "cpp" ? "C++" : "Python"}</h2>
      {chapters.map((c) => (
        <div className="card" key={c.id}>
          <h3>{c.order}. {c.title}</h3>
          <p>{c.description}</p>
          <Link to={`/lesson/${c.id}`}>Vào học</Link>
        </div>
      ))}
    </div>
  );
}