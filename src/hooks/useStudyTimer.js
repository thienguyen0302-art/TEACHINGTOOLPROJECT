import { useEffect, useRef } from "react";
import { addStudySeconds } from "../services/progressService";

export default function useStudyTimer(uid) {
  const pending = useRef(0);

  useEffect(() => {
    if (!uid) return;

    const tick = setInterval(() => {
      if (document.visibilityState === "visible") pending.current += 1;
    }, 1000);

    const flush = () => {
      const s = pending.current;
      pending.current = 0;
      if (s > 0) addStudySeconds(uid, s).catch(() => { pending.current += s; });
    };

    const save = setInterval(flush, 30000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [uid]);
}