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
