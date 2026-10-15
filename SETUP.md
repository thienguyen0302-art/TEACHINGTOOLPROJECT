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

AI Tutor xuất hiện cạnh JudgeResults trong Problem Bank và Lesson Practice/Advanced. Có năm thao tác one-shot: gợi ý, giải thích lỗi code, giải thích chưa đúng phân tích độ phức tạp và trực quan hóa code. Chưa chạy Judge vẫn hỏi gợi ý được. UI ưu tiên lỗi compile/runtime, bài chưa đúng, hoặc complexity khi Accepted; mọi action vẫn do học sinh chọn. AI không submit, không sửa Monaco và không thay đổi điểm Judge0.

Cấu hình **server-only** trong `.env.local`:

```env
AI_PROVIDER=gemini
AI_API_URL=https://generativelanguage.googleapis.com/v1beta
AI_API_KEY=
AI_MODEL=gemini-3.5-flash-lite
```

Điền Gemini Developer API key trong `.env.local`, không điền key thật vào `.env.example`. Provider mặc định là Gemini native REST: backend gọi `${AI_API_URL}/models/${AI_MODEL}:generateContent` với header `x-goog-api-key`; URL cấu hình là base URL, không phải endpoint OpenAI. Adapter này không hỗ trợ OpenAI runtime.

Dùng `thinkingLevel: minimal`, JSON MIME và output caps: hint 350; explain_error, explain_failure, complexity 450; visualize 1200 token. Không bật Search, code execution, URL context hoặc tools. Xem [Gemini thinking](https://ai.google.dev/gemini-api/docs/generate-content/thinking) và [structured output](https://ai.google.dev/gemini-api/docs/structured-output). Quota free tier phụ thuộc tài khoản/model; 429 báo rõ quota/rate limit, không tự retry gây tốn thêm requests. Phản hồi bị safety block, hết token hoặc không có text được báo lỗi an toàn; JSON nội dung hỏng vẫn có fallback.

Chạy lại `npm run dev` sau cấu hình. Không đặt các biến này dưới prefix `VITE_`; `.env.local`/`.env` không được commit. Chưa cấu hình AI trả HTTP 503 với thông báo rõ, Judge vẫn hoạt động. AI và Judge có bộ đếm concurrency độc lập; AI giới hạn 2 request, timeout 30 giây, body 100 KB và source 50 KB.

React → `POST /api/ai/tutor` → server tra metadata theo slug → `buildTutorContext` → provider adapter → normalized JSON → AITutorPanel. Client không được gửi system prompt; câu hỏi chat được validate theo contract riêng bên dưới. Context không lấy solution/code chuẩn. Submit chỉ đưa summary pass/total và trạng thái/tài nguyên từng test, không đưa output/diagnostics kể cả client gửi thêm. Public Run có stdout/stderr/compileOutput để giải thích lỗi. Secret không nằm trong prompt. Phản hồi lỗi provider được chuẩn hóa, JSON hỏng có fallback, code block/chương trình hoàn chỉnh dễ nhận biết bị chặn.

Đổi code/ngôn ngữ hủy AI request, xóa feedback cũ và chỉ dùng Judge result nếu khớp snapshot code/ngôn ngữ đã chấm. AI error/loading/retry không thay đổi draft hoặc JudgeResults. Chuyển ngôn ngữ trong Problem Bank vẫn giữ drafts Monaco riêng như trước.

`npm run test:ai` dùng mock provider, không gọi LLM thật. Phải chạy thêm toàn bộ checks Day 13 trước merge. Chất lượng gợi ý và tuân thủ hint-first cần đánh giá với model thực tế; prompt và bộ chặn code đơn giản không phải bảo đảm ngữ nghĩa tuyệt đối. Judge snapshot do client cung cấp, chưa có server-owned submission attestation. Production auth/rate limit/history vẫn để phase sau. Chat nhiều lượt trong phiên được mô tả ở phần Trò chuyện bên dưới; không có streaming, Firestore conversation, voice hoặc RAG.

### UI Tutor và trực quan hóa code

Chọn một chip hành động rồi bấm nút mũi tên trong panel Peanut AI. Giao diện có composer gọn, lựa chọn đề xuất theo Judge và feedback tách rõ bước tiếp theo. Đây vẫn là request theo action cố định, không phải chat tự do.

Action `visualize` bổ sung minh họa tối đa 16 bước từ code học sinh và **public sample đầu tiên**, gồm dòng đang xét, trạng thái biến, thanh chọn bước và phát/tạm dừng. Chỉ số dòng và cấu trúc step được backend kiểm tra; input/output mẫu lấy từ metadata backend, không lấy từ model. Phản hồi không có bước hợp lệ sẽ báo rõ thay vì crash.

Visualization là **AI illustration**, chưa phải instrumentation/trace thực thi thực tế. Nó không thay đổi Judge verdict và không sử dụng hidden input/output. Cần AI provider cấu hình để tạo các bước; chất lượng minh họa tùy model.


## Day 15 — Judge + AI + Progress

Submit thành công từ `/api/judge` tạo normalized submission bằng `buildSubmissionResult()` trong `src/services/submissionService.js`. App dùng hai trạng thái `accepted` / `attempted`; `judgeStatus` giữ trạng thái Judge chi tiết. Accepted cần tất cả test đạt, không chỉ score làm tròn bằng 100. `time` / `memory` là giá trị lớn nhất trong các test đã chạy, không phải tổng tài nguyên.

Submission gồm `problemId`, `slug`, `chapterId`, `sourceType` (`problem-bank` / `lesson`), `section` (`null` / `practice` / `advanced`), `language`, `status`, `judgeStatus`, `score`, `passed`, `total`, `time`, `memory`, `submittedAt`. Không có source, test input/output, diagnostics, solution hoặc credentials. Với Problem Bank, `problemId` giữ ID metadata hiện có, `slug` là route; Lesson dùng ID exercise và slug `lesson/<language>/<chapter>/<section>/<id>`.

Progress trong bộ nhớ của tab được phân biệt theo user (hoặc guest), slug và language. Stats gồm `attempts`, `bestScore`, `lastScore`, `solved`, `lastStatus`. Mỗi Submit tăng một attempt, kể cả CE/RE/WA/TLE. Best score chỉ tăng; solved không mất sau lần nộp sai. Run, request Judge thất bại hoặc kết quả Submit không hợp lệ không ghi progress. Đổi source, đổi ngôn ngữ rồi quay lại và mở lại bài trong cùng tab giữ progress; refresh/đóng tab sẽ mất progress phiên. Draft Monaco vẫn theo behavior trước đó.

### Persistence handoff cho Dev1

`src/services/progressService.js` và `useLearningData.js` hiện lưu/read Quiz theo chương; Day 15 không đưa exercise attempts vào dữ liệu đó. Adapter riêng `src/services/submissionProgressService.js` expose `recordSubmissionProgress(submission, stats, options)` và `setSubmissionPersistenceAdapter()`.

Đăng ký một adapter ở app bootstrap khi Dev1 đã chuẩn bị persistence:

```js
setSubmissionPersistenceAdapter(async (contract, { uid }) => {
  await yourExerciseProgressAPI(uid, contract);
});
```

Contract allowlist:

```js
{
  problemId, slug, chapterId, sourceType, section, language,
  status, score, passed, total,
  attempts, bestScore, solved, submittedAt
}
```

Adapter mặc định chưa nối Firestore/API; entry đánh dấu `session-only`. Chưa login thì không gọi persistence. Submit cập nhật progress ngay, không chờ persistence; lỗi adapter chỉ hiện warning không chặn và không đổi Judge verdict. Kết quả persistence cũ không ghi đè stats của lần nộp mới. Adapter Dev1 cần tự quản lý merge/idempotency nếu lưu lâu dài, nhiều tab hoặc nhiều phiên; số attempts/bestScore trong contract hiện là stats của phiên, không phải aggregate Firestore toàn thời gian.

Panel tự đề xuất `explain_error` cho CE/RE, `explain_failure` cho WA/TLE/partial, `complexity` khi tất cả test đạt. Không tự gọi Gemini sau Submit. `currentJudgeResult()` chỉ đưa snapshot vào AI khi source và language vẫn khớp; sửa code giữ progress/lần Submit trước nhưng AI nhận context chưa Judge cho source mới. AI failure không thay đổi progress hoặc kết quả chấm.

```bash
npm run test:ai
npm run test:judge
npm run test:progress
npm run validate:content
npm run test:content
npm run lint
npm run build
```

Tests progress dùng mocks; không gọi Judge0/Gemini/Firestore thật. Không thay đổi Dashboard, Quiz schema, curriculum, Judge hidden-test rule, Gemini transport hoặc visualization. Firebase production hardening và Exam Engine/Timer để phase sau.

## Trò chuyện riêng trong AI Tutor

Mở **Trò chuyện với AI** dưới các action Peanut AI trong Problem Bank hoặc Lesson Practice/Advanced. Nhập câu hỏi, bấm Gửi hoặc Enter; Shift+Enter xuống dòng. Có Dừng trả lời, Thử gửi lại khi lỗi và Cuộc trò chuyện mới. Đóng/mở phần chat giữ hội thoại khi panel vẫn mounted.

Chat gọi cùng `POST /api/ai/tutor` với `action: "chat"`, thêm `message` (tối đa 2000 ký tự) và `history` gồm các cặp `{role: "user" | "assistant", text}`. Backend kiểm tra thứ tự user/assistant, chỉ nhận tối đa 8 messages (4 lượt), tối đa 2500 ký tự/message; không nhận system role, system prompt hay metadata tùy ý. History được đóng gói như dữ liệu không tin cậy trong sanitized context, không thay system instruction. Gemini chat output cap 600 token, thinking minimal, JSON response và normalization/redaction giống các action khác. Không thay cap các action cũ.

Chat vẫn nhận bài, source hiện tại và public Judge snapshot; Submit không mang hidden diagnostics, solution không đi vào context. Có thể hỏi khi chưa viết code. Judge quyết định verdict/điểm; chat không sửa code, tự submit hoặc cập nhật progress. Mỗi câu hỏi cần thao tác gửi của học sinh, không có auto-call. Không bật tools/Search.

UI giữ tối đa 10 lượt để tránh tăng bộ nhớ, chỉ gửi 4 lượt gần nhất cho model. Lịch sử không lưu Firestore/localStorage và mất khi refresh/đóng workspace. Đổi source, ngôn ngữ hoặc Judge result sẽ abort request và reset hội thoại để tránh phân tích code mới bằng context cũ; câu hỏi nháp vẫn giữ. Giới hạn chung AI vẫn là concurrency 2, body 100 KB, source 50 KB, timeout 30 giây. Chat thêm lượt đồng nghĩa thêm requests/quota Gemini. Prompt và bộ chặn full code giữ hint-first nhưng không bảo đảm tuyệt đối chất lượng nội dung của model.

Kiểm tra chat: test:ai gồm 22 cases, bao gồm validate message/history, giữ system policy, không gửi hidden diagnostics/solution, cap chat và frontend allowlist. Các lệnh test:ai, test:judge, test:progress, validate:content, test:content, lint, build đều pass. Browser mock kiểm tra nhiều lượt, history 4 lượt, collapse/open, retry, cancel không gửi lại, reset theo source/language/Judge, hỏi khi chưa có code, mobile và regression quick actions/visualization. Không gọi Gemini thật trong tests.

## Contest Mode + Teacher Authoring

`npm ci` installs the shared Firebase Admin backend dependency. New `/api/teacher/*`,
`/api/contests/*` and `/api/contest/judge` always require a verified Firebase ID token,
including development. Set `FIREBASE_PROJECT_ID` and use ADC (`gcloud auth
application-default login` locally) for the same Firestore project. Never put Admin
credentials under `VITE_*` or commit a service-account JSON file. Existing Judge0
configuration is reused. Vite proxies every `/api` route to port 3001.

Local setup: add `FIREBASE_PROJECT_ID` to `.env.local` with the same value as
`VITE_FB_PROJECT_ID`; the frontend variable alone does not configure the backend.
Run `gcloud auth application-default login` using an account with Firestore access.
From the project root (where `package.json` is located), restart `npm run dev`
after changing `.env.local`. Set `JUDGE_PORT` in `.env.local` to use a different
backend port; Vite proxies all `/api` routes to that port as well.

Teacher accounts (`users/{uid}.role = teacher`) can open **Bài tập tự soạn** and
**Contest HSG**. Create/import a problem, Preview, save/publish, then build and
publish a contest. Student **Contest HSG** is separate from Learning/Exam progress.
See [Checklist/contest-mode.md](Checklist/contest-mode.md) for schemas, locks,
scoring, APIs, regression commands and the pending Firestore Emulator check.
