import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { AuthoringError, serializePublicProblem, validateProblem } from '../src/utils/problemAuthoring.js';
import { contestEnd, mergeScoreboard, timestampMs, validateContest } from '../src/utils/contest.js';

function data(snapshot) {
  if (!snapshot.exists) return null;
  const value = snapshot.data();
  for (const [key, field] of Object.entries(value)) if (typeof field?.toMillis === 'function') value[key] = field.toMillis();
  return { ...value, id: snapshot.id };
}
const fail = (message) => { throw new AuthoringError(message, 409); };
export function createContestRepository(db) {
  const collection = (name) => db.collection(name);
  const get = async (path) => data(await db.doc(path).get());
  const list = async (query) => (await query.get()).docs.map(data);
  return {
    getProfile: (uid) => get(`users/${uid}`),
    // Không nuốt lỗi: nếu ghi vai trò thất bại thì phải báo lỗi, không trả "thành công".
    setTeacherRole: async (uid) => {
      await db.doc(`users/${uid}`).set({ role: 'teacher' }, { merge: true });
    },
    getContest: (id) => get(`contests/${id}`),
    getProblem: (id) => get(`problems/${id}`),
    getSecrets: (id) => get(`problemSecrets/${id}`),
    listContests: (teacher) => list(teacher ? collection('contests') : collection('contests').where('status', '==', 'published')),
    listProblems: () => list(collection('problems')),
    listScoreboard: (id) => list(collection('contests').doc(id).collection('scoreboard')),
    listSubmissions: (id, uid) => list(uid ? collection('contests').doc(id).collection('submissions').where('uid', '==', uid) : collection('contests').doc(id).collection('submissions')),
    async getProblemLock(id) { return get(`problemLocks/${id}`); },
    async saveProblem(id, input, uid, now) {
      const ref = id ? collection('problems').doc(id) : collection('problems').doc();
      await db.runTransaction(async (tx) => {
        const [oldSnap, slugSnap, lockSnap] = await Promise.all([
          tx.get(ref), tx.get(collection('problemSlugs').doc(input.slug)), tx.get(collection('problemLocks').doc(ref.id)),
        ]);
        const old = data(oldSnap);
        if (id && !old) throw new AuthoringError('Không tìm thấy bài tập.', 404);
        if (timestampMs(data(lockSnap)?.until) > now) fail('Bài đã thuộc contest published: khóa nội dung và hidden tests đến khi contest kết thúc.');
        if (slugSnap.exists && slugSnap.data().problemId !== ref.id) fail('Slug đã được sử dụng.');
        const payload = validateProblem(input, { status: input.status });
        const publicData = serializePublicProblem({ ...payload, createdBy: old?.createdBy ?? uid, createdAt: old?.createdAt ?? now, updatedAt: now });
        tx.set(ref, { ...publicData, createdAt: Timestamp.fromMillis(publicData.createdAt), updatedAt: Timestamp.fromMillis(now) });
        tx.set(collection('problemSecrets').doc(ref.id), { hiddenTests: payload.hiddenTests, updatedAt: Timestamp.fromMillis(now) });
        tx.set(collection('problemSlugs').doc(input.slug), { problemId: ref.id });
        if (old?.slug && old.slug !== input.slug) tx.delete(collection('problemSlugs').doc(old.slug));
      });
      return ref.id;
    },
    async saveContest(id, input, uid, now) {
      const ref = id ? collection('contests').doc(id) : collection('contests').doc();
      await db.runTransaction(async (tx) => {
        const old = data(await tx.get(ref));
        if (id && !old) throw new AuthoringError('Không tìm thấy contest.', 404);
        if (old?.status === 'published' && now >= timestampMs(old.startAt)) fail('Contest đã bắt đầu: không thể sửa cấu hình thi.');
        const details = await Promise.all(input.problems.map(async ({ problemId }) => {
          const [problem, secrets, lock] = await Promise.all([
            tx.get(collection('problems').doc(problemId)), tx.get(collection('problemSecrets').doc(problemId)), tx.get(collection('problemLocks').doc(problemId)),
          ]);
          return { ...data(problem), id: problemId, hiddenTestCount: data(secrets)?.hiddenTests?.length ?? 0, lock: data(lock) };
        }));
        const payload = validateContest(input, { status: input.status, publishedProblems: details });
        if (payload.status === 'published' && contestEnd(payload) <= now) fail('Không thể publish contest đã hết giờ.');
        tx.set(ref, { ...payload, startAt: Timestamp.fromMillis(payload.startAt), createdBy: old?.createdBy ?? uid, createdAt: Timestamp.fromMillis(old?.createdAt ?? now), updatedAt: Timestamp.fromMillis(now) });
        if (payload.status === 'published') for (const problem of details) {
          tx.set(collection('problemLocks').doc(problem.id), { until: Timestamp.fromMillis(Math.max(timestampMs(problem.lock?.until) || 0, contestEnd(payload))) });
        }
      });
      return ref.id;
    },
    async recordSubmission(contestId, submission, displayName) {
      const ref = collection('contests').doc(contestId);
      const rowRef = ref.collection('scoreboard').doc(submission.uid);
      const submissionRef = ref.collection('submissions').doc();
      await db.runTransaction(async (tx) => {
        const row = data(await tx.get(rowRef));
        const next = mergeScoreboard(row, submission, displayName);
        // Source is intentionally retained for private student/teacher review, never test data.
        tx.create(submissionRef, { ...submission, submittedAt: Timestamp.fromMillis(submission.submittedAt) });
        tx.set(rowRef, { ...next, lastSubmissionAt: Timestamp.fromMillis(next.lastSubmissionAt) });
      });
      return submissionRef.id;
    },
  };
}
let repository;
export function getContestRepository() {
  if (!repository) {
    const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
    repository = createContestRepository(getFirestore(app));
  }
  return repository;
}