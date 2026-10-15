// Bảng xếp hạng theo điểm đề thi thật (hàm thuần, test bằng node --test).
export const DEFAULT_MAX_SCORE = 20; // mỗi đề thi thật chấm trên thang 20

const round2 = (n) => Math.round(n * 100) / 100;

// Điểm của 1 lượt thi = tỉ lệ làm đúng × điểm tối đa của đề.
export function calcPoints(correct, total, maxScore = DEFAULT_MAX_SCORE) {
  return round2((correct / total) * maxScore);
}

// Ảnh chụp thông tin hiển thị đặt vào bảng xếp hạng (công khai cho mọi người đã đăng nhập).
export function profileSnapshot(profile = {}) {
  return {
    displayName: profile.displayName || (profile.email || "").split("@")[0] || "Học viên",
    school: profile.school || "",
    className: profile.className || "",
    district: profile.district || "",
    province: profile.province || "",
  };
}

// Mỗi đề chỉ tính điểm CAO NHẤT, nên thi lại nhiều lần không làm tăng điểm ảo.
export function mergeLeaderboardEntry(prev, { uid, examId, points, profile }) {
  const scores = { ...(prev?.scores ?? {}) };
  scores[examId] = Math.max(scores[examId] ?? 0, points);
  const values = Object.values(scores);
  const total = round2(values.reduce((a, b) => a + b, 0));
  return {
    uid,
    ...profileSnapshot(profile),
    scores,
    total,
    examCount: values.length,
    average: round2(total / values.length),
  };
}

// Sắp xếp giảm dần theo tổng điểm; cùng điểm thì cùng hạng (1, 2, 2, 4).
export function rankEntries(entries) {
  const sorted = [...entries].sort(
    (a, b) => b.total - a.total || b.average - a.average || String(a.displayName).localeCompare(String(b.displayName), "vi"),
  );
  return sorted.map((entry) => ({ ...entry, rank: 1 + sorted.filter((e) => e.total > entry.total).length }));
}
