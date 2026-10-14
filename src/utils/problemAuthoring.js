export const LANGUAGES = ["cpp", "python"];
export const DIFFICULTIES = ["basic", "intermediate", "advanced"];
export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const problemTemplate = {
  title: "Tổng hai số",
  slug: "tong-hai-so",
  difficulty: "basic",
  tags: ["math"],
  statement: "Cho hai số nguyên a và b. Hãy tính tổng a + b.",
  inputDescription: "Hai số nguyên a và b.",
  outputDescription: "In tổng a + b.",
  constraints: ["-10^9 <= a,b <= 10^9"],
  samples: [{ input: "2 3", output: "5", explanation: "" }],
  hiddenTests: [
    { input: "0 0", output: "0" },
    { input: "1000000000 1000000000", output: "2000000000" },
  ],
  allowedLanguages: ["cpp", "python"],
  starterCode: {
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n}\n",
    python: "",
  },
  published: false,
};
const bytes = (s) => new TextEncoder().encode(s).length;
export function validateProblem(
  p,
  { publish = p?.published === true, existingSlugs = [], originalSlug } = {},
) {
  const errors = [];
  if (!p || typeof p !== "object" || Array.isArray(p))
    return ["Bài phải là một object."];
  for (const [field, label] of [
    ["title", "Tên bài"],
    ["statement", "Đề bài"],
    ["inputDescription", "Dữ liệu vào"],
    ["outputDescription", "Dữ liệu ra"],
  ]) {
    if (typeof p[field] !== "string" || !p[field].trim())
      errors.push(`${label} không được trống.`);
    else if (bytes(p[field]) > (field === "statement" ? 100000 : 20000))
      errors.push(`${label} quá dài.`);
  }
  if (
    typeof p.slug !== "string" ||
    p.slug.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)
  )
    errors.push("Slug chỉ gồm chữ thường, số và dấu gạch nối.");
  if (p.slug !== originalSlug && existingSlugs.includes(p.slug))
    errors.push("Slug đã tồn tại.");
  if (!DIFFICULTIES.includes(p.difficulty)) errors.push("Độ khó không hợp lệ.");
  if (
    !Array.isArray(p.tags) ||
    p.tags.length > 20 ||
    p.tags.some((t) => typeof t !== "string" || t.length > 100)
  )
    errors.push("Tags không hợp lệ.");
  if (
    !Array.isArray(p.constraints) ||
    p.constraints.length > 50 ||
    p.constraints.some((t) => typeof t !== "string" || bytes(t) > 2000)
  )
    errors.push("Ràng buộc không hợp lệ.");
  if (
    !Array.isArray(p.allowedLanguages) ||
    !p.allowedLanguages.length ||
    new Set(p.allowedLanguages).size !== p.allowedLanguages.length ||
    p.allowedLanguages.some((l) => !LANGUAGES.includes(l))
  )
    errors.push("Chọn ít nhất một ngôn ngữ C++/Python hợp lệ.");
  for (const [key, label, limit, required] of [
    ["samples", "Sample", 10, true],
    ["hiddenTests", "Hidden test", 50, publish],
  ]) {
    if (!Array.isArray(p[key])) {
      errors.push(`${label} phải là danh sách.`);
      continue;
    }
    if (required && !p[key].length) errors.push(`Cần ít nhất 1 ${label}.`);
    if (p[key].length > limit) errors.push(`${label}: tối đa ${limit} test.`);
    p[key].forEach((t, i) => {
      for (const f of ["input", "output"])
        if (typeof t?.[f] !== "string")
          errors.push(`${label} ${i + 1}: ${f} phải là chuỗi.`);
        else if (bytes(t[f]) > 20480)
          errors.push(`${label} ${i + 1}: ${f} vượt 20 KB.`);
      if (
        key === "samples" &&
        t?.explanation !== undefined &&
        (typeof t.explanation !== "string" || bytes(t.explanation) > 20000)
      )
        errors.push(`${label} ${i + 1}: giải thích không hợp lệ.`);
    });
  }
  if (
    !p.starterCode ||
    typeof p.starterCode !== "object" ||
    LANGUAGES.some(
      (l) =>
        typeof p.starterCode[l] !== "string" || bytes(p.starterCode[l]) > 50000,
    )
  )
    errors.push("Starter code C++/Python phải là chuỗi, tối đa 50 KB.");
  if (bytes(JSON.stringify(p.hiddenTests ?? [])) > 900000)
    errors.push("Tổng hidden tests vượt 900 KB (giới hạn document Firestore).");
  return errors;
}
// Explicit allowlist; imported secrets/solutions/credentials can never enter public documents.
export function publicProblem(p) {
  return {
    title: p.title,
    slug: p.slug,
    difficulty: p.difficulty,
    tags: [...p.tags],
    statement: p.statement,
    inputDescription: p.inputDescription,
    outputDescription: p.outputDescription,
    constraints: [...p.constraints],
    samples: p.samples.map((t) => ({
      input: t.input,
      output: t.output,
      explanation: t.explanation ?? "",
    })),
    allowedLanguages: [...p.allowedLanguages],
    starterCode: { cpp: p.starterCode.cpp, python: p.starterCode.python },
    published: p.published === true,
  };
}
export function importProblemJson(text) {
  let p;
  try {
    p = JSON.parse(text);
  } catch {
    throw new Error("JSON không hợp lệ. Kiểm tra dấu phẩy và dấu ngoặc.");
  }
  const candidate = { ...p, published: false };
  const errors = validateProblem(candidate, { publish: true });
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    ...publicProblem(candidate),
    hiddenTests: p.hiddenTests.map((t) => ({
      input: t.input,
      output: t.output,
    })),
  };
}
