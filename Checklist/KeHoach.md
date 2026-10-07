# Web ôn luyện HSG Tin học THCS (C++ và Python)

Kế hoạch làm web ôn luyện học sinh giỏi Tin học trong 1 tuần, có hai nhánh ngôn ngữ riêng: **C++** và **Python**.

## 1. Kiến trúc tổng thể

Dự án cần backend, vì đăng nhập Gmail, xác thực mail, đổi mật khẩu và lưu phần trăm tiến độ đều không làm được nếu chỉ có HTML thuần. Cách nhanh nhất cho 1 tuần là **Firebase**, vì nó có sẵn các thành phần cần thiết.

| Chức năng | Công cụ |
|---|---|
| Đăng nhập Gmail | Firebase Auth, Google Sign-In |
| Phải xác minh mail mới vào được | Email/Password và `sendEmailVerification()`, chặn vào nếu `emailVerified == false` |
| Sai mật khẩu thì yêu cầu đổi | Bắt lỗi đăng nhập (`auth/invalid-credential`, hoặc `auth/wrong-password` tùy cấu hình Firebase), hiện nút "Quên mật khẩu" gọi `sendPasswordResetEmail()` |
| Lưu % kiến thức, giờ học, chương đã học | Firestore |
| Chatbot hỏi đáp | Cloud Function gọi Claude API (không để API key ở frontend) |
| Chấm bài code (tùy chọn) | Judge0 API |
| Web | React + Vite, deploy bằng Firebase Hosting |

### Cấu trúc dữ liệu Firestore

```
users/{uid}
  language: "cpp" | "python"
  studySeconds: 12345
  chaptersDone: ["ch1", "ch2"]
  progress: { ch1: 85, ch2: 40 }   // % đạt
  examHistory: [{ examId, score, date }]
```

### Cấu trúc nội dung (file JSON, mỗi ngôn ngữ một thư mục)

```
content/cpp/ch01.json
content/python/ch01.json
```

Mỗi chương gồm: `theory`, `examples[]`, `quiz[]` (ôn tập), `practice[]` (áp dụng), `advanced[]` (nâng cao). Mỗi câu có `answer`, `explanation`, `betterApproach`.

## 2. Chương trình học (dừng ở đệ quy, quay lui)

1. Nhập xuất, biến, kiểu dữ liệu
2. Câu lệnh điều kiện
3. Vòng lặp
4. Mảng và xâu
5. Hàm, chương trình con
6. Sắp xếp, tìm kiếm (tìm nhị phân)
7. Số học: ước, BCNN/UCLN, số nguyên tố, sàng
8. Mảng cộng dồn, hai con trỏ
9. Đệ quy
10. Quay lui (sinh hoán vị, tổ hợp, N-Hậu)

## 3. Cách chấm bài

- **Trắc nghiệm, điền kết quả, đọc code đoán output:** so khớp đáp án, chấm ngay ở frontend, hiện Đúng/Sai kèm lời giải và "cách làm tốt hơn".
- **Bài viết code thật (giống đề HSG):** cần Judge0 chạy code với bộ test. Đây là phần khó nhất, nên làm ở ngày 6 hoặc làm bản sau. Tuần đầu ưu tiên dạng đọc code và điền code.
- **Đề thi thử:** đồng hồ đếm ngược, tự nộp khi hết giờ, khóa sửa bài sau khi nộp.

> **Cần chốt:** thi cấp nào (tỉnh, thành phố, lớp mấy) để dựng đúng thời gian và số bài. Đề HSG tỉnh thường khoảng 180 phút, 3 đến 4 bài code, chấm theo test.

## 4. Chuyên biệt cho từng ngôn ngữ

### Nhánh C++

- Judge0 language id: `54` (GCC C++17).
- Highlight bằng Monaco Editor, mode `cpp`.
- Template mặc định:

```cpp
#include <bits/stdc++.h>
using namespace std;
int main(){
    ios::sync_with_stdio(0);
    cin.tie(0);
    return 0;
}
```

- Nội dung cần nhấn mạnh: kiểu `int` và `long long` (tràn số), `scanf`/`cin` nhanh, mảng tĩnh, `vector`, `sort`, đệ quy có giới hạn stack.

### Nhánh Python

- Judge0 language id: `71` (Python 3).
- Monaco mode `python`.
- Template mặc định:

```python
import sys
input = sys.stdin.readline
```

- Nội dung cần nhấn mạnh: đọc input nhanh, list/slice, `sorted`, đệ quy bị giới hạn độ sâu (`sys.setrecursionlimit`), Python chậm hơn nên chú ý độ phức tạp.

Cả hai nhánh dùng chung một code web. Khác nhau duy nhất là thư mục `content/<ngôn ngữ>` và language id khi chấm.

## 5. Kế hoạch 7 ngày

| Ngày | Việc | Kết quả cuối ngày |
|---|---|---|
| 1 | Tạo project Firebase, khởi tạo React + Vite, vẽ màn hình chọn ngôn ngữ (C++/Python), lưu vào `users/{uid}.language` | Chọn được ngôn ngữ |
| 2 | Auth: đăng ký email, gửi mail xác thực, đăng nhập Google, chặn người chưa xác thực, quên mật khẩu, thông báo sai mật khẩu | Đăng nhập hoàn chỉnh |
| 3 | Layout: sidebar chương, trang bài học (lý thuyết + ví dụ). Dùng AI sinh nội dung chương 1 đến 5 cho cả 2 ngôn ngữ ra JSON, người làm đọc lại và sửa | Học được chương 1 đến 5 |
| 4 | Engine câu hỏi: ôn tập, áp dụng, nâng cao. Nộp bài thì hiện Đúng/Sai, đáp án đúng, giải thích, cách cải tiến. Cập nhật % tiến độ vào Firestore. Sinh nội dung chương 6 đến 10 | Làm bài và chấm hoàn chỉnh |
| 5 | Chế độ đề thi thử: đồng hồ đếm ngược, tự nộp, chấm điểm, lưu lịch sử. Soạn 2 đến 3 đề cho mỗi ngôn ngữ | Thi thử đúng format |
| 6 | Chatbot: Cloud Function gọi Claude API, system prompt "Trợ giảng Tin học HSG, ngôn ngữ X, chỉ gợi ý, không giải hộ cả bài". (Tùy chọn: Judge0 cho bài code) | Chatbot chạy được |
| 7 | Dashboard (tổng giờ học bằng bộ đếm giờ lưu mỗi 30 giây, số chương đã học, % từng chương), test toàn bộ, deploy Firebase Hosting | Web chạy trên mạng |

## 6. Mẹo để kịp 1 tuần

- Phần mất thời gian nhất là soạn nội dung: 10 chương x 2 ngôn ngữ. Dùng AI sinh theo mẫu JSON cố định, mỗi chương đủ 1 lý thuyết, 2 ví dụ, 5 câu ôn, 3 bài áp dụng, 2 nâng cao. Người làm chỉ cần kiểm tra đáp án.
- Làm C++ trước, chạy ổn rồi thì Python chỉ là thêm thư mục nội dung.
- Bỏ Judge0 ở tuần 1 nếu chậm tiến độ.