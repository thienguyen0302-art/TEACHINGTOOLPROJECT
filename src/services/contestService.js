import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { authHeaders } from "./authHeader";
import { sortScoreboard } from "../utils/contest";
async function post(url, body, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
    signal,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "Backend chưa sẵn sàng. Chạy npm run dev và cấu hình /api trên hosting.",
    );
  }
  if (!response.ok) throw new Error(result.error || "Yêu cầu thất bại.");
  return result;
}
export const authoring = (action, data = {}) =>
  post("/api/authoring", { action, ...data });
export const judgeContest = (body, signal) =>
  post("/api/contest/judge", body, signal);
const rows = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }));
export const listContests = async () =>
  rows(
    await getDocs(
      query(collection(db, "contests"), where("status", "==", "published")),
    ),
  );
export const getContest = async (id) =>
  (await getDoc(doc(db, "contests", id))).data() ?? null;
export const getPublicProblem = async (id) =>
  (await getDoc(doc(db, "problems", id))).data() ?? null;
export const getScoreboard = async (id) =>
  sortScoreboard(
    rows(await getDocs(collection(db, "contests", id, "scoreboard"))),
  );
export async function getContestSubmissions(id, uid, teacher = false) {
  const ref = collection(db, "contests", id, "submissions");
  return rows(
    await getDocs(teacher ? ref : query(ref, where("uid", "==", uid))),
  ).sort((a, b) => b.submittedAt - a.submittedAt);
}
