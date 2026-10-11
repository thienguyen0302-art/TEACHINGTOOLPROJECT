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

// One-shot Chat Completions compatible adapter. Provider transport stays out of UI.
export async function requestProvider({ system, context, action, signal, env = process.env, fetchImpl = fetch }) {
  if (!env.AI_API_URL || !env.AI_API_KEY || !env.AI_MODEL) throw new TutorError(503, 'AI Tutor chưa được cấu hình.');
  try {
    const response = await fetchImpl(env.AI_API_URL, { method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}` },
      body: JSON.stringify({ model: env.AI_MODEL, stream: false, messages: [
        { role: 'system', content: system }, { role: 'user', content: JSON.stringify(context) },
      ] }),
    });
    if (!response.ok) throw new TutorError(502, `AI provider không khả dụng (HTTP ${response.status}). Hãy thử lại.`);
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new TutorError(502, 'AI provider trả về phản hồi không hợp lệ. Hãy thử lại.');
    const feedback = normalizeFeedback(content, action, { source: context.student.source, samples: context.problem.samples });
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
