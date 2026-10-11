# Hợp đồng dữ liệu Người 1 ↔ Người 2

## 1. Quiz theo chương (Day 6)

Người 2 gọi khi học sinh nộp quiz (`src/services/progressService.js`):

```js
saveProgress(user.uid, chapterId, { language, chapterId, quizScore, correct, total })
// quizScore = % (0–100). Sau khi lưu: data.reload() để Dashboard cập nhật.
```

Lưu tại `users/{uid}/progress/{language}_{chapterId}`: `bestScore`, `attempts`, `completed` (≥ 70).

## 2. Bài nộp code (Day 15) — Người 1 đã cài adapter

`App.jsx` gọi `setSubmissionPersistenceAdapter(persistSubmission)`. Người 2 không cần làm gì thêm.
Lưu tại `users/{uid}/submissions/{language}_{slug với / → __}`:
`attempts`, `bestScore`, `solved`, `lastStatus`, `lastScore`, `lastSubmittedAt` (cộng dồn qua mọi phiên/thiết bị).

## 3. Kết quả thi (Day 10)

Người 2 gọi khi nộp bài thi (thủ công hoặc hết giờ), `src/services/examService.js`:

```js
import { saveExamResult, getExamHistory } from "../services/examService";

await saveExamResult(user.uid, {
  examId: "cpp-exam-1",       // string
  language: "cpp",            // "cpp" | "python"
  correct: 8, total: 10,      // số nguyên, 0 ≤ correct ≤ total, total > 0
  durationSec: 1234,          // thời gian làm bài thực tế
  autoSubmitted: false,       // true nếu tự nộp khi hết giờ
  chapterIds: ["ch01", "ch02"], // tuỳ chọn
});
// Điểm (%) do saveExamResult tự tính từ correct/total.
const history = await getExamHistory(user.uid, 20); // mới nhất trước
```

Lưu tại `users/{uid}/exams/{autoId}`. Dữ liệu sai sẽ ném lỗi — Người 2 bọc try/catch và báo cho học sinh.

## 4. Gọi backend khi đã deploy

`judgeService.js` và `aiService.js` tự gắn `Authorization: Bearer <Firebase ID token>`
qua `src/services/authHeader.js`. Fetch mới tới `/api/*` cũng nên dùng `authHeaders()`.
