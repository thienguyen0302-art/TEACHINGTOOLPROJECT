export class TutorError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const labels = { hint: 'Gợi ý', explain_error: 'Phân tích lỗi code', explain_failure: 'Tại sao bài chưa đúng?', complexity: 'Độ phức tạp' };
const text = (value, limit = 1800) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

export function normalizeFeedback(raw, action) {
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
    confidence: message && ['low','medium','high'].includes(data.confidence) ? data.confidence : 'low' };
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
    const feedback = normalizeFeedback(content, action);
    // Never echo configured credentials even if a provider accidentally includes them.
    for (const key of ['title','message','focus','nextStep']) {
      for (const secret of [env.AI_API_KEY, env.JUDGE0_API_KEY, env.JUDGE0_AUTH_TOKEN].filter(Boolean)) feedback[key] = feedback[key].replaceAll(secret, '[redacted]');
    }
    return feedback;
  } catch (error) {
    if (signal?.aborted) throw new TutorError(504, 'AI Tutor hết thời gian chờ. Hãy thử lại.');
    if (error instanceof TutorError) throw error;
    throw new TutorError(502, 'Không kết nối được AI provider. Hãy thử lại.');
  }
}
