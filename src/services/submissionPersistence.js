import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
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
