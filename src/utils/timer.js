import { useCallback, useEffect, useRef, useState } from "react";

// Định dạng giây thành "MM:SS" hoặc "H:MM:SS" nếu >= 1 giờ.
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Hook đếm ngược cho Exam Engine.
// - durationSec: tổng thời gian tính bằng giây.
// - onExpire: callback khi hết giờ (auto-submit).
// - active: false = dừng đồng hồ (ví dụ sau khi nộp bài).
export function useExamTimer({ durationSec, onExpire, active = true }) {
  const [remaining, setRemaining] = useState(durationSec);
  const expireRef = useRef(onExpire);

  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // Gọi expire trong microtask để tránh update state lồng nhau.
          setTimeout(() => expireRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, remaining]);

  const reset = useCallback(() => setRemaining(durationSec), [durationSec]);

  const isWarning = remaining <= 300 && remaining > 0; // dưới 5 phút
  const isDanger  = remaining <= 60  && remaining > 0; // dưới 1 phút

  return { remaining, formatted: formatTime(remaining), isWarning, isDanger, reset };
}
