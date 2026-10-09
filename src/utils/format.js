export const LANG_LABEL = { cpp: "C++", python: "Python" };

export function fmtTime(sec = 0) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export function displayName(user) {
  if (user.displayName) return user.displayName;
  return (user.email || "Bạn").split("@")[0];
}

export function firstName(user) {
  const parts = displayName(user).trim().split(/\s+/);
  return parts[parts.length - 1];
}

export function initials(user) {
  const parts = displayName(user).trim().split(/\s+/);
  const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return s.toUpperCase();
}

export function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

export function todayText() {
  const t = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
