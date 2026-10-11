import { buildProgressContract, buildSubmissionResult, updateSubmissionStats } from './submissionService.js';

// Dev1 can install an async (contract, { uid }) adapter here. Quiz/chapter storage is separate.
let persistenceAdapter = null;
export function setSubmissionPersistenceAdapter(adapter) {
  if (adapter !== null && typeof adapter !== 'function') throw new TypeError('Persistence adapter phải là function hoặc null.');
  persistenceAdapter = adapter;
}
export async function recordSubmissionProgress(submission, stats, { uid, persist = persistenceAdapter } = {}) {
  const contract = buildProgressContract(submission, stats);
  if (!uid || !persist) return { persistence: 'session-only', contract };
  try { await persist(contract, { uid }); return { persistence: 'saved', contract }; }
  catch { return { persistence: 'failed', contract, warning: 'Đã ghi tiến độ trong phiên này; chưa đồng bộ được tiến độ.' }; }
}

export function createSubmissionProgressStore() {
  const entries = new Map();
  const listeners = new Set();
  const key = ({ slug, language }, uid) => JSON.stringify([uid ?? 'guest', slug, language]);
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get(metadata, uid) { return entries.get(key(metadata, uid)) ?? null; },
    record(metadata, judge, options = {}) {
      const submission = buildSubmissionResult(metadata, judge);
      if (!submission) return null;
      const entryKey = key(metadata, options.uid);
      const stats = updateSubmissionStats(entries.get(entryKey)?.stats, submission);
      const entry = { submission, stats, warning: '', persistence: 'pending' };
      entries.set(entryKey, entry);
      listeners.forEach((listener) => listener());
      // Judge UI never waits for persistence. Late failures cannot overwrite a later submission.
      entry.handoff = recordSubmissionProgress(submission, stats, options).then((outcome) => {
        if (entries.get(entryKey) === entry) {
          entries.set(entryKey, { ...entry, ...outcome });
          listeners.forEach((listener) => listener());
        }
        return outcome;
      });
      return entry;
    },
  };
}
export const submissionProgressStore = createSubmissionProgressStore();
