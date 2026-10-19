import { authHeaders } from './authHeader.js';

export function globalChatPayload({ message, history = [], language = 'general', pageContext }) {
  return { message, history: history.slice(-8).map(({ role, text }) => ({ role, text })), language, pageContext: { pathname: pageContext?.pathname ?? '/' } };
}
export async function askGlobalChat({ signal, ...request }) {
  const response = await fetch('/api/ai/global-chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify(globalChatPayload(request)), signal });
  let data;
  try { data = await response.json(); } catch { throw new Error('Peanut AI trả về phản hồi không hợp lệ.'); }
  if (!response.ok) throw new Error(data.error || 'Peanut AI tạm thời không khả dụng.');
  if (typeof data.message !== 'string' || !data.message.trim()) throw new Error('Peanut AI chưa trả lời. Hãy thử lại.');
  return data;
}
