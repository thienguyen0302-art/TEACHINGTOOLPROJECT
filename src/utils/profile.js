// Danh sách 63 tỉnh / thành phố tại Việt Nam
export const VIETNAM_PROVINCES = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cần Thơ",
  "Cao Bằng",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "TP. Hồ Chí Minh",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

// Hồ sơ học viên (hàm thuần để test bằng node --test).
export const PROFILE_FIELDS = [
  ["displayName", "họ và tên"],
  ["province", "tỉnh / thành phố"],
  ["school", "tên trường"],
  ["className", "lớp"],
];

export function isProfileComplete(profile = {}) {
  if (!profile) return false;
  return PROFILE_FIELDS.every(([key]) => typeof profile[key] === "string" && profile[key].trim() !== "");
}

// Kiểm tra từng trường và trả về object các lỗi tương ứng
export function validateProfileFields(input = {}) {
  const errors = {};
  for (const [key, label] of PROFILE_FIELDS) {
    const value = String(input[key] ?? "").trim();
    if (!value) {
      errors[key] = key === "province" ? "Vui lòng chọn tỉnh / thành phố." : `Vui lòng nhập ${label}.`;
    } else if (value.length > 80) {
      errors[key] = `${label[0].toUpperCase()}${label.slice(1)} quá dài (tối đa 80 ký tự).`;
    }
  }
  return errors;
}

// Chuẩn hoá và kiểm tra dữ liệu form; ném Error có thông báo tiếng Việt nếu sai.
export function normalizeProfile(input = {}) {
  const out = {};
  for (const [key, label] of PROFILE_FIELDS) {
    const value = String(input[key] ?? "").trim().replace(/\s+/g, " ");
    if (!value) throw new Error(key === "province" ? "Hãy chọn tỉnh / thành phố." : `Hãy nhập ${label}.`);
    if (value.length > 80) throw new Error(`${label[0].toUpperCase()}${label.slice(1)} quá dài (tối đa 80 ký tự).`);
    out[key] = value;
  }
  return out;
}
