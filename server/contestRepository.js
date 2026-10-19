import { createHash } from 'node:crypto';
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
    async setPracticePublished(id, published, uid, now) {
      const ref = collection('problems').doc(id);
      await db.runTransaction(async tx => {
        const [p, secret, lock] = await Promise.all([tx.get(ref),tx.get(db.doc(`problemSecrets/${id}`)),tx.get(db.doc(`problemLocks/${id}`))]);
        const problem = data(p);
        if (!problem) throw new AuthoringError('Không tìm thấy bài.',404);
        if (timestampMs(data(lock)?.until) > now) fail('Bài đang được khóa cho contest. Đợi contest kết thúc để đăng vào kho.');
        if (published) validateProblem({...problem,hiddenTests:data(secret)?.hiddenTests,practicePublished:true},{status:problem.status});
        tx.set(ref,{...p.data(),practicePublished:published,updatedAt:Timestamp.fromMillis(now)});
      });
      return id;
    },
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
        const payload = validateContest(input, { status: input.status, publishedProblems: details, minimumProblems: 4 });
        if (payload.status === 'published' && contestEnd(payload) <= now) fail('Không thể publish contest đã hết giờ.');
        tx.set(ref, { ...payload, startAt: Timestamp.fromMillis(payload.startAt), createdBy: old?.createdBy ?? uid, createdAt: Timestamp.fromMillis(old?.createdAt ?? now), updatedAt: Timestamp.fromMillis(now) });
        if (payload.status === 'published') for (const problem of details) {
          tx.set(collection('problemLocks').doc(problem.id), { until: Timestamp.fromMillis(Math.max(timestampMs(problem.lock?.until) || 0, contestEnd(payload))) });
        }
      });
      return ref.id;
    },
    async importPdfContest(input, uid, now) {
      const owner = createHash('sha256').update(uid).digest('hex').slice(0, 12);
      const id = `pdf-${owner}-${input.importId}`;
      const marker = db.doc(`teacherImports/${id}`);
      const problemIds = input.problems.map((_, i) => `${id}-${i + 1}`);
      const contest = validateContest({ ...input.contest, problems: input.problems.map((p, i) => ({problemId: problemIds[i], points:p.points})) }, {status:'draft'});
      const hash = createHash('sha256').update(JSON.stringify({contest,problems:input.problems})).digest('hex');
      const result = { id, problemIds, status:'draft' };
      const problems = input.problems.map(p => validateProblem(p, {status:p.status}));
      await db.runTransaction(async tx => {
        const previous = data(await tx.get(marker));
        if(previous) {
          if(previous.hash !== hash) fail('Lần nhập này đã được lưu với nội dung khác. Hãy mở contest đã tạo hoặc bắt đầu lần nhập mới.');
          return;
        }
        const refs = [db.doc(`contests/${id}`), ...problems.flatMap((p,i) => [db.doc(`problems/${problemIds[i]}`),db.doc(`problemSecrets/${problemIds[i]}`),db.doc(`problemSlugs/${p.slug}`)])];
        if((await Promise.all(refs.map(ref=>tx.get(ref)))).some(s=>s.exists)) fail('Có bài trùng mã nhập đề. Hãy bắt đầu lần nhập mới.');
        const stamp = Timestamp.fromMillis(now);
        for(const [i,p] of problems.entries()) {
          tx.create(db.doc(`problems/${problemIds[i]}`),{...serializePublicProblem(p),createdBy:uid,createdAt:stamp,updatedAt:stamp});
          tx.create(db.doc(`problemSecrets/${problemIds[i]}`),{hiddenTests:p.hiddenTests,updatedAt:stamp});
          tx.create(db.doc(`problemSlugs/${p.slug}`),{problemId:problemIds[i]});
        }
        tx.create(db.doc(`contests/${id}`),{...contest,startAt:Timestamp.fromMillis(contest.startAt),createdBy:uid,createdAt:stamp,updatedAt:stamp});
        tx.create(marker,{hash,createdBy:uid,createdAt:stamp});
      });
      return result;
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