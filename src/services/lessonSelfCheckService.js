import { authHeaders } from "./authHeader.js";

export async function analyzeTheorySelfCheck({ language, chapterId, theoryId, studentExplanation, signal }) {
  let response;
  try {
    response = await fetch("/api/ai/self-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ language, chapterId, theoryId, studentExplanation }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Không kết nối được AI Self-Check.", { cause: error });
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error("AI Self-Check trả về phản hồi không hợp lệ."); }
  if (!response.ok) throw new Error(data.error || "AI Self-Check chưa khả dụng.");
  return data;
}
