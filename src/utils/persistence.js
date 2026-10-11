// Hàm thuần (không import Firebase) để dễ test bằng `node --test`.

// Firestore doc id không được chứa "/", mà slug bài Lesson có dạng lesson/cpp/ch01/practice/x.
export function submissionDocId({ language, slug }) {
  return `${language}_${String(slug).replaceAll("/", "__")}`;
}

// Gộp lần nộp mới vào bản ghi đã lưu (cộng dồn qua nhiều phiên/thiết bị).
export function mergeSubmission(prev, contract) {
  const accepted = contract.status === "accepted";
  return {
    problemId: contract.problemId,
    slug: contract.slug,
    chapterId: contract.chapterId,
    sourceType: contract.sourceType,
    section: contract.section ?? null,
    language: contract.language,
    lastStatus: contract.status,
    lastScore: contract.score,
    passed: contract.passed,
    total: contract.total,
    attempts: (prev?.attempts ?? 0) + 1,
    bestScore: Math.max(prev?.bestScore ?? 0, contract.score),
    solved: prev?.solved === true || accepted,
  };
}

// Hợp đồng kết quả thi giữa Người 2 (Exam Engine) và Người 1 (lưu Firestore).
// Người 2 truyền: { examId, language, correct, total, durationSec, autoSubmitted?, chapterIds? }
export function buildExamRecord(result) {
  const { examId, language, correct, total, durationSec, autoSubmitted = false, chapterIds = [] } = result ?? {};
  if (typeof examId !== "string" || !examId) throw new Error("Thiếu examId.");
  if (!["cpp", "python"].includes(language)) throw new Error("language phải là cpp hoặc python.");
  if (!Number.isInteger(total) || total <= 0) throw new Error("total phải là số nguyên dương.");
  if (!Number.isInteger(correct) || correct < 0 || correct > total) throw new Error("correct không hợp lệ.");
  if (!Number.isInteger(durationSec) || durationSec < 0) throw new Error("durationSec không hợp lệ.");
  if (!Array.isArray(chapterIds) || chapterIds.length > 20 || chapterIds.some((c) => typeof c !== "string")) {
    throw new Error("chapterIds không hợp lệ.");
  }
  // Điểm luôn tính lại từ correct/total, không tin số điểm do nơi khác gửi lên.
  return {
    examId, language, correct, total,
    score: Math.round((correct / total) * 100),
    durationSec,
    autoSubmitted: autoSubmitted === true,
    chapterIds,
  };
}
