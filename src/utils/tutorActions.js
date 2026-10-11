export const tutorActions = [
  { id: 'hint', label: 'Gợi ý bước tiếp theo' },
  { id: 'explain_error', label: 'Phân tích lỗi code' },
  { id: 'explain_failure', label: 'Tại sao bài chưa đúng?' },
  { id: 'complexity', label: 'Phân tích độ phức tạp' },
];
export function preferredTutorAction(judge) {
  if (!judge) return 'hint';
  const statuses = judge.mode === 'run' ? [judge.result.status] : judge.results.map((r) => r.status);
  if (statuses.some((s) => /Compilation Error|Runtime Error/.test(s))) return 'explain_error';
  if (statuses.some((s) => /Wrong Answer|Time Limit Exceeded/.test(s)) || (judge.mode === 'submit' && judge.passed < judge.total)) return 'explain_failure';
  if ((judge.mode === 'run' && judge.result.status === 'Accepted') || (judge.mode === 'submit' && judge.passed === judge.total)) return 'complexity';
  return 'hint';
}
