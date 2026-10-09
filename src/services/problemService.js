// Vite discovers new problem files automatically; authoring templates are excluded.
const modules = import.meta.glob(
  ["../content/problems/**/*.json", "!../content/problems/**/_*.json"],
  { eager: true, import: "default" },
);

// Use curriculum filenames, including chapters whose bank folder is still empty.
const chapterModules = import.meta.glob("../content/cpp/ch*.json");
export const problemChapterIds = Object.keys(chapterModules)
  .map((path) => path.split("/").at(-1).replace(".json", ""))
  .sort();

export const difficultyLabels = {
  basic: "Cơ bản",
  intermediate: "Trung bình",
  advanced: "Nâng cao",
};

const difficultyOrder = { basic: 0, intermediate: 1, advanced: 2 };
const publicFields = [
  "id", "slug", "chapterId", "title", "type", "difficulty", "level", "tags",
  "statement", "inputDescription", "outputDescription", "constraints",
  "samples", "hints", "starterCode",
];

function normalize(value) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

const ids = new Set();
const slugs = new Set();
const problems = Object.entries(modules).map(([path, problem]) => {
  if (!problem || typeof problem !== "object" ||
      typeof problem.id !== "string" || !problem.id.trim() ||
      typeof problem.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(problem.slug) ||
      typeof problem.title !== "string" || !problem.title.trim() ||
      !Object.hasOwn(difficultyLabels, problem.difficulty) ||
      !problemChapterIds.includes(problem.chapterId) ||
      path.split("/").at(-2) !== problem.chapterId) {
    throw new Error(`Problem metadata không hợp lệ: ${path}`);
  }
  if (ids.has(problem.id) || slugs.has(problem.slug)) {
    throw new Error(`Problem id hoặc slug bị trùng: ${path}`);
  }
  ids.add(problem.id);
  slugs.add(problem.slug);
  // Never expose solution or aiContext to page components. The source JSON is
  // still bundled in Phase 1; production judge data must move to private storage.
  return Object.fromEntries(publicFields.map((key) => [key, problem[key]]));
}).sort((a, b) => a.chapterId.localeCompare(b.chapterId) || a.id.localeCompare(b.id));

export function listProblems({ difficulty, chapterId, topic, query = "", sort = "default" } = {}) {
  const search = normalize(query.trim());
  const result = problems.filter((problem) =>
    (!difficulty || problem.difficulty === difficulty) &&
    (!chapterId || problem.chapterId === chapterId) &&
    (!topic || problem.tags.includes(topic)) &&
    (!search || normalize(`${problem.title} ${problem.id} ${problem.tags.join(" ")}`).includes(search)));

  if (sort === "difficulty") {
    result.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] ||
      a.id.localeCompare(b.id));
  } else if (sort === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  }
  return result;
}

export function getProblemBySlug(slug) {
  return problems.find((problem) => problem.slug === slug) ?? null;
}
