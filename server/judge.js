import { Buffer } from 'node:buffer';

const encode = (value) => Buffer.from(value, 'utf8').toString('base64');
const decode = (value) => value == null ? '' : Buffer.from(value, 'base64').toString('utf8');
export const normalizeOutput = (value) => value.trim().split(/\s+/).filter(Boolean).join(' ');

export async function executeTest({ source, languageId, input, signal, baseUrl, headers = {}, fetchImpl = fetch }) {
  async function request(path, options = {}) {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...options, signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
    });
    if (!response.ok) throw new Error(`Judge0 trả về HTTP ${response.status}.`);
    return response.json();
  }
  const { token } = await request('/submissions?base64_encoded=true&wait=false', {
    method: 'POST',
    body: JSON.stringify({ source_code: encode(source), language_id: languageId,
      stdin: encode(input), cpu_time_limit: 2, wall_time_limit: 5,
      memory_limit: 128000, max_file_size: 1024, enable_network: false }),
  });
  if (!token) throw new Error('Judge0 không trả về mã submission.');
  for (let attempt = 0; attempt < 60; attempt++) {
    signal?.throwIfAborted();
    const result = await request(`/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,message,time,memory`);
    if (!Number.isInteger(result.status?.id)) throw new Error('Kết quả Judge0 không hợp lệ.');
    if (result.status.id > 2) return {
      statusId: result.status.id, status: result.status.description,
      stdout: decode(result.stdout), stderr: decode(result.stderr),
      compileOutput: decode(result.compile_output), message: decode(result.message),
      time: result.time, memory: result.memory,
    };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Judge0 chờ quá lâu. Hãy thử lại.');
}

export function gradeResult(result, test, index, hidden) {
  const passed = result.statusId === 3 && normalizeOutput(result.stdout) === normalizeOutput(test.output);
  return { index: index + 1, hidden, passed,
    status: result.statusId === 3 ? (passed ? 'Accepted' : 'Wrong Answer') : result.status,
    time: result.time, memory: result.memory,
    ...(!hidden ? { input: test.input, expected: test.output, stdout: result.stdout,
      stderr: result.stderr, compileOutput: result.compileOutput, message: result.message } : {}),
  };
}
