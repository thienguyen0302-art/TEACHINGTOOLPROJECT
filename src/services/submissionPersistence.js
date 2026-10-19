import { collection, doc, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { mergeSubmission, submissionDocId } from "../utils/persistence";

// Adapter cho setSubmissionPersistenceAdapter(fn): fn(contract, { uid }).
// Lưu users/{uid}/submissions/{language}_{slug}; attempts/bestScore/solved cộng dồn mọi phiên.
export async function persistSubmission(contract, { uid }) {
  if (!uid) throw new Error("Thiếu uid.");
  const ref = doc(db, "users", uid, "submissions", submissionDocId(contract));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    tx.set(ref, { ...mergeSubmission(snap.exists() ? snap.data() : null, contract), lastSubmittedAt: serverTimestamp() });
  });
}

export async function getCodeSubmissionHistory(uid) {
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "submissions"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      lastSubmittedAt: data.lastSubmittedAt?.toMillis?.() ?? data.lastSubmittedAt ?? null,
    };
  }).sort((a, b) => (b.lastSubmittedAt || 0) - (a.lastSubmittedAt || 0));
}

