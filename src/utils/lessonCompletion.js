export function lessonCompletion(chapter, { overviewRead, reflections, quizSubmitted, solvedIds }) {
  const checks = (chapter.theory ?? []).filter((item) => item.selfCheck);
  const answered = checks.filter((item) => reflections[item.id]?.trim()).length;
  const exercises = (chapter.practice ?? []).filter((item) => item.runnable);
  const solved = exercises.filter((item) => solvedIds.includes(item.id)).length;
  const theory = overviewRead && answered === checks.length;
  const practice = theory && (quizSubmitted || !chapter.quiz?.length) && solved === exercises.length;
  return { unlocked: { overview: true, theory: overviewRead, practice: theory, summary: practice }, answered, checks: checks.length, solved, exercises: exercises.length };
}
