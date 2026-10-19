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

## 3. Lịch sử nộp bài và Contest HSG

Tính năng Luyện đề HSG trắc nghiệm đã được gỡ. Lịch sử nộp code và contest nằm tại `/submissions` trong `SubmissionHistory.jsx`.
Đường dẫn `/exam-history` chuyển sang `/submissions`; `/exam/*` chuyển sang `/contests`.
Kết quả contest được máy chấm backend lưu qua `/api/contest/judge`; frontend không tự ghi điểm contest.

## 4. Gọi backend khi đã deploy

`judgeService.js` và `aiService.js` tự gắn `Authorization: Bearer <Firebase ID token>`
qua `src/services/authHeader.js`. Fetch mới tới `/api/*` cũng nên dùng `authHeaders()`.

## 5. Bảng xếp hạng Contest (`/ranking`)

`contestRankingService.js` tổng hợp dữ liệu từ scoreboard của từng contest, do backend ghi.
Không còn service ghi kết quả luyện đề hoặc bảng `leaderboards/{lang}/entries` từ client.
Quiz theo chương và tiến độ bài nộp code tiếp tục hoạt động độc lập.
