# ✅ Checklist 18 Ngày — Nền tảng ôn luyện HSG Tin học có AI

> **Project:** Nền tảng ôn luyện HSG Tin học có AI  
> **Timeline:** 18 ngày  
> **Người 1:** Platform / Firebase / Dashboard Engineer  
> **Người 2:** Core Learning & AI Engineer

---

## 📅 Day 0 — Setup

### 👤 Cả hai
- [x] Clone repo
- [x] Chạy project thành công trên máy
- [x] Thống nhất branch/folder convention

### 👤 Người 1
- [x] Kiểm tra React/Vite hoạt động
- [x] Chuẩn bị Firebase project (tạo project trên console)

### 👤 Người 2
- [x] Tạo `src/content/cpp/`
- [x] Tạo `src/content/python/`
- [x] Thiết kế content schema ban đầu
- [x] Tạo chapter mẫu

---

## 📅 Day 1 — Foundation

### 👤 Người 1
- [x] Khởi tạo React + Vite
- [x] Cài đặt React Router (`react-router-dom ^7.18.4`)
- [x] Setup Firebase (init SDK, `firebase ^12.19.0`, `.env` có 4 key)

### 👤 Người 2
- [x] Hoàn thiện content schema
- [x] Viết `ch01.json` cho C++ (876 dòng, đầy đủ theory/examples/quiz/practice/advanced)
- [x] Viết `ch01.json` cho Python (1175 dòng, đầy đủ)
- [x] Viết `content/README.md` (giải thích schema đầy đủ)

---

## 📅 Day 2 — Lesson Renderer *(MVP 0)*

### 👤 Người 1
- [x] Dựng Navbar (`AppShell.jsx`)
- [x] Dựng Sidebar (`AppShell.jsx`)
- [x] Tạo route `/lesson/:id`

### 👤 Người 2
- [ ] Viết `Lesson.jsx` *(file tạo rồi nhưng chưa có code)*
- [ ] Implement Content Loader (đọc JSON)
- [ ] Implement Theory Renderer
- [ ] Implement Example Renderer
- [ ] Verify: JSON → Lesson Page hoạt động

### 🎯 MVP 0 Done
- [x] React chạy
- [ ] Routing chạy *(đang trong feature/router, chưa merge)*
- [x] Repo trên GitHub
- [x] Firebase project tồn tại
- [ ] Layout cơ bản hiển thị
- [x] `ch01.json` mẫu tồn tại
- [ ] Lesson page đọc được JSON

---

## 📅 Day 3 — Quiz Engine

### 👤 Người 1
- [x] Dựng Login UI (form email/password) *(Login.jsx trong feature/auth)*
- [x] Auth basic (Firebase Auth khởi tạo)

### 👤 Người 2
- [ ] Viết `QuestionCard.jsx` *(file tạo rồi nhưng chưa có code)*
- [ ] Implement answer state (useState)
- [ ] Implement chọn đáp án (select answer)
- [ ] Implement nút Submit

---

## 📅 Day 4 — Grading Engine

### 👤 Người 1
- [x] Implement Google Sign-In *(có `signInWithPopup` + GoogleAuthProvider trong feature/auth)*
- [x] Implement email verification *(có `sendEmailVerification` + flow xác minh trong App.jsx)*
- [x] Implement forgot password *(có `sendPasswordResetEmail` trong feature/auth)*

### 👤 Người 2
- [ ] Implement `checkAnswer()` *(grading.js tạo rồi nhưng chưa có code)*
- [ ] Implement `calculateScore()`
- [ ] Hiển thị explanation sau khi submit
- [ ] Hiển thị betterApproach

---

## 📅 Day 5 — Practice / Advanced Engine

### 👤 Người 1
- [x] Thiết kế Firestore schema cho user profile
- [x] Thiết kế Firestore schema cho progress

### 👤 Người 2
- [ ] Implement Practice Engine *(Practice.jsx trống)*
- [ ] Implement Advanced Engine
- [ ] Tái sử dụng grading logic từ Day 4

---

## 📅 Day 6 — Progress Integration

### 👤 Người 1
- [x] Implement save progress lên Firestore (`saveProgress`)
- [x] Implement chapter completion tracking
- [x] Kiểm tra CRUD Firestore hoạt động (Lesson.jsx đã gọi `saveProgress`)

### 👤 Người 2
- [x] Tạo progress object chuẩn: `{ chapterId, quizScore, correct, total }`
- [x] Gọi progress service của Người 1
- [x] Hoàn thiện content 3 chương C++ (quiz đủ đáp án)

### 🔗 Integration checkpoint
- [x] Người 2 tính score → Người 1 lưu Firestore thành công

---

## 📅 Day 7 — MVP 1 ✅

### 👤 Cả hai — Kiểm thử toàn flow
- [x] Login hoạt động
- [x] Vào Lesson hiển thị đúng
- [x] Làm Quiz → Submit
- [x] Xem Result + Explanation
- [x] Progress được lưu
- [x] Không thêm feature nếu flow chưa ổn

### 🎯 MVP 1 Done
- [x] Có ít nhất 3 chương C++ với nội dung đầy đủ (thực tế 14 chương)
- [x] Quiz Engine hoạt động
- [x] Grading Engine hoạt động
- [x] Explanation hiển thị
- [x] Progress save thành công

---

## 📅 Day 8 — Content Loader + Student Dashboard

### 👤 Người 1
- [x] Dựng Student Dashboard (streak/biểu đồ tuần dùng dữ liệu thật)
- [x] Hiển thị danh sách chương + tiến độ từ Firestore

### 👤 Người 2
- [ ] Implement `loadChapter(language, chapterId)`
- [ ] Implement chapter navigation (previous / next)
- [ ] Implement language switching (C++ ↔ Python)
- [ ] Review content chương 4–7

---

## 📅 Day 9 — Exam Engine

### 👤 Người 1
- [x] Implement study timer (thời gian học, theo ngày)
- [x] Dựng progress UI trực quan

### 👤 Người 2
- [x] Implement Exam State (Exam.jsx hoàn chỉnh)
- [x] Quản lý `answers` và `currentQuestion`
- [x] Implement submit exam
- [x] Implement score exam
- [x] Review content chương 8–10

---

## 📅 Day 10 — Exam Timer

### 👤 Người 1
- [x] Tích hợp exam với Firestore (`saveExamResult`)
- [x] Lưu exam history (`getExamHistory`)

### 👤 Người 2
- [x] Implement countdown timer (`useExamTimer` trong `timer.js`)
- [x] Implement manual submit
- [x] Implement auto-submit khi hết giờ

---

## 📅 Day 11 — MVP 2 ✅

### 👤 Cả hai — Kiểm thử toàn flow
- [x] Lesson → Quiz → Practice → Exam → Progress → Dashboard
- [x] Có ít nhất 1 đề thi hoàn chỉnh (C++ và Python)
- [x] Có 14 chương C++ (vượt 10 chương)

### 🎯 MVP 2 Done
- [x] Practice Engine hoạt động
- [x] Advanced Engine hoạt động
- [x] 10 chương C++ đầy đủ (thực tế 14 chương)
- [x] Exam hoạt động với timer
- [x] Auto-submit hoạt động
- [x] Exam result/history hiển thị

---

## 📅 Day 12 — Monaco Editor

### 👤 Người 1
- [ ] Dựng Editor UI (layout trang code)
- [ ] Dựng Result UI (hiển thị output)

### 👤 Người 2
- [ ] Tích hợp Monaco Editor vào project *(CodeEditor.jsx tạo rồi nhưng chưa có code)*
- [ ] Bind `studentCode` với editor
- [ ] Cấu hình language selector
- [ ] Cấu hình stdin input

---

## 📅 Day 13 — Judge0 Integration

**DAY 13 — JUDGE0 MVP = DONE**

Kiểm tra API thật và các giới hạn MVP: xem [báo cáo Day 13](day13-judge0-finalization.md). Production hardening để phase sau.

### 👤 Người 1
- [x] Dựng loading state UI
- [x] Dựng error state UI
- [x] Dựng result display UI

### 👤 Người 2
- [x] Implement POST submission lên Judge0
- [x] Lấy token từ response
- [x] Implement GET result theo token
- [x] Parse stdout / stderr / status
- [x] Xử lý compile error
- [x] Xử lý runtime error
- [x] Xử lý wrong answer
- [x] Xử lý time limit exceeded

---

## 📅 Day 14 — AI Tutor

### 👤 Người 1
- [ ] Dựng Chat UI *(AIChat.jsx tạo rồi nhưng chưa có code)*
- [ ] Hỗ trợ setup Cloud Function (nếu cần)

### 👤 Người 2
- [ ] Viết system prompt cho AI Tutor *(aiService.js trống)*
- [ ] Implement context builder
- [ ] Context đủ 5 trường: `language`, `chapter`, `problem`, `studentCode`, `judgeResult`
- [ ] Gọi LLM API thành công

---

## 📅 Day 15 — Judge + AI Integration *(MVP 3)*

### 👤 Cả hai — Kiểm thử flow tích hợp
- [ ] Problem → Student Code → Judge0 → Result → Ask AI → Hint hiển thị

### 👤 Người 2 (lead integration)
- [ ] Judge0 result truyền sang AI context
- [ ] AI trả về hint phù hợp ngữ cảnh
- [ ] Không crash khi Judge0 lỗi

### 🎯 MVP 3 Done
- [ ] Monaco Editor hoạt động
- [ ] Judge0 chạy được code
- [ ] AI Tutor nhận context và trả hint
- [ ] Full flow Judge → AI chạy

---

## 📅 Day 16 — Teacher Dashboard + User Test

### 👤 Người 1
- [x] Dựng Teacher Dashboard (`/teacher`)
- [x] Thống kê tiến độ học sinh
- [x] Hiển thị chương yếu của từng học sinh

### 👤 Người 2
- [ ] Test toàn bộ learning flow
- [ ] Test Judge0 edge cases
- [ ] Test AI Tutor với nhiều loại context
- [ ] Chuẩn bị demo data và nội dung demo

### 👤 Cả hai
- [ ] User test (tự dùng như người học)
- [ ] Lập bug list
- [ ] Thu thập feedback
- [ ] Chụp screenshot sản phẩm

---

## 📅 Day 17 — Release / Feature Freeze *(MVP 4)*

> ⚠️ **Không thêm feature mới, không đổi framework, không refactor lớn**

### 👤 Cả hai
- [ ] Fix bug list từ Day 16
- [ ] Đảm bảo responsive cơ bản (mobile/tablet)
- [ ] Chuẩn bị production data
- [ ] Deploy lên Firebase Hosting
- [ ] Test URL production

### 🎯 MVP 4 Done
- [ ] Deploy thành công
- [ ] Responsive cơ bản OK
- [ ] Account demo tạo sẵn
- [ ] Demo data đầy đủ
- [ ] Không còn bug P0
- [ ] Demo flow hoàn chỉnh từ đầu đến cuối

---

## 📅 Day 18 — Submission

### 👤 Cả hai
- [ ] Production hoạt động ổn định
- [ ] Account demo sẵn sàng
- [ ] Demo data không bị mất
- [ ] README viết đầy đủ
- [ ] Screenshot sản phẩm đủ bộ
- [ ] Video / demo flow quay xong
- [ ] Mô tả giải pháp kỹ thuật hoàn chỉnh
- [ ] Test lần cuối trên production URL
- [ ] **Submit** ✅

---

## 📊 Definition of Done (cho mỗi feature)

- [ ] Code chạy không lỗi
- [ ] Không crash flow chính
- [ ] Đã push lên GitHub
- [ ] Đã merge vào `dev`
- [ ] Người còn lại chạy được trên máy của họ
- [ ] Có ít nhất 1 test case

---

## 🛡️ Scope Fallback (nếu MVP 2 chưa ổn vào Day 10)

### Giữ lại
- [ ] C++ only (bỏ Python đầy đủ)
- [ ] 10 chapters C++
- [ ] Lesson + Quiz + Practice + Exam + Progress
- [ ] AI Tutor

### Tạm bỏ
- [ ] Python đầy đủ
- [ ] Teacher Dashboard nâng cao
- [ ] Judge0 multi-test nâng cao
- [ ] UI animation

> 💡 Một workflow hoàn chỉnh tốt hơn nhiều feature chạy dở.
