// Plugin Vite: bỏ lời giải mẫu khỏi nội dung JSON trước khi đóng gói gửi cho trình duyệt.
// Server (judge, AI tutor) vẫn đọc file gốc trong src/content bằng fs nên không bị ảnh hưởng.
//
//  - src/content/{cpp,python}/chXX.json: xoá mọi khoá "solutionCode" (practice, advanced, ...).
//  - src/content/problems/**/*.json: xoá "solution" và "aiContext" (client chỉ dùng publicFields).

const LESSON_RE = /\/src\/content\/(?:cpp|python)\/ch\d+\.json$/;
const PROBLEM_RE = /\/src\/content\/problems\/.+\.json$/;

function dropKeys(value, keys) {
  if (Array.isArray(value)) return value.map((item) => dropKeys(item, keys));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !keys.has(key))
      .map(([key, item]) => [key, dropKeys(item, keys)]),
  );
}

// Trả về JSON đã lọc, hoặc null nếu file không thuộc nội dung cần lọc.
export function stripPrivateContent(source, id) {
  const file = String(id).split("?")[0].replaceAll("\\", "/");
  let keys = null;
  if (LESSON_RE.test(file)) keys = new Set(["solutionCode"]);
  else if (PROBLEM_RE.test(file)) keys = new Set(["solution", "aiContext"]);
  if (!keys) return null;
  return JSON.stringify(dropKeys(JSON.parse(source), keys));
}

export default function stripSolutionsPlugin() {
  return {
    name: "strip-content-solutions",
    enforce: "pre", // chạy trước plugin JSON của Vite, khi code vẫn còn là JSON thô
    transform(code, id) {
      const stripped = stripPrivateContent(code, id);
      return stripped === null ? null : { code: stripped, map: null };
    },
  };
}
