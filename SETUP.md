# Hướng dẫn chạy project

1. Cài Node.js 22.9 trở lên.
2. Clone `https://github.com/thienguyen0302-art/TEACHINGTOOLPROJECT`, vào thư mục project, checkout `dev` và chạy `npm install`.
3. Copy `.env.example` thành `.env.local`. Điền cấu hình Firebase và key Judge0 của bạn. Không commit file này.
4. Chạy `npm run dev`: lệnh mở cả Node backend Judge và Vite. Mở URL Vite in trong terminal (thường là `http://localhost:5173`).

Nếu muốn chạy riêng, dùng `npm run judge:dev` và `npm run dev:web` trong hai terminal. Không chạy `judge:dev` đồng thời với `dev` vì trùng cổng. Khởi động lại dev sau khi thay cấu hình/backend.

## Quy tắc Git

Cập nhật `dev`, tạo branch tính năng/sửa lỗi từ latest `dev`, merge về `dev` sau kiểm tra; đưa `dev` vào `main` khi bản chạy ổn. Không merge implementation Judge0 cũ `feature/judge0-run` vào bản hiện tại.

## Judge0 development

Mặc định `.env.example` dùng RapidAPI **Extra CE**:

```env
JUDGE0_URL=https://judge0-extra-ce.p.rapidapi.com
JUDGE0_API_HOST=judge0-extra-ce.p.rapidapi.com
JUDGE0_API_KEY=
JUDGE0_CPP_ID=2
JUDGE0_PYTHON_ID=28
```

Điền key có quyền đăng ký đúng API Extra CE. ID 2 là C++ Clang, ID 28 là Python 3.10/PyPy. `x-rapidapi-ua` của Playground không cần. Backend tự gửi Accept, Content-Type và các header xác thực. Không dùng tiền tố `VITE_` cho Judge0 key/token. `.env` và `.env.local` được gitignore.

Nếu tự host, bỏ host/key RapidAPI, điền URL và token nếu instance yêu cầu:

```env
JUDGE0_URL=http://127.0.0.1:2358
JUDGE0_API_HOST=
JUDGE0_API_KEY=
JUDGE0_AUTH_TOKEN=
JUDGE0_CPP_ID=54
JUDGE0_PYTHON_ID=71
```

54/71 chỉ là ví dụ cho Judge0 CE. Kiểm tra **`GET /languages` của instance thực tế** để chọn ID; CE và Extra CE có bộ ID khác nhau.

## Luồng chạy và chấm

React/Monaco → `POST /api/judge` → Node backend → Judge0 → token polling → kết quả chuẩn hóa → giao diện.

Trong Kho bài tập, mở bài, viết C++/Python và nhập input chạy thử. **Chạy code** trả stdout, lỗi biên dịch/chạy, thời gian và bộ nhớ. **Nộp bài** dùng mẫu và test riêng trong `server/testcases.json`, tính tỷ lệ đạt trên 100. Frontend không gửi test chấm tới backend.

Comparator hiện là **token comparison**: bỏ qua khác biệt khoảng trắng, giữ giá trị và thứ tự token; chưa có exact mode hoặc sai số số thực. Bộ chấm không kiểm tra cấu trúc code như yêu cầu không dùng vòng lặp.

Compilation Error dừng Submit ngay để tiết kiệm quota; kết quả ghi `stoppedEarly`, các test còn lại chưa chạy. Wrong Answer tiếp tục chạy để có đủ breakdown. Lỗi infrastructure/internal trả lỗi hệ thống, không trả điểm 0 cho học sinh.

Test ẩn chỉ trả `index`, `hidden`, `passed`, `status`, `time`, `memory`. Không trả input, expected output, stdout, stderr hoặc diagnostics. Thêm bài Problem Bank cần thêm test đúng slug vào `server/testcases.json`, rồi khởi động lại backend. Không đặt test ẩn trong `src` hoặc `public`.

Trong chương C++/Python, cả **Luyện tập** và **Nâng cao HSG** có Monaco, Run và Submit. Backend tra bài theo ngôn ngữ/chương/phần/ID, chấm mẫu và `testCases`, loại test trùng. Các test curriculum là công khai; bài chỉ có mẫu sẽ được chấm theo mẫu, chưa có test ẩn riêng.

## Giới hạn MVP và phase sau

Development backend bind localhost, kiểm tra origin, giới hạn hai request đồng thời, body 100 KB, stdin 10.000 ký tự, timeout 120 giây. Judge0 dùng CPU 2 giây, wall time 5 giây, memory 128.000 KB, giới hạn file output và tắt network. Polling tối đa 60 lần/test.

**Production limitation:** `solution.code` của Problem Bank vẫn nằm trong JSON được bundle vào frontend; lời giải curriculum cũng có sẵn để học tập. Không dùng bản MVP này như hệ thống thi bảo mật. API key, credentials và bộ hidden tests chỉ ở backend.

Kết quả/bản nháp chỉ giữ trong phiên mở bài. Phase sau sẽ làm Firebase ID token verification, per-user rate limit, Firestore submission history và production reverse proxy. Vite dev proxy không phải cấu hình hosting production.

## Kiểm tra Day 13

```bash
npm run test:judge
npm run validate:content
npm run test:content
npm run lint
npm run build
```

## Day 14 — AI Tutor MVP

AI Tutor xuất hiện cạnh JudgeResults trong Problem Bank và Lesson Practice/Advanced. Có bốn thao tác one-shot: gợi ý, giải thích lỗi code, giải thích chưa đúng và phân tích độ phức tạp. Chưa chạy Judge vẫn hỏi gợi ý được. UI ưu tiên lỗi compile/runtime, bài chưa đúng, hoặc complexity khi Accepted; mọi action vẫn do học sinh chọn. AI không submit, không sửa Monaco và không thay đổi điểm Judge0.

Cấu hình **server-only** trong `.env.local`:

```env
AI_API_URL=
AI_API_KEY=
AI_MODEL=
```

`AI_API_URL` là URL đầy đủ của endpoint Chat Completions tương thích (kết thúc bằng `/chat/completions` tùy provider), không phải chỉ base URL. `AI_MODEL` là tên model của provider bạn chọn; không có model mặc định. Adapter gửi Bearer auth và `messages`, nhận `choices[0].message.content`; không yêu cầu native JSON mode. Khi đổi provider khác protocol, thay transport trong `server/aiProvider.js`, UI không đổi. Tham khảo [định dạng Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

Chạy lại `npm run dev` sau cấu hình. Không đặt các biến này dưới prefix `VITE_`; `.env.local`/`.env` không được commit. Chưa cấu hình AI trả HTTP 503 với thông báo rõ, Judge vẫn hoạt động. AI và Judge có bộ đếm concurrency độc lập; AI giới hạn 2 request, timeout 30 giây, body 100 KB và source 50 KB.

React → `POST /api/ai/tutor` → server tra metadata theo slug → `buildTutorContext` → provider adapter → normalized JSON → AITutorPanel. Client không được gửi prompt tùy ý. Context không lấy solution/code chuẩn. Submit chỉ đưa summary pass/total và trạng thái/tài nguyên từng test, không đưa output/diagnostics kể cả client gửi thêm. Public Run có stdout/stderr/compileOutput để giải thích lỗi. Secret không nằm trong prompt. Phản hồi lỗi provider được chuẩn hóa, JSON hỏng có fallback, code block/chương trình hoàn chỉnh dễ nhận biết bị chặn.

Đổi code/ngôn ngữ hủy AI request, xóa feedback cũ và chỉ dùng Judge result nếu khớp snapshot code/ngôn ngữ đã chấm. AI error/loading/retry không thay đổi draft hoặc JudgeResults. Chuyển ngôn ngữ trong Problem Bank vẫn giữ drafts Monaco riêng như trước.

`npm run test:ai` dùng mock provider, không gọi LLM thật. Phải chạy thêm toàn bộ checks Day 13 trước merge. Chất lượng gợi ý và tuân thủ hint-first cần đánh giá với model thực tế; prompt và bộ chặn code đơn giản không phải bảo đảm ngữ nghĩa tuyệt đối. Judge snapshot do client cung cấp, chưa có server-owned submission attestation. Production auth/rate limit/history vẫn để phase sau. Không có chat nhiều lượt, streaming, Firestore conversation, voice hoặc RAG.

### UI Tutor và trực quan hóa code

Chọn một chip hành động rồi bấm nút mũi tên trong panel Peanut AI. Giao diện có composer gọn, lựa chọn đề xuất theo Judge và feedback tách rõ bước tiếp theo. Đây vẫn là request theo action cố định, không phải chat tự do.

Action `visualize` bổ sung minh họa tối đa 16 bước từ code học sinh và **public sample đầu tiên**, gồm dòng đang xét, trạng thái biến, thanh chọn bước và phát/tạm dừng. Chỉ số dòng và cấu trúc step được backend kiểm tra; input/output mẫu lấy từ metadata backend, không lấy từ model. Phản hồi không có bước hợp lệ sẽ báo rõ thay vì crash.

Visualization là **AI illustration**, chưa phải instrumentation/trace thực thi thực tế. Nó không thay đổi Judge verdict và không sử dụng hidden input/output. Cần AI provider cấu hình để tạo các bước; chất lượng minh họa tùy model.
