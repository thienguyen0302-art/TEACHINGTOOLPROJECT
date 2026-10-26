import { doc, getDocs, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { listChapters, loadChapter } from "./contentService";
import { computeLessonProgress, runnableExercises } from "../utils/lessonCompletion";
import { calculateScore, chapterScore } from "../utils/grading";
import { PROGRESS_SCHEMA } from "./progressService";

// Tính lại % và điểm cho dữ liệu cũ (học sinh đã học nhưng bản ghi thiếu/lệch %).
// Chạy phía học sinh (rules chỉ cho chủ tài khoản ghi), 1 lần mỗi phiên/ngôn ngữ.
export async function recalculateProgress(uid, language) {
  if (!uid) return false;
  const [progressSnap, subSnap, chapters] = await Promise.all([
    getDocs(collection(db, "users", uid, "progress")),
    getDocs(collection(db, "users", uid, "submissions")),
    listChapters(language),
  ]);

  const solvedByChapter = new Map();
  for (const d of subSnap.docs) {
    const s = d.data();
    if (s.language !== language || s.solved !== true || typeof s.slug !== "string") continue;
    const parts = s.slug.split("/"); // lesson/{lang}/{chapter}/practice/{exerciseId}
    if (parts.length !== 5 || parts[0] !== "lesson" || parts[1] !== language || parts[3] !== "practice") continue;
    if (!solvedByChapter.has(parts[2])) solvedByChapter.set(parts[2], new Set());
    solvedByChapter.get(parts[2]).add(parts[4]);
  }

  const rows = new Map(progressSnap.docs.map((d) => [d.id, d.data()]));
  let changed = false;

  for (const meta of chapters) {
    const key = `${language}_${meta.id}`;
    const prev = rows.get(key);
    const solvedIds = [...(solvedByChapter.get(meta.id) ?? [])];
    if (!prev && solvedIds.length === 0) continue;
    const chapter = await loadChapter(language, meta.id);
    if (!chapter) continue;

    const p = prev ?? {};
    const mergedSolved = [...new Set([...(p.solvedIds ?? []), ...solvedIds])];
    const legacyDone = p.completed === true && (p.schemaVersion ?? 1) < PROGRESS_SCHEMA;
    const summaryVisited = p.summaryVisited === true || p.lastTab === "summary" || legacyDone;
    const tab = p.lastTab ?? "overview";
    const quizSubmitted = p.quizSubmitted === true || (p.attempts ?? 0) > 0;
    const answers = p.answers ?? {};

    let percent = computeLessonProgress({
      chapter,
      overviewRead: p.overviewRead === true || tab !== "overview",
      reflections: p.reflections ?? {},
      answers,
      quizSubmitted,
      solvedIds: mergedSolved,
      summaryVisited,
      tab,
    });
    const completed = legacyDone || percent >= 100;
    if (completed) percent = 100;

    const quizPercent = quizSubmitted ? calculateScore(chapter.quiz ?? [], answers).percentage : 0;
    const cs = chapterScore(chapter, { quizPercent: Math.max(quizPercent, Number(p.quizScore ?? 0)), quizSubmitted, solvedIds: mergedSolved });

    const next = {
      schemaVersion: PROGRESS_SCHEMA,
      language, chapterId: meta.id,
      completed,
      progressPercent: percent,
      chapterScore: cs.score,
      codeSolved: cs.solved,
      codeTotal: runnableExercises(chapter).length,
      solvedIds: mergedSolved,
      summaryVisited,
      quizSubmitted,
      quizScore: Number(p.quizScore ?? 0),
    };
    const same = prev
      && prev.schemaVersion === next.schemaVersion
      && (prev.completed === true) === next.completed
      && prev.progressPercent === next.progressPercent
      && prev.chapterScore === next.chapterScore
      && prev.codeSolved === next.codeSolved
      && prev.codeTotal === next.codeTotal;
    if (same) continue;

    await setDoc(doc(db, "users", uid, "progress", key), { ...next, updatedAt: serverTimestamp() }, { merge: true });
    changed = true;
  }
  return changed;
}
