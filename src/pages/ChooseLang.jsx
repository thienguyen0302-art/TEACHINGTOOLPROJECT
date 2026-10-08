import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export default function ChooseLang({ uid, onPick }) {
  const [err, setErr] = useState("");
  const pick = async (language) => {
    setErr("");
    try {
      await auth.currentUser.getIdToken(true);
      await setDoc(doc(db, "users", uid), { language }, { merge: true });
      onPick(language);
    } catch (e) {
      setErr("Không lưu được: " + e.code);
    }
  };
  return (
    <div className="box">
      <h2>Bạn muốn ôn luyện bằng ngôn ngữ nào?</h2>
      {err && <p className="err">{err}</p>}
      <button onClick={() => pick("cpp")}>C++</button>
      <button onClick={() => pick("python")}>Python</button>
    </div>
  );
}