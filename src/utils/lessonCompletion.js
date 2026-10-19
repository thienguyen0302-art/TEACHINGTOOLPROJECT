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
  const summaryUnlocked = Boolean(practiceUnlocked && (quizSubmitted || !chapter?.quiz?.length || currentTab === "summary" || solved > 0));

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

export function computeLessonProgress({
  chapter,
  overviewRead = false,
  reflections = {},
  answers = {},
  quizSubmitted = false,
  solvedIds = [],
  isCompleted = false,
  tab = "overview",
}) {
  if (isCompleted) return 100;

  let percent = 0;

  // 1. Overview: 15%
  if (overviewRead || tab !== "overview") {
    percent += 15;
  } else {
    percent += 5;
  }

  // 2. Theory: 25%
  const checks = (chapter?.theory ?? []).filter((item) => item.selfCheck);
  if (checks.length > 0) {
    const answeredCount = checks.filter((item) => reflections[item.id]?.trim()).length;
    percent += Math.round((answeredCount / checks.length) * 25);
  } else if (overviewRead || tab === "theory" || tab === "practice" || tab === "summary") {
    percent += 25;
  }

  // 3. Quiz: 35%
  const questions = chapter?.quiz ?? [];
  const answeredQuizCount = Object.keys(answers || {}).filter((k) => answers[k] !== undefined && answers[k] !== null).length;
  if (quizSubmitted) {
    percent += 35;
  } else if (questions.length > 0) {
    percent += Math.round((Math.min(answeredQuizCount, questions.length) / questions.length) * 35);
  } else {
    percent += 35;
  }

  // 4. Runnable exercises: 15%
  const exercises = (chapter?.practice ?? []).filter((item) => item.runnable);
  if (exercises.length > 0) {
    const solvedCount = exercises.filter((item) => (solvedIds || []).includes(item.id)).length;
    percent += Math.round((solvedCount / exercises.length) * 15);
  } else {
    percent += 15;
  }

  // 5. Summary tab visited: 10%
  if (tab === "summary") {
    percent += 10;
  }

  return Math.min(95, Math.max(0, percent));
}

