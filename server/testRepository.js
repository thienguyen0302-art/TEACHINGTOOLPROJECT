// In-memory repository with serialized transactions: no Firebase/Judge0 network.
export function memoryRepository(seed = {}) {
  const documents = new Map(Object.entries(structuredClone(seed)));
  let sequence = 0,
    queue = Promise.resolve();
  const repository = {
    documents,
    get: async (path) => structuredClone(documents.get(path) ?? null),
    list: async (path, filters = []) =>
      [...documents.entries()]
        .filter(
          ([key, data]) =>
            key.startsWith(path + "/") &&
            key.split("/").length === path.split("/").length + 1 &&
            filters.every(([f, , v]) => data[f] === v),
        )
        .map(([key, data]) => ({
          ...structuredClone(data),
          id: key.split("/").at(-1),
        })),
    id: () => `id-${++sequence}`,
    transaction(fn) {
      const result = queue.then(async () => {
        const writes = new Map(),
          removed = new Set();
        const value = await fn({
          get: repository.get,
          set: (p, d) => writes.set(p, structuredClone(d)),
          delete: (p) => removed.add(p),
        });
        for (const p of removed) documents.delete(p);
        for (const [p, d] of writes) documents.set(p, d);
        return value;
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  return repository;
}
