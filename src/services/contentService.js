const modules = import.meta.glob("../content/{cpp,python}/*.json");

export async function loadChapter(language, chapterId) {
  const loader = modules[`../content/${language}/${chapterId}.json`];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

export async function listChapters(language) {
  const prefix = `../content/${language}/`;
  const list = [];
  for (const path of Object.keys(modules)) {
    if (path.startsWith(prefix)) {
      const mod = await modules[path]();
      const { id, title, order, description } = mod.default;
      list.push({ id, title, order, description });
    }
  }
  return list.sort((a, b) => a.order - b.order);
}
