import { normalizeVisualization } from './tutorVisualization.js';
export class TutorError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const labels = { hint: 'Gợi ý', explain_error: 'Phân tích lỗi code', explain_failure: 'Tại sao bài chưa đúng?', complexity: 'Độ phức tạp', visualize: 'Trực quan hóa code' };
const text = (value, limit = 1800) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

export function normalizeFeedback(raw, action, visualizationContext = {}) {
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); }
    catch {
      // Malformed JSON is not shown as code or raw provider metadata.
      data = (raw.trim().startsWith('{') || raw.trim().startsWith('[')) ? {} : { message: raw };
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
  const combined = `${text(data.message)} ${text(data.nextStep, 600)}`;
  // Reject obvious complete-program/code-block responses in this hint-only UI.
  if (/```|#include|int\s+main\s*\([^)]*\)\s*\{|def\s+(solve|main)\s*\([^)]*\)\s*:/.test(combined)) data = {};
  const message = text(data.message);
  return { action, title: labels[action],
    message: message || 'AI chưa trả về gợi ý rõ ràng. Hãy thử lại với một hành động khác.',
    focus: text(data.focus, 100), nextStep: text(data.nextStep, 600),
    confidence: message && ['low','medium','high'].includes(data.confidence) ? data.confidence : 'low',
    ...(action === 'visualize' ? { visualization: normalizeVisualization(data.visualization, visualizationContext) } : {}) };
}

// Responses and Chat Completions use distinct request/response envelopes.
export function providerRequest({ url, model, system, context }) {
  const responses = new URL(url).pathname.replace(/\/$/, '').endsWith('/responses');
  return { responses, body: responses
    ? { model, store: false, stream: false, instructions: system, input: JSON.stringify(context) }
    : { model, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(context) }] } };
}
export function providerText(payload, responses) {
  if (!responses) return payload?.choices?.[0]?.message?.content;
  return (Array.isArray(payload?.output) ? payload.output : [])
    .filter((item) => item?.type === 'message' && item.role === 'assistant')
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text).join('\n');
}
function providerError(status, payload) {
  const code = payload?.error?.code ?? payload?.error?.type;
  if (status === 401) return 'AI API key không hợp lệ hoặc đã hết hiệu lực. Kiểm tra AI_API_KEY.';
  if (status === 403) return 'AI provider từ chối quyền truy cập. Kiểm tra quyền của key và model.';
  if (status === 404 || code === 'model_not_found') return 'Không tìm thấy AI endpoint/model hoặc key chưa có quyền dùng model. Kiểm tra AI_API_URL và AI_MODEL.';
  if (status === 429 && code === 'insufficient_quota') return 'AI API đã hết quota hoặc chưa có ngân sách sử dụng. Kiểm tra billing của tài khoản API.';
  if (status === 429) return 'AI API đang giới hạn tần suất. Hãy thử lại sau.';
  if (status === 400) return 'AI provider không chấp nhận cấu hình request/model. Kiểm tra endpoint và AI_MODEL.';
  return `AI provider không khả dụng (HTTP ${status}). Hãy thử lại.`;
}

// One-shot compatible adapter. Provider transport stays out of UI.
export async function requestProvider({ system, context, action, signal, env = process.env, fetchImpl = fetch }) {
  if (!env.AI_API_URL || !env.AI_API_KEY || !env.AI_MODEL) throw new TutorError(503, 'AI Tutor chưa được cấu hình.');
  try {
    const request = providerRequest({ url: env.AI_API_URL.trim(), model: env.AI_MODEL.trim(), system, context });
    const response = await fetchImpl(env.AI_API_URL.trim(), { method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY.trim()}` },
      body: JSON.stringify(request.body),
    });
    let payload;
    try { payload = await response.json(); } catch {
      if (!response.ok) throw new TutorError(502, providerError(response.status));
      throw new TutorError(502, 'AI provider trả về JSON không hợp lệ. Hãy thử lại.');
    }
    if (!response.ok) throw new TutorError(502, providerError(response.status, payload));
    const content = providerText(payload, request.responses);
    if (typeof content !== 'string' || !content.trim()) throw new TutorError(502, 'AI provider trả về phản hồi không hợp lệ. Hãy thử lại.');
    const feedback = normalizeFeedback(content, action, { source: context?.student?.source, samples: context?.problem?.samples });
    // Redact credentials from all nested strings, including visualization cells.
    const secrets = [env.AI_API_KEY, env.JUDGE0_API_KEY, env.JUDGE0_AUTH_TOKEN].filter(Boolean);
    function redact(value) {
      if (typeof value === 'string') return secrets.reduce((current, secret) => current.replaceAll(secret, '[redacted]'), value);
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redact(child)]));
      return value;
    }
    return redact(feedback);
  } catch (error) {
    if (signal?.aborted) throw new TutorError(504, 'AI Tutor hết thời gian chờ. Hãy thử lại.');
    if (error instanceof TutorError) throw error;
    throw new TutorError(502, 'Không kết nối được AI provider. Hãy thử lại.');
  }
}
