import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import Icon from "../components/Icon";
import Logo from "../components/Logo";

const OPTIONS = [
  { key: "cpp", name: "C++", mark: "C++", cls: "cpp", badge: "Đề xuất",
    desc: "Lựa chọn phổ biến nhất cho thi học sinh giỏi Tin học." },
  { key: "python", name: "Python", mark: "Py", cls: "python",
    desc: "Cú pháp sáng rõ, phù hợp để bắt đầu tư duy lập trình." },
];

// current: ngôn ngữ đang chọn (nếu có); onClose: chỉ truyền khi đổi ngôn ngữ (cho phép đóng)
export default function ChooseLang({ uid, current, onPick, onClose }) {
  const [err, setErr] = useState("");

  const pick = async (language) => {
    setErr("");
    try {
      await auth.currentUser.getIdToken(true);
      await setDoc(doc(db, "users", uid), { language }, { merge: true });
      onPick(language);
    } catch (e) {
      setErr("Không lưu được: " + (e.code || e.message));
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="language-overlay" role="dialog" aria-modal="true" aria-labelledby="language-title">
        <div className="language-modal">
          {onClose && (
            <button className="language-close" onClick={onClose} aria-label="Đóng">
              <Icon name="x" />
            </button>
          )}
          <div className="language-modal-brand">
            <span className="brand-logo"><Logo /></span>
            <span className="brand-text">Peanut<span>Code</span></span>
          </div>
          <span className="setup-label">Thiết lập lộ trình học</span>
          <h2 id="language-title">
            <span className="question-line">Bạn muốn bắt đầu với</span>
            <span className="language-line">ngôn ngữ nào?</span>
          </h2>
          <p>Chọn một ngôn ngữ để PeanutCode xây dựng chương trình học phù hợp nhất cho bạn.</p>
          {err && <p className="err">{err}</p>}
          <div className="language-options">
            {OPTIONS.map((o) => (
              <button key={o.key} className={`${o.cls} ${current === o.key ? "selected" : ""}`}
                onClick={() => pick(o.key)}>
                <span className="language-mark">{o.mark}</span>
                <span className="language-option-copy">
                  <strong>{o.name}</strong>
                  <small>{o.desc}</small>
                </span>
                {o.badge && <em>{o.badge}</em>}
                <span className="option-arrow"><Icon name="chevron" /></span>
              </button>
            ))}
          </div>
          <small className="language-footnote">
            Bạn có thể thay đổi lựa chọn này bất cứ lúc nào ở góc trên bên phải.
          </small>
        </div>
      </div>
    </main>
  );
}
