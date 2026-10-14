// Hồ sơ học viên (hàm thuần để test bằng node --test).
export const PROFILE_FIELDS = [
  ["displayName", "họ và tên"],
  ["school", "tên trường"],
  ["className", "lớp"],
  ["province", "tỉnh / thành phố"],
  ["district", "quận / huyện"],
];

export function isProfileComplete(profile = {}) {
  return PROFILE_FIELDS.every(([key]) => typeof profile[key] === "string" && profile[key].trim() !== "");
}

// Chuẩn hoá và kiểm tra dữ liệu form; ném Error có thông báo tiếng Việt nếu sai.
export function normalizeProfile(input = {}) {
  const out = {};
  for (const [key, label] of PROFILE_FIELDS) {
    const value = String(input[key] ?? "").trim().replace(/\s+/g, " ");
    if (!value) throw new Error(`Hãy nhập ${label}.`);
    if (value.length > 80) throw new Error(`${label[0].toUpperCase()}${label.slice(1)} quá dài (tối đa 80 ký tự).`);
    out[key] = value;
  }
  return out;
}
