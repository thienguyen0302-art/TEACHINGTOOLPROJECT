// In-memory optimistic Firestore transaction double; no live Firebase/Judge calls.
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { createContestRepository } from './contestRepository.js';
import { problemTemplate } from '../src/utils/problemAuthoring.js';
export const authoredProblem = (overrides = {}) => ({ ...structuredClone(problemTemplate), title: 'Tổng hai số', slug: 'tong-hai-so', statement: 'In tổng a+b.', inputDescription: 'Hai số.', outputDescription: 'Tổng.', constraints: ['|a|, |b| <= 1000'], samples: [{ input: '2 3', output: '5', explanation: '' }], hiddenTests: [{ input: 'PRIVATE_INPUT', output: 'PRIVATE_EXPECTED' }], status: 'published', ...overrides });
export const contestFixture = (now = 1000000, overrides = {}) => ({ title: 'HSG #1', description: '', status: 'published', startAt: now - 1000, durationMinutes: 60, scoringMode: 'partial', problems: [{ problemId: 'p1', label: 'A', points: 200 }], ...overrides });
export function memoryFirestore() {
  const records = new Map(); const versions = new Map(); let serial = 0; let retries = 0;
  const snap = (path) => ({ id: path.split('/').at(-1), exists: records.has(path), data: () => ({ ...records.get(path) }) });
  const ref = (path) => ({ path, id: path.split('/').at(-1), get: async () => snap(path), collection: (name) => query(`${path}/${name}`) });
  const query = (path, predicate = () => true) => ({
    doc: (id = `generated-${++serial}`) => ref(`${path}/${id}`),
    where: (field, operator, value) => query(path, (data) => predicate(data) && operator === '==' && data[field] === value),
    get: async () => ({ docs: [...records.keys()].filter((key) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1 && predicate(records.get(key))).map(snap) }),
  });
  const put = (path, value) => { records.set(path, value); versions.set(path, (versions.get(path) ?? 0) + 1); };
  const db = { collection: query, doc: ref, async runTransaction(action) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const reads = new Map(); const writes = [];
      const tx = {
        get: async (reference) => { reads.set(reference.path, versions.get(reference.path) ?? 0); return snap(reference.path); },
        set: (reference, value) => writes.push(['set', reference.path, value]),
        create: (reference, value) => writes.push(['create', reference.path, value]),
        delete: (reference) => writes.push(['delete', reference.path]),
      };
      await action(tx);
      if ([...reads].some(([path, version]) => version !== (versions.get(path) ?? 0))) { retries++; continue; }
      for (const [mode, path, value] of writes) {
        if (mode === 'create' && records.has(path)) throw new Error('Already exists');
        if (mode === 'delete') { records.delete(path); versions.set(path, (versions.get(path) ?? 0) + 1); }
        else put(path, value);
      }
      return;
    }
    throw new Error('Too much contention');
  } };
  return { db, records, put, repository: createContestRepository(db), get retries() { return retries; } };
}
export function seedContest(now = 1000000) {
  const store = memoryFirestore();
  const problem = authoredProblem();
  store.put('users/u1', { displayName: 'An' }); store.put('users/t1', { displayName: 'Teacher', role: 'teacher' });
  store.put('problems/p1', { ...problem, hiddenTests: undefined });
  store.put('problemSecrets/p1', { hiddenTests: problem.hiddenTests });
  store.put('contests/c1', contestFixture(now));
  return store;
}
export async function request(handler, path, { method = 'GET', body = {} } = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.url = path; req.method = method; req.headers = {}; req.res = { on() {} };
  let response;
  await handler(req, (status, data) => { response = { status, data }; });
  return response;
}
export const identity = (uid = 'u1') => async () => ({ ok: true, uid });
