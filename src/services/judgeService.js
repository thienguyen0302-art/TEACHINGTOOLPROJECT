const DEFAULT_BASE_URL = "https://ce.judge0.com";
const DEFAULT_POLL_INTERVAL_MS = 600;
const DEFAULT_MAX_POLLS = 30;

const baseUrl = (import.meta.env.VITE_JUDGE0_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

export const judgeLanguageConfig = {
  cpp: {
    id: Number(import.meta.env.VITE_JUDGE0_CPP_ID) || 105,
    compilerOptions: "-std=c++17",
  },
  python: {
    id: Number(import.meta.env.VITE_JUDGE0_PYTHON_ID) || 92,
    compilerOptions: null,
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Judge0 trả về HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function getLanguage(language) {
  const config = judgeLanguageConfig[language];
  if (!config) throw new Error(`Ngôn ngữ chưa được Judge0 hỗ trợ: ${language}`);
  return config;
}

function normalizeResult(result) {
  const status = result?.status ?? { id: 13, description: "Internal Error" };
  let category = "runtime-error";

  if (status.id === 3) category = "accepted";
  else if (status.id === 4) category = "wrong-answer";
  else if (status.id === 5) category = "time-limit";
  else if (status.id === 6) category = "compile-error";
  else if (status.id === 13) category = "internal-error";

  return {
    token: result?.token ?? null,
    status,
    category,
    stdout: result?.stdout ?? "",
    stderr: result?.stderr ?? "",
    compileOutput: result?.compile_output ?? "",
    message: result?.message ?? "",
    time: result?.time ?? null,
    memory: result?.memory ?? null,
  };
}

export async function createSubmission({ sourceCode, language, stdin = "", expectedOutput }) {
  const config = getLanguage(language);
  const body = {
    source_code: sourceCode,
    language_id: config.id,
    stdin,
    enable_network: false,
  };

  if (config.compilerOptions) body.compiler_options = config.compilerOptions;
  if (expectedOutput !== undefined) body.expected_output = expectedOutput;

  const response = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await readJson(response);
  if (!payload?.token) throw new Error("Judge0 không trả về submission token.");
  return payload.token;
}

export async function getSubmission(token) {
  const fields = "token,stdout,stderr,compile_output,message,status,time,memory";
  const response = await fetch(
    `${baseUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=${fields}`,
  );
  return readJson(response);
}

export async function waitForSubmission(
  token,
  { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, maxPolls = DEFAULT_MAX_POLLS } = {},
) {
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const result = await getSubmission(token);
    const statusId = result?.status?.id;

    if (typeof statusId === "number" && statusId > 2) {
      return normalizeResult(result);
    }

    if (attempt < maxPolls - 1) await sleep(pollIntervalMs);
  }

  throw new Error("Judge0 xử lý quá lâu. Hãy thử chạy lại sau.");
}

export async function runSample({ sourceCode, language, sample }) {
  if (!sourceCode?.trim()) throw new Error("Code đang trống.");
  if (!sample) throw new Error("Bài tập chưa có sample để chạy.");

  const token = await createSubmission({
    sourceCode,
    language,
    stdin: sample.input ?? "",
    expectedOutput: sample.output ?? "",
  });

  return waitForSubmission(token);
}
