export const tutorActions = [
  { id: 'hint', label: 'Gợi ý tiếp theo', icon: 'spark', description: 'Một gợi ý nhỏ để tự tìm lời giải.' },
  { id: 'explain_error', label: 'Gỡ lỗi code', icon: 'bug', description: 'Hiểu thông báo lỗi và vị trí cần xem lại.' },
  { id: 'explain_failure', label: 'Vì sao chưa đúng?', icon: 'search', description: 'Tìm điểm cần kiểm tra trong logic hiện tại.' },
  { id: 'complexity', label: 'Độ phức tạp', icon: 'chart', description: 'Xem chi phí thời gian và bộ nhớ của code.' },
  { id: 'visualize', label: 'Trực quan hóa', icon: 'steps', description: 'Theo dõi từng dòng và trạng thái biến với ví dụ công khai.' },
];
export function preferredTutorAction(judge) {
  if (!judge) return 'hint';
  const statuses = judge.mode === 'run' ? [judge.result.status] : judge.results.map((r) => r.status);
  if (statuses.some((s) => /Compilation Error|Runtime Error/.test(s))) return 'explain_error';
  if (statuses.some((s) => /Wrong Answer|Time Limit Exceeded/.test(s)) || (judge.mode === 'submit' && judge.passed < judge.total)) return 'explain_failure';
  if ((judge.mode === 'run' && judge.result.status === 'Accepted') || (judge.mode === 'submit' && judge.passed === judge.total)) return 'complexity';
  return 'hint';
}
