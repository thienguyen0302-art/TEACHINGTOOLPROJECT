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
  maxScore: 20,               // tuỳ chọn, điểm tối đa của đề (mặc định 20)
  autoSubmitted: false,       // true nếu tự nộp khi hết giờ
  chapterIds: ["ch01", "ch02"], // tuỳ chọn
});
// Điểm (%) và điểm theo thang của đề (points = correct/total × maxScore) do saveExamResult tự tính.
// Kết quả trả về có rankingError (null nếu bảng xếp hạng đã đồng bộ).
const history = await getExamHistory(user.uid, 20); // mới nhất trước
```

Lưu tại `users/{uid}/exams/{autoId}`. Dữ liệu sai sẽ ném lỗi — Người 2 bọc try/catch và báo cho học sinh.

## 4. Gọi backend khi đã deploy

`judgeService.js` và `aiService.js` tự gắn `Authorization: Bearer <Firebase ID token>`
qua `src/services/authHeader.js`. Fetch mới tới `/api/*` cũng nên dùng `authHeaders()`.

## 5. Bảng xếp hạng đề thi thật (`/ranking`)

`saveExamResult` tự cập nhật `leaderboards/{cpp|python}/entries/{uid}`: mỗi đề chỉ giữ **điểm cao nhất** (`scores[examId]`),
`total` = tổng các đề, `examCount`, `average`. `examId` chỉ gồm chữ, số, `-`, `_` và phải **cố định cho mỗi đề**
(ví dụ `HSG-QN-24`) để thi lại không bị tính thêm.
Dòng xếp hạng chứa tên/trường/lớp/tỉnh của học sinh và **công khai cho mọi người đã đăng nhập**.
Giới hạn hiện tại: điểm do client ghi nên chưa chống gian lận; muốn chặt hơn thì chuyển bước chấm điểm sang backend.

Thử nhanh khi chạy `npm run dev` (Exam chưa xong), trong Console trình duyệt:

```js
await peanutDev.saveExamResult({ examId: "HSG-QN-24", language: "cpp", correct: 18, total: 20, durationSec: 3000 })
```
