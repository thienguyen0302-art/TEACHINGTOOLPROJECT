# README — Phân chia công việc nhóm 2 người

## Project: Nền tảng ôn luyện HSG Tin học có AI
### Timeline: 18 ngày

> **Mục tiêu:** xây một sản phẩm đủ hoàn chỉnh để demo và nộp cho Ngày hội “Nhà giáo sáng tạo với công nghệ số và trí tuệ nhân tạo năm 2026”.
>
> **Nền tảng nhóm hiện có:** OOP, DSA, C++, Mạng máy tính.
>
> **Nguyên tắc:** không cần hiểu sâu toàn bộ cơ chế React/Firebase/OAuth/Judge0/LLM. Mỗi công nghệ chỉ cần học đủ để tích hợp, debug, giải thích kiến trúc và bảo vệ sản phẩm.

---

# 1. Phân vai tổng thể

## Người 1 — Platform / Firebase / Dashboard Engineer

### Ownership chính

```text
React project structure
Routing
Navbar / Sidebar / Layout
Authentication
Firebase
Firestore
Progress Storage
Student Dashboard
Teacher Dashboard
Deployment
```

### Trách nhiệm

- setup React + Vite;
- routing;
- layout tổng thể;
- Firebase Auth;
- Google Sign-In;
- email/password;
- email verification;
- forgot password;
- auth state;
- Firestore;
- user profile;
- progress storage;
- study time;
- exam history;
- student dashboard;
- teacher dashboard;
- deploy Firebase Hosting.

---

## Người 2 — Core Learning & AI Engineer

### Ownership chính

```text
Content Schema
Content Loader
Lesson Renderer
QuestionCard
Quiz Engine
Grading Engine
Practice Engine
Advanced Engine
Exam Engine
Timer
Auto Submit
Monaco Editor
Judge0 API
AI Tutor
AI Context
Judge + AI Integration
```

### Trách nhiệm

Người 2 **không phải content writer chính**. Content chỉ là dữ liệu đầu vào cho engine.

- thiết kế content schema;
- load chapter từ JSON;
- render theory/example;
- Quiz Engine;
- answer state;
- submit;
- grading;
- score;
- explanation;
- betterApproach;
- Practice/Advanced Engine;
- Exam Engine;
- timer;
- auto-submit;
- review result;
- Monaco Editor;
- Judge0;
- compile/runtime/wrong-answer handling;
- AI Tutor;
- AI context builder;
- Judge0 → AI feedback integration.

---

# 2. Content là tài nguyên chung

Không giao toàn bộ content cho Người 2.

```text
AI sinh draft
    ↓
Hai người review
    ↓
Test đáp án
    ↓
Chuẩn hóa JSON
    ↓
Đưa vào project
```

Ví dụ chia review:

```text
Người 1:
C++ chương 2,4,6,8,10
Python chương 2,4,6,8,10

Người 2:
C++ chương 1,3,5,7,9
Python chương 1,3,5,7,9
```

Mỗi ngày chỉ dành khoảng **30–60 phút** review content. Không dành nguyên ngày để viết nội dung.

---

# 3. Kiến trúc phối hợp

```text
CONTENT JSON
    ↓
NGƯỜI 2
Learning / Quiz / Exam / Judge / AI
    ↓ score, result, progress object
NGƯỜI 1
Firebase / Firestore / Dashboard / Deploy
```

## Contract mẫu

Người 2 trả về:

```js
{
  chapterId: "ch01",
  quizScore: 80,
  correct: 8,
  total: 10
}
```

Người 1 lưu:

```js
saveProgress(uid, chapterId, progressData)
```

---

# 4. MVP

## MVP 0 — Day 2

- React chạy;
- Routing chạy;
- Repo GitHub;
- Firebase project;
- layout cơ bản;
- `ch01.json` mẫu;
- Lesson page đọc được JSON.

## MVP 1 — Day 7

```text
Login
→ Lesson
→ Quiz
→ Result
→ Explanation
→ Progress
```

Phải có:

- 3 chương C++;
- Quiz Engine;
- Grading Engine;
- explanation;
- progress save.

## MVP 2 — Day 11

- Practice;
- Advanced;
- 10 chương C++;
- Exam;
- Timer;
- Auto-submit;
- Exam result/history.

## MVP 3 — Day 15

- Monaco Editor;
- Judge0;
- code execution;
- compile/runtime/wrong-answer handling;
- AI Tutor;
- AI nhận context bài hiện tại;
- Judge0 result → AI.

## MVP 4 — Day 17

- deploy;
- responsive cơ bản;
- account demo;
- demo data;
- không còn bug P0;
- demo flow hoàn chỉnh.

Day 18 chỉ test, sửa lỗi, tài liệu và submit.

---

# 5. Timeline 18 ngày

## Day 0 — Setup

**Cả hai:** clone repo, chạy project, thống nhất branch/folder.

**Người 1:** kiểm tra React/Vite, chuẩn bị Firebase.

**Người 2:** tạo `src/content/cpp`, `src/content/python`, content schema, chapter mẫu.

## Day 1 — Foundation

**Người 1:** React + Vite, Router, Firebase setup.

**Người 2:** hoàn thiện schema, `ch01.json` C++, `ch01.json` Python, `content/README.md`.

## Day 2 — Lesson Renderer

**Người 1:** Navbar, Sidebar, `/lesson/:id`.

**Người 2:**

```text
Lesson.jsx
Content Loader
Theory Renderer
Example Renderer
```

Output:

```text
JSON → Lesson Page
```

## Day 3 — Quiz Engine

**Người 1:** Login UI, Auth basic.

**Người 2:**

```text
QuestionCard.jsx
answer state
select answer
submit
```

## Day 4 — Grading Engine

**Người 1:** Google Sign-In, verify email, forgot password.

**Người 2:**

```text
checkAnswer()
calculateScore()
explanation
betterApproach
```

## Day 5 — Practice / Advanced

**Người 1:** Firestore user + progress schema.

**Người 2:** Practice Engine + Advanced Engine, tái sử dụng grading logic.

## Day 6 — Progress Integration

**Người 1:** save progress, chapter completion, Firestore.

**Người 2:** tạo progress object, gọi progress service, hoàn thiện 3 chương C++.

```text
Người 2 tính score
→ Người 1 lưu Firestore
```

## Day 7 — MVP 1

Cả hai test:

```text
Login → Lesson → Quiz → Result → Progress
```

Không thêm feature nếu flow chưa ổn.

## Day 8 — Content Loader + Dashboard

**Người 1:** Student Dashboard.

**Người 2:**

```text
loadChapter(language, chapterId)
chapter navigation
language switching
```

Review content chương 4–7.

## Day 9 — Exam Engine

**Người 1:** study timer, progress UI.

**Người 2:**

```text
Exam State
answers
current question
submit exam
score exam
```

Review content chương 8–10.

## Day 10 — Exam Timer

**Người 1:** exam integration + result storage.

**Người 2:** countdown, manual submit, auto-submit.

## Day 11 — MVP 2

Cả hai test:

```text
Lesson
→ Quiz
→ Practice
→ Exam
→ Progress
→ Dashboard
```

Có ít nhất 1 đề thi hoàn chỉnh.

## Day 12 — Monaco

**Người 1:** editor/result UI.

**Người 2:** Monaco integration, `studentCode`, language, stdin.

## Day 13 — Judge0

**Người 1:** loading/error/result UI.

**Người 2:**

```text
POST submission
→ token
→ GET result
→ stdout / stderr / status
```

Xử lý:

- compile error;
- runtime error;
- wrong answer;
- time limit.

## Day 14 — AI Tutor

**Người 1:** Chat UI + hỗ trợ Cloud Function.

**Người 2:** system prompt, context builder, chapter/problem/studentCode/judgeResult.

Context tối thiểu:

```json
{
  "language": "cpp",
  "chapter": "...",
  "problem": "...",
  "studentCode": "...",
  "judgeResult": "..."
}
```

## Day 15 — Judge + AI Integration

Flow phải chạy:

```text
Problem
→ Student Code
→ Judge0
→ Result
→ Ask AI
→ Context-aware Hint
```

Người 2 sở hữu logic tích hợp chính.

## Day 16 — Teacher Dashboard / User Test

**Người 1:** Teacher Dashboard, thống kê tiến độ/chương yếu.

**Người 2:** test learning flow, Judge0, AI, demo data và content.

**Cả hai:** user test, bug list, feedback, screenshot.

## Day 17 — Release

Feature freeze.

Chỉ:

- bug fix;
- responsive;
- production data;
- deploy;
- test URL.

Không:

- feature mới;
- đổi framework;
- refactor lớn.

## Day 18 — Submission

```text
[ ] Production hoạt động
[ ] Account demo
[ ] Demo data
[ ] README
[ ] Screenshot
[ ] Video/demo flow
[ ] Mô tả giải pháp
[ ] Test production
[ ] Submit
```

---

# 6. Người 2 học theo timeline

## Day 0–2

```text
JavaScript basics
JSON
React Component
Props
map()
```

Mục tiêu: Lesson Renderer.

## Day 3–5

```text
useState
event handler
conditional rendering
array methods
import/export
```

Mục tiêu: Quiz + Grading.

## Day 8–10

```text
useEffect
setInterval
timer
state management cơ bản
```

Mục tiêu: Exam + Timer.

## Day 12–13

```text
REST API
fetch
async/await
try/catch
HTTP POST/GET
JSON response
```

Mục tiêu: Judge0.

## Day 14–15

```text
Cloud Function cơ bản
LLM API
System Prompt
Context
Request/Response
API secret
```

Mục tiêu: AI Tutor.

---

# 7. Người 1 học theo timeline

## Day 0–4

```text
React
React Router
Firebase Auth
```

## Day 5–9

```text
Firestore
CRUD
progress model
dashboard data
```

## Day 10–16

```text
integration
dashboard
deploy
Firebase Hosting
security rules cơ bản
```

---

# 8. Content workflow

Mỗi chapter mục tiêu:

```text
1 theory
2+ examples
5+ quiz
3+ practice
2+ advanced
```

Workflow:

```text
AI generate → review → test → JSON
```

Content là tài nguyên chung, không phải công việc chính của bất kỳ ai.

---

# 9. Git workflow

```text
main
dev
feature/auth
feature/firestore
feature/lesson
feature/quiz
feature/exam
feature/judge
feature/ai
```

```bash
git checkout dev
git pull
git checkout -b feature/ten-feature

git add .
git commit -m "feat: implement ..."
git push origin feature/ten-feature
```

`feature → dev`; chỉ `dev → main` khi bản chạy ổn.

---

# 10. Definition of Done

```text
[ ] Code chạy
[ ] Không crash flow chính
[ ] Push GitHub
[ ] Merge dev
[ ] Người còn lại chạy được
[ ] Có test case
```

---

# 11. Scope fallback

Nếu tới Day 10 MVP 2 chưa ổn:

Giữ:

```text
C++ only
10 chapters
Lesson
Quiz
Practice
Exam
Progress
AI Tutor
```

Tạm bỏ:

```text
Python đầy đủ
Teacher Dashboard nâng cao
Judge0 multi-test nâng cao
UI animation
```

Một workflow hoàn chỉnh tốt hơn nhiều feature chạy dở.

---

# 12. Thành quả kỹ thuật của từng người

## Người 1

> Implemented authentication, Firestore-based learning progress, student/teacher dashboards, and deployment for an AI-assisted learning platform.

## Người 2

> Implemented lesson rendering, quiz/exam engines, automatic grading, online code execution using Judge0, and context-aware AI tutoring integration.

---

# 13. Quy tắc cuối

```text
Người 1 = Platform + Data
Người 2 = Learning Logic + Judge + AI
```

> **Integration > hiểu sâu công nghệ.**
