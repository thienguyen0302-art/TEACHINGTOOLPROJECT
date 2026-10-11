import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { buildClassOverview } from "../utils/teacher";

// Chỉ tài khoản có users/{uid}.role === "teacher" đọc được (xem firestore.rules).
export async function getClassOverview() {
  const [users, progress] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collectionGroup(db, "progress")),
  ]);
  return buildClassOverview(
    users.docs.map((d) => {
      const data = d.data();
      return { uid: d.id, ...data, lastActive: data.lastActive?.toMillis?.() ?? null };
    }),
    progress.docs.map((d) => ({ uid: d.ref.parent.parent.id, ...d.data() })),
  );
}
