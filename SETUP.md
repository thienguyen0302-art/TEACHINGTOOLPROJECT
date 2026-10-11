# Hướng dẫn chạy project

1. Cài Node.js 20 trở lên (nodejs.org)
2. Clone repo:
   git clone https://github.com/TEN_BAN/hsg-tinhoc.git
   cd hsg-tinhoc
3. git checkout dev
4. npm install
5. Copy `.env.example` thành `.env`, điền 4 giá trị Người 1 gửi riêng
6. npm run dev
7. Mở http://localhost:5173

## Quy tắc Git
- Không code trực tiếp vào main
- Mỗi tính năng một nhánh: git checkout -b feature/ten-feature
- Xong thì merge vào dev, chỉ merge dev vào main khi bản chạy ổn
## Chạy và chấm bài Practice bằng Judge0

Monaco đã được tích hợp trong `/problem/:slug`. Backend Node giữ API key và bộ test chấm trong `server/testcases.json`; trình duyệt chỉ gửi slug, ngôn ngữ và source code.

1. Dùng Node.js 22.9+ và sao chép các biến Judge0 từ `.env.example` vào `.env.local`.
2. Với RapidAPI, điền `JUDGE0_URL`, `JUDGE0_API_HOST`, `JUDGE0_API_KEY`. Với Judge0 tự host, điền URL và token nếu cần, bỏ các biến RapidAPI.
3. Kiểm tra ID ngôn ngữ của instance Judge0 qua `/languages`; mặc định C++ là 54 và Python là 71.
4. Chạy `npm run judge:dev` ở một terminal và `npm run dev` ở terminal khác, mở `http://localhost:5173`.
5. Vào Luyện tập, chọn bài, viết code trong Monaco. **Chạy code** dùng input tự nhập; **Nộp bài** chạy tất cả ví dụ và test riêng, tính điểm bằng tỷ lệ test đạt trên 100.

Kết quả gồm stdout, lỗi biên dịch/chạy, thời gian và bộ nhớ. Test riêng chỉ trả trạng thái và tài nguyên, không trả input/output. So sánh output theo token, bỏ qua khác biệt khoảng trắng. Bộ chấm không kiểm tra cấu trúc code (ví dụ yêu cầu không dùng vòng lặp).

Thêm bài mới cần thêm bộ test có cùng slug vào `server/testcases.json` rồi khởi động lại backend. API từ chối chấm nếu bài chưa có test riêng. Chạy `npm run test:judge` để kiểm tra adapter và logic so sánh.

Backend hiện phục vụ phát triển trên localhost, giới hạn hai yêu cầu đồng thời và thời gian chờ 120 giây. Khi triển khai, cần reverse proxy `/api/judge` tới backend, xác thực Firebase ID token, giới hạn tần suất theo người dùng và bảo vệ quota Judge0. Vite proxy chỉ áp dụng cho `npm run dev`. Không đưa khóa Judge0 vào biến `VITE_*`. Kết quả hiện hiển thị trong phiên mở bài, chưa lưu lịch sử vào Firestore.

### Judge0 Extra CE qua RapidAPI

Nếu đăng ký Judge0 Extra CE, dùng `JUDGE0_URL=https://judge0-extra-ce.p.rapidapi.com` và `JUDGE0_API_HOST=judge0-extra-ce.p.rapidapi.com`. ID ngôn ngữ khác CE: `JUDGE0_CPP_ID=2` (Clang 10.0.1), `JUDGE0_PYTHON_ID=28` (Python 3.10 / PyPy). Điền key riêng trong `.env.local`, rồi khởi động lại `npm run judge:dev`. Header `x-rapidapi-ua` của Playground không cần để chạy backend.

### Khởi động toàn bộ ứng dụng

`npm run dev` khởi động cả backend Judge (cổng 3001) và Vite. Không cần chạy thêm `npm run judge:dev`. Nếu muốn chạy riêng, dùng `npm run judge:dev` và `npm run dev:web` ở hai terminal. Khi backend khởi động lỗi, lệnh dev dừng để hiển thị lỗi.

### Chấm luyện tập trong chương học

Trong mỗi chương C++/Python, phần **Luyện tập** và **Nâng cao HSG** có Monaco, input chạy thử và nút nộp bài. Backend tra bài bằng ngôn ngữ, chương, phần và ID; chỉ chấp nhận ngôn ngữ của chương đó. Điểm dựa trên mẫu và `testCases` của nội dung chương, loại bỏ test trùng. Đây là test công khai phục vụ học tập; bài chỉ có mẫu sẽ được chấm theo mẫu, chưa có test ẩn riêng. Kết quả và bản nháp hiện chỉ giữ khi đang mở phần luyện tập. Khởi động lại `npm run dev` sau khi cập nhật backend.
