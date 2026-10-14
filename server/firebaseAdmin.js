import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
export function adminDb() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      ...(process.env.FIREBASE_PROJECT_ID
        ? { projectId: process.env.FIREBASE_PROJECT_ID }
        : {}),
    });
  return getFirestore(app);
}
// Lazy initialization: tests inject a repository; no production Firebase is contacted.
export function createRepository(getDb = adminDb) {
  return {
    async get(path) {
      return (await getDb().doc(path).get()).data() ?? null;
    },
    async list(path, filters = []) {
      let q = getDb().collection(path);
      for (const [field, op, value] of filters) q = q.where(field, op, value);
      return (await q.get()).docs.map((d) => ({ ...d.data(), id: d.id }));
    },
    id(path) {
      return getDb().collection(path).doc().id;
    },
    transaction(fn) {
      const db = getDb();
      return db.runTransaction((tx) =>
        fn({
          get: async (path) => (await tx.get(db.doc(path))).data() ?? null,
          set: (path, data) => tx.set(db.doc(path), data),
          delete: (path) => tx.delete(db.doc(path)),
        }),
      );
    },
  };
}
