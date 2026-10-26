# PeanutCode

Nền tảng ôn luyện **HSG Tin học** bằng **C++** và **Python**: học theo lộ trình 14 chương, chấm code tự động,
gia sư AI gợi ý từng bước (không đưa đáp án), và bảng quản trị cho giáo viên.

## Tính năng chính

**Học sinh**
- Lộ trình 14 chương × 2 ngôn ngữ. Mỗi chương: Tổng quan → Lý thuyết (Self-Check) → Thực hành (Quiz + bài code) → Tổng kết.
- Chấm bài code bằng Judge0, lưu lịch sử nộp, trực quan hóa chạy code từng bước.
- Gia sư AI "gợi ý trước": gợi ý, giải thích lỗi, hỏi ngược... nhưng không trả code hoàn chỉnh, không thấy test ẩn.
- Self-Check lý thuyết: học sinh tự giải thích bằng lời, AI nhận xét (chỉ để tham khảo, không tính điểm).
- Chat Peanut hỏi đáp chung; Contest HSG có đồng hồ, bảng xếp hạng (tắt toàn bộ AI khi thi).

**Giáo viên**
- Quản trị lớp: số chương hoàn thành, % lộ trình, điểm bài tập, chuyên đề yếu, thời gian học, đồng bộ thời gian thực.
- Nhập đề từ PDF (kể cả bản scan) → AI trích đề, sinh lời giải tham chiếu và test; giáo viên duyệt trước khi công khai.
- Lịch sử nộp bài từng học sinh (`/teacher/submissions`), chia 3 nhóm: Lý thuyết (Self-Check), Bài tập (quiz, bài code thực hành/nâng cao/kho bài tập), Contest (từng lần nộp kèm mã nguồn).
- Tổ chức Contest, bài tập tự soạn, duyệt báo lỗi/đánh giá.

## Cách tính tiến độ và điểm (nguồn duy nhất: `src/utils/lessonCompletion.js`, `chapterProgress.js`)

**% hoàn thành chương** (làm đến đâu tính đến đó, chỉ đạt 100 khi đủ mọi phần):

| Phần | Trọng số | Cách tính |
|---|---|---|
| Tổng quan | 10% | đã đọc hết tổng quan |
| Lý thuyết | 20% | 20 × (câu Self-Check đã trả lời / tổng Self-Check) |
| Quiz | 30% | 30 × (câu đã chọn / tổng câu); nộp quiz = đủ 30 |
| Bài code | 30% | 30 × (bài code bắt buộc Accepted / tổng bài bắt buộc) |
| Tổng kết | 10% | đã vào tab Tổng kết |

Chương **hoàn thành** khi đạt 100%. Điểm quiz cao không còn tự đánh dấu hoàn thành chương.

**Điểm chương** = trung bình của (% quiz đúng khi đã nộp) và (% bài code bắt buộc Accepted). Bài HSG nâng cao không tính.

**Trang giáo viên**
- Cột *Tiến độ*: `số chương hoàn thành / tổng số chương` (14).
- Cột *Điểm bài tập*: trung bình điểm các chương đã làm bài (chương mới chỉ xem không bị tính 0 điểm).
- Nút *Quản lý*: % hoàn thành và điểm của từng chương, % cả lộ trình = trung bình % của tất cả chương.

Dữ liệu cũ được tự tính lại một lần mỗi phiên khi học sinh vào hệ thống (`src/services/progressSync.js`).

## Công nghệ

React 19 + Vite · Firebase (Auth, Firestore, Hosting) · Node server (Cloud Run) · Judge0 · OpenAI (Gemini là tùy chọn cũ).

## Chạy thử

```bash
npm install
cp .env.example .env.local      # điền khóa Firebase, Judge0, OpenAI (xem SETUP.md); file này không bị commit
npm run dev                     # web + server chấm bài
```

Chi tiết cài đặt: [SETUP.md](SETUP.md). Triển khai production: [DEPLOY.md](DEPLOY.md).

## Bảo mật khóa API

Khóa OpenAI/Judge0 chỉ nằm ở Secret Manager hoặc `.env.local`, không ghi vào file. Xem mục cuối [DEPLOY.md](DEPLOY.md).
`npm run check:secrets` chạy tự động trước khi build và báo lỗi nếu có khóa trong mã nguồn.

## Kiểm thử

```bash
npm run lint
npm run build                   # tự chạy check:secrets và validate:content trước
node --test server/*.test.js    # test logic server + tiến độ (trừ contestRules)
npm run test:rules              # Firestore rules, cần: firebase emulators:exec --only firestore
```

## Cấu trúc

```
src/content/{cpp,python}/chXX.json   nội dung 14 chương mỗi ngôn ngữ
src/data/curriculum.js               danh sách chương hiển thị
src/utils/chapterProgress.js         đọc tiến độ/điểm dùng chung cho học sinh và giáo viên
src/services/                        Firebase, tiến độ, đồng bộ
server/                              chấm bài (Judge0), AI, contest, nhập PDF
firestore.rules                      phân quyền học sinh / giáo viên
Checklist/                           kế hoạch và nghiệm thu từng hạng mục
```
