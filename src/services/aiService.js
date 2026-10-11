// Send a minimal public snapshot; hidden payload fields never leave this client.
export function publicJudgeSnapshot(judge) {
  if (!judge) return null;
  if (judge.mode === 'run') {
    const r = judge.result;
    return { mode: 'run', result: { status: r.status, stdout: r.stdout, stderr: r.stderr, compileOutput: r.compileOutput, time: r.time, memory: r.memory } };
  }
  return { mode: 'submit', passed: judge.passed, total: judge.total,
    results: judge.results.map(({ hidden, passed, status, time, memory }) => ({ hidden, passed, status, time, memory })) };
}

export async function askTutor({ slug, language, source, action, judgeResult, signal }) {
  let response;
  try {
    response = await fetch('/api/ai/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, language, source, action, judgeResult: publicJudgeSnapshot(judgeResult) }), signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Không kết nối được AI Tutor. Hãy thử lại.', { cause: error });
  }
  let data;
  try { data = await response.json(); } catch { throw new Error('AI Tutor trả về phản hồi không hợp lệ. Hãy kiểm tra backend.'); }
  if (!response.ok) throw new Error(data.error || 'AI Tutor không khả dụng.');
  if (typeof data.message !== 'string') throw new Error('AI Tutor chưa trả về gợi ý hợp lệ. Hãy thử lại.');
  return data;
}
