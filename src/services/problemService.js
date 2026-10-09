// Vite discovers new problem files automatically; authoring templates are excluded.
const modules = import.meta.glob(
  ["../content/problems/**/*.json", "!../content/problems/**/_*.json"],
  { eager: true, import: "default" },
);

export const difficultyLabels = {
  basic: "Cơ bản",
  intermediate: "Trung bình",
  advanced: "Nâng cao",
};

const ids = new Set();
const slugs = new Set();
const problems = Object.entries(modules).map(([path, problem]) => {
  if (!problem.id || !problem.slug || !problem.title ||
      !Object.hasOwn(difficultyLabels, problem.difficulty) ||
      !/^ch\d{2}$/.test(problem.chapterId) ||
      !path.includes(`/${problem.chapterId}/`)) {
    throw new Error(`Problem metadata không hợp lệ: ${path}`);
  }
  if (ids.has(problem.id) || slugs.has(problem.slug)) {
    throw new Error(`Problem id hoặc slug bị trùng: ${path}`);
  }
  ids.add(problem.id);
  slugs.add(problem.slug);
  return problem;
}).sort((a, b) => a.chapterId.localeCompare(b.chapterId) || a.id.localeCompare(b.id));

export function listProblems({ difficulty, chapterId } = {}) {
  return problems.filter((problem) =>
    (!difficulty || problem.difficulty === difficulty) &&
    (!chapterId || problem.chapterId === chapterId));
}

export function getProblemBySlug(slug) {
  return problems.find((problem) => problem.slug === slug) ?? null;
}
