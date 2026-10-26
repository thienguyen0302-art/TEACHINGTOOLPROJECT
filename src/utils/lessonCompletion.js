import { countAnswered } from "./grading.js";

export function lessonCompletion(chapter, { overviewRead, reflections = {}, quizSubmitted, solvedIds = [], isCompleted = false, currentTab } = {}) {
  const checks = (chapter?.theory ?? []).filter((item) => item.selfCheck);
  const answered = checks.filter((item) => reflections[item.id]?.trim()).length;
  const exercises = (chapter?.practice ?? []).filter((item) => item.runnable);
  const solved = exercises.filter((item) => (solvedIds || []).includes(item.id)).length;

  if (isCompleted) {
    return {
      unlocked: { overview: true, theory: true, practice: true, summary: true },
      answered,
      checks: checks.length,
      solved,
      exercises: exercises.length,
    };
  }

  const theoryUnlocked = Boolean(overviewRead || answered > 0 || currentTab === "theory" || currentTab === "practice" || currentTab === "summary");
  const practiceUnlocked = Boolean(theoryUnlocked && (checks.length === 0 || answered > 0 || currentTab === "practice" || currentTab === "summary" || quizSubmitted));
  const summaryUnlocked = Boolean(practiceUnlocked && (currentTab === "summary" || ((!chapter?.quiz?.length || quizSubmitted) && (exercises.length === 0 || solved > 0))));

  return {
    unlocked: {
      overview: true,
      theory: theoryUnlocked,
      practice: practiceUnlocked,
      summary: summaryUnlocked,
    },
    answered,
    checks: checks.length,
    solved,
    exercises: exercises.length,
  };
}

// ─────────────────────────────────────────────────────────────
// CÔNG THỨC % HOÀN THÀNH CHƯƠNG (làm đến đâu tính đến đó, tối đa 100)
//   Tổng quan  10%  = đã đọc hết tổng quan
//   Lý thuyết  20%  = 20 × (số câu Self-Check đã trả lời / tổng Self-Check)
//   Quiz       30%  = 30 × (số câu quiz đã chọn / tổng câu quiz); nộp quiz = đủ 30
//   Bài code   30%  = 30 × (số bài code bắt buộc Accepted / tổng bài code bắt buộc)
//   Tổng kết   10%  = đã vào tab Tổng kết (hoặc bấm Đánh dấu hoàn thành)
// Chương "hoàn thành" khi đạt đúng 100%, không phụ thuộc điểm quiz.
// ─────────────────────────────────────────────────────────────
export const PROGRESS_WEIGHTS = { overview: 10, theory: 20, quiz: 30, practice: 30, summary: 10 };

export function runnableExercises(chapter) {
  return (chapter?.practice ?? []).filter((item) => item.runnable);
}

export function computeLessonProgress({
  chapter,
  overviewRead = false,
  reflections = {},
  answers = {},
  quizSubmitted = false,
  solvedIds = [],
  summaryVisited = false,
  tab = "overview",
}) {
  const W = PROGRESS_WEIGHTS;
  const beyondOverview = tab !== "overview";
  const solvedSet = new Set((solvedIds || []).filter(Boolean));

  const overview = overviewRead || beyondOverview ? W.overview : 0;

  const checks = (chapter?.theory ?? []).filter((item) => item.selfCheck);
  let theory = 0;
  if (checks.length > 0) {
    const answered = checks.filter((item) => reflections?.[item.id]?.trim()).length;
    theory = W.theory * (answered / checks.length);
  } else if (overviewRead || beyondOverview) {
    theory = W.theory;
  }

  const questions = chapter?.quiz ?? [];
  let quiz;
  if (questions.length === 0 || quizSubmitted) quiz = W.quiz;
  else quiz = W.quiz * (countAnswered(questions, answers || {}) / questions.length);

  const exercises = runnableExercises(chapter);
  const practice = exercises.length === 0
    ? W.practice
    : W.practice * (exercises.filter((item) => solvedSet.has(item.id)).length / exercises.length);

  const summary = summaryVisited || tab === "summary" ? W.summary : 0;

  const total = overview + theory + quiz + practice + summary;
  // Chỉ chạm 100 khi mọi phần đủ (tránh làm tròn 99.6 thành 100).
  return total >= 100 - 1e-9 ? 100 : Math.min(99, Math.floor(total + 1e-9));
}
