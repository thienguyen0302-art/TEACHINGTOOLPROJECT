// Shared pure validation. Public documents always use an explicit allowlist.
export class AuthoringError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new AuthoringError(message, status);
};
export const bytes = (text) => new TextEncoder().encode(text).length;
export const validId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
const text = (v, name, max = 65536) => requireValue(typeof v === 'string' && v.trim() && bytes(v) <= max, `${name} không được trống hoặc quá dài.`);
const strings = (v, name, max) => requireValue(Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && bytes(x) <= 2048), `${name} không hợp lệ.`);
export const problemTemplate = {
  title: '', slug: '', difficulty: 'basic', tags: [], statement: '', inputDescription: '', outputDescription: '', constraints: [],
  samples: [{ input: '', output: '', explanation: '' }], hiddenTests: [],
  allowedLanguages: ['cpp', 'python'], starterCode: { cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n', python: '' },
};
export function serializePublicProblem(value) {
  const fields = ['title', 'slug', 'difficulty', 'tags', 'statement', 'inputDescription', 'outputDescription', 'constraints', 'allowedLanguages', 'status', 'createdBy', 'createdAt', 'updatedAt'];
  return {
    ...Object.fromEntries(fields.filter((key) => value[key] !== undefined).map((key) => [key, value[key]])),
    samples: (value.samples ?? []).map(({ input, output, explanation = '' }) => ({ input, output, explanation })),
    starterCode: { cpp: value.starterCode?.cpp ?? '', python: value.starterCode?.python ?? '' },
  };
}
export function validateProblem(input, { status = 'draft', existingSlugs = [], currentId } = {}) {
  requireValue(object(input), 'Bài tập phải là object JSON.');
  text(input.title, 'Tên bài', 300);
  requireValue(typeof input.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) && input.slug.length <= 120, 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.');
  requireValue(!existingSlugs.some((entry) => typeof entry === 'string' ? entry === input.slug : entry.slug === input.slug && entry.id !== currentId), 'Slug đã được sử dụng.', 409);
  requireValue(['basic', 'intermediate', 'advanced'].includes(input.difficulty), 'Difficulty không hợp lệ.');
  requireValue(['draft', 'published'].includes(status), 'Trạng thái không hợp lệ.');
  text(input.statement, 'Đề bài');
  for (const field of ['inputDescription', 'outputDescription']) requireValue(typeof input[field] === 'string' && bytes(input[field]) <= 20000, `${field} phải là chuỗi, tối đa 20 KB.`);
  strings(input.tags, 'Tags', 30); strings(input.constraints, 'Constraints', 50);
  requireValue(Array.isArray(input.allowedLanguages) && input.allowedLanguages.length >= 1 && input.allowedLanguages.length <= 2 && new Set(input.allowedLanguages).size === input.allowedLanguages.length && input.allowedLanguages.every((v) => ['cpp', 'python'].includes(v)), 'Chọn ít nhất một ngôn ngữ C++/Python hợp lệ.');
  requireValue(object(input.starterCode), 'Starter code không hợp lệ.');
  for (const language of ['cpp', 'python']) requireValue(typeof input.starterCode[language] === 'string' && bytes(input.starterCode[language]) <= 50000, 'Starter code phải là chuỗi, tối đa 50 KB.');
  function tests(list, name, min, max) {
    requireValue(Array.isArray(list) && list.length >= min && list.length <= max, `${name}: cần ${min}–${max} test.`);
    for (const test of list) {
      requireValue(object(test), `${name} không hợp lệ.`);
      for (const field of ['input', 'output']) requireValue(typeof test[field] === 'string' && bytes(test[field]) <= 20 * 1024, `${name} ${field} phải là chuỗi, tối đa 20 KB/test.`);
      if (name === 'Samples') requireValue(test.explanation === undefined || typeof test.explanation === 'string' && bytes(test.explanation) <= 20000, 'Giải thích sample không hợp lệ.');
    }
  }
  tests(input.samples, 'Samples', 1, 10);
  tests(input.hiddenTests ?? [], 'Hidden tests', status === 'published' ? 1 : 0, 50);
  const publicData = serializePublicProblem({ ...input, status });
  // Firestore documents have a 1 MiB ceiling, including overhead.
  requireValue(bytes(JSON.stringify(publicData)) <= 900 * 1024, 'Nội dung công khai vượt giới hạn 900 KB.');
  const hiddenTests = (input.hiddenTests ?? []).map(({ input, output }) => ({ input, output }));
  requireValue(bytes(JSON.stringify(hiddenTests)) <= 900 * 1024, 'Tổng hidden tests vượt giới hạn 900 KB.');
  return { ...publicData, hiddenTests };
}
export function parseProblemImport(raw) {
  requireValue(typeof raw === 'string' && bytes(raw) <= 2 * 1024 * 1024, 'JSON import tối đa 2 MB.');
  let data;
  try { data = JSON.parse(raw); } catch { throw new AuthoringError('JSON không hợp lệ.'); }
  return validateProblem(data, { status: 'draft' }); // Import never publishes.
}
