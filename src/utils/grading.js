// Answers are stored by question ID. Only choices belonging to the question count.
function hasValidAnswer(question, userAnswer) {
  return userAnswer !== undefined && userAnswer !== null &&
    question.choices.includes(userAnswer);
}

export function checkAnswer(question, userAnswer) {
  return hasValidAnswer(question, userAnswer) && userAnswer === question.answer;
}

export function calculateScore(questions, answers) {
  const total = questions.length;
  const correct = questions.filter((question) =>
    checkAnswer(question, answers[question.id])
  ).length;
  return { correct, total, percentage: total ? Math.round(correct / total * 100) : 0 };
}

export function countAnswered(questions, answers) {
  return questions.filter((question) =>
    hasValidAnswer(question, answers[question.id])
  ).length;
}

// Điểm chương = trung bình cộng các phần có trong chương (mỗi phần tối đa 100):
//  - Quiz: điểm % của lần nộp (0 nếu chưa nộp).
//  - Code: % bài thực hành BẮT BUỘC (chapter.practice, runnable) đã Accepted.
//    Bài HSG (chapter.advanced) không tính.
// Chương chỉ có một phần thì điểm chương = phần đó.
export function chapterScore(chapter, { quizPercent = 0, quizSubmitted = false, solvedIds = [] } = {}) {
  const parts = [];
  if ((chapter?.quiz ?? []).length > 0) parts.push(quizSubmitted ? quizPercent : 0);
  const exercises = (chapter?.practice ?? []).filter((item) => item.runnable);
  const solved = exercises.filter((item) => solvedIds.includes(item.id)).length;
  if (exercises.length > 0) parts.push((solved / exercises.length) * 100);
  const score = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  return { score, solved, exercises: exercises.length };
}
