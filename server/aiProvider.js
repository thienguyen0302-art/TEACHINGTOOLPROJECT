import { normalizeVisualization } from './tutorVisualization.js';
export class TutorError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const labels = { chat: 'Peanut AI', hint: 'Gợi ý', explain_error: 'Phân tích lỗi code', explain_failure: 'Tại sao bài chưa đúng?', complexity: 'Độ phức tạp', visualize: 'Trực quan hóa code' };
const text = (value, limit = 1800) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

function parseProviderJson(raw) {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); }
  catch { return {}; }
}

export function normalizeSelfCheckFeedback(raw) {
  const data = parseProviderJson(raw);
  const value = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const numericAccuracy = Number(value.accuracy);
  const accuracy = Number.isFinite(numericAccuracy) ? Math.round(Math.min(100, Math.max(0, numericAccuracy))) : 0;
  const levels = new Set(['accurate', 'mostly_correct', 'partial', 'misunderstood']);
  const list = (items) => Array.isArray(items)
    ? items.map((item) => text(item, 350)).filter(Boolean).slice(0, 6)
    : [];
  return {
    accuracy,
    level: levels.has(value.level) ? value.level : 'partial',
    summary: text(value.summary, 600) || 'AI chưa thể đưa ra nhận xét đủ rõ. Em hãy tự đối chiếu với đáp án tham khảo.',
    correctPoints: list(value.correctPoints),
    missingPoints: list(value.missingPoints),
    misconceptions: list(value.misconceptions),
    suggestedRevision: text(value.suggestedRevision, 800),
    followUpQuestion: text(value.followUpQuestion, 500),
  };
}

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

export const outputTokenLimits = Object.freeze({ chat: 600, hint: 350, explain_error: 450, explain_failure: 450, complexity: 450, visualize: 1200, self_check: 550 });
export function providerRequest({ url, model, system, context, action }) {
  if (!Object.hasOwn(outputTokenLimits, action)) throw new TutorError(400, 'AI action không hợp lệ.');
  return {
    url: `${url.replace(/\/+$/, '')}/models/${encodeURIComponent(model)}:generateContent`,
    body: {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(context) }] }],
      generationConfig: { maxOutputTokens: outputTokenLimits[action], thinkingConfig: { thinkingLevel: 'minimal' }, responseMimeType: 'application/json' },
    },
  };
}
export function providerText(payload) {
  const candidate = payload?.candidates?.[0];
  if (payload?.promptFeedback?.blockReason || candidate?.safetyRatings?.some((rating) => rating?.blocked))
    throw new TutorError(502, 'Gemini đã chặn phản hồi theo chính sách an toàn. Hãy thử một hành động khác.');
  if (candidate?.finishReason === 'MAX_TOKENS')
    throw new TutorError(502, 'Gemini đã đạt giới hạn token trước khi hoàn tất phản hồi. Hãy thử lại với một hành động ngắn hơn.');
  if (candidate?.finishReason && candidate.finishReason !== 'STOP')
    throw new TutorError(502, 'Gemini không thể hoàn tất phản hồi. Hãy thử một hành động khác.');
  return (Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [])
    .filter((part) => part && !part.thought && typeof part.text === 'string')
    .map((part) => part.text).join('');
}
function providerError(status) {
  if (status === 401 || status === 403) return 'Gemini API key không hợp lệ hoặc chưa có quyền truy cập model. Kiểm tra AI_API_KEY.';
  if (status === 404) return 'Không tìm thấy Gemini model/endpoint. Kiểm tra AI_API_URL và AI_MODEL.';
  if (status === 429) return 'Gemini đã đạt free-tier quota hoặc rate limit. Kiểm tra quota và thử lại sau.';
  if (status === 400) return 'Gemini request/model/config không hợp lệ. Kiểm tra AI_API_URL và AI_MODEL.';
  return `Gemini provider không khả dụng (HTTP ${status}). Hãy thử lại.`;
}

// One-shot compatible adapter. Provider transport stays out of UI.
export async function requestProvider({ system, context, action, signal, env = process.env, fetchImpl = fetch }) {
  if (!env.AI_API_KEY?.trim()) throw new TutorError(503, 'AI Tutor chưa được cấu hình.');
  try {
    if ((env.AI_PROVIDER || 'gemini').trim() !== 'gemini') throw new TutorError(503, 'AI_PROVIDER phải là gemini.');
    const request = providerRequest({ url: (env.AI_API_URL || 'https://generativelanguage.googleapis.com/v1beta').trim(), model: (env.AI_MODEL || 'gemini-3.5-flash-lite').trim(), system, context, action });
    const response = await fetchImpl(request.url, { method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.AI_API_KEY.trim() },
      body: JSON.stringify(request.body),
    });
    let payload;
    try { payload = await response.json(); } catch {
      if (!response.ok) throw new TutorError(502, providerError(response.status));
      throw new TutorError(502, 'AI provider trả về JSON không hợp lệ. Hãy thử lại.');
    }
    if (!response.ok) throw new TutorError(502, providerError(response.status, payload));
    const content = providerText(payload);
    if (typeof content !== 'string' || !content.trim()) throw new TutorError(502, 'AI provider trả về phản hồi không hợp lệ. Hãy thử lại.');
    const feedback = action === 'self_check'
      ? normalizeSelfCheckFeedback(content)
      : normalizeFeedback(content, action, { source: context?.student?.source, samples: context?.problem?.samples });
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
