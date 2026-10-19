import { authHeaders } from './authHeader.js';
async function api(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(path, { method, signal, headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); } catch { throw new Error('Không kết nối được Contest API. Kiểm tra backend /api.'); }
  if (!response.ok) throw new Error(data.error || 'Không tải được dữ liệu contest.');
  return data;
}
export const listContests = () => api('/api/contests');
export const loadContest = (id) => api(`/api/contests/${encodeURIComponent(id)}`);
export const loadContestProblem = (id, problemId) => api(`/api/contests/${encodeURIComponent(id)}/problems/${encodeURIComponent(problemId)}`);
export const loadScoreboard = (id) => api(`/api/contests/${encodeURIComponent(id)}/scoreboard`);
export const loadContestSubmissions = (id) => api(`/api/contests/${encodeURIComponent(id)}/submissions`);
export const judgeContest = ({ contestId, problemId, language, source, mode, stdin, signal }) => api('/api/contest/judge', { method: 'POST', body: { contestId, problemId, language, source, mode, stdin }, signal });
export const listTeacherProblems = () => api('/api/teacher/problems');
export const loadTeacherProblem = (id) => api(`/api/teacher/problems/${encodeURIComponent(id)}`);
export const saveTeacherProblem = (id, body) => api(`/api/teacher/problems${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body });
export const listTeacherContests = () => api('/api/teacher/contests');
export const loadTeacherContest = (id) => api(`/api/teacher/contests/${encodeURIComponent(id)}`);
export const saveTeacherContest = (id, body) => api(`/api/teacher/contests${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body });
export const listPracticeProblems = () => api('/api/practice');
export const loadPracticeProblem = id => api(`/api/practice/${encodeURIComponent(id)}`);
export const setPracticePublished = (id,published) => api(`/api/teacher/problems/${encodeURIComponent(id)}/practice`,{method:'PUT',body:{published}});
export const judgePractice = ({signal,...body}) => api('/api/practice/judge',{method:'POST',body,signal});
