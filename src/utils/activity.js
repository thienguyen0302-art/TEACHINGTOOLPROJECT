// Tính chuỗi ngày học và thống kê tuần từ map { "YYYY-MM-DD": số giây }.
export const MIN_ACTIVE_SECONDS = 60; // học ít nhất 1 phút mới tính là "có học" trong ngày
const WEEK_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

// Chuỗi liên tiếp tính đến hôm nay; nếu hôm nay chưa học thì chưa bị đứt (tính từ hôm qua).
export function calcStreak(daily = {}, now = new Date()) {
  const active = (d) => (daily[dateKey(d)] ?? 0) >= MIN_ACTIVE_SECONDS;
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!active(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (active(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// 7 ngày của tuần hiện tại, bắt đầu từ thứ Hai.
export function weekSummary(daily = {}, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const todayKey = dateKey(today);
  const days = WEEK_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    const key = dateKey(date);
    const seconds = daily[key] ?? 0;
    return { key, label, seconds, active: seconds >= MIN_ACTIVE_SECONDS, isToday: key === todayKey, isFuture: key > todayKey };
  });
  return {
    days,
    activeCount: days.filter((d) => d.active).length,
    totalSeconds: days.reduce((sum, d) => sum + d.seconds, 0),
  };
}
