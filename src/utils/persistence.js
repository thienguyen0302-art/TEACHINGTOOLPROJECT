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
