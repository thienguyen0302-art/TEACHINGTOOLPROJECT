# Lộ trình C++ / Python đến quy hoạch động

Mỗi ngôn ngữ có 14 chương trong thư mục riêng, dùng chung content schema. Nội dung hướng tới lập trình thuật toán và HSG; không phải toàn bộ mọi tính năng của hai ngôn ngữ. Dùng C++17 và Python 3 cho ví dụ mới.

| Chương | Nội dung | Trọng tâm nâng cao | File C++ | File Python |
|---|---|---|---|---|
| 01 | Nhập xuất, biến và kiểu dữ liệu | Tràn biểu thức, số lớn, chia nguyên, fast I/O | [ch01.json](cpp/ch01.json) | [ch01.json](python/ch01.json) |
| 02 | Điều kiện và biểu thức logic | Short-circuit, phân loại trường hợp, tam giác an toàn | [ch02.json](cpp/ch02.json) | [ch02.json](python/ch02.json) |
| 03 | Vòng lặp và mô phỏng | Bất biến, tách chữ số, thay vòng lặp bằng công thức | [ch03.json](cpp/ch03.json) | [ch03.json](python/ch03.json) |
| 04 | Mảng, vector/list và ma trận | Alias, tần suất, đoạn tổng lớn nhất | [ch04.json](cpp/ch04.json) | [ch04.json](python/ch04.json) |
| 05 | Chuỗi và xử lý ký tự | Palindrome, nén đoạn ký tự, giới hạn ASCII/Unicode | [ch05.json](cpp/ch05.json) | [ch05.json](python/ch05.json) |
| 06 | Hàm, đệ quy và quay lui | Call stack, cắt nhánh, sinh chuỗi không chứa 11 | [ch06.json](cpp/ch06.json) | [ch06.json](python/ch06.json) |
| 07 | Độ phức tạp và chọn thuật toán | Tổng số thao tác, bộ nhớ, brute-force oracle | [ch07.json](cpp/ch07.json) | [ch07.json](python/ch07.json) |
| 08 | Sắp xếp và gom nhóm | Comparator, tính ổn định, cặp gần nhất | [ch08.json](cpp/ch08.json) | [ch08.json](python/ch08.json) |
| 09 | Tìm kiếm nhị phân và tìm trên đáp án | Hai biên, đơn điệu, nhà máy sản xuất | [ch09.json](cpp/ch09.json) | [ch09.json](python/ch09.json) |
| 10 | Tổng tiền tố và mảng hiệu | Cập nhật offline, đếm đoạn tổng k có số âm | [ch10.json](cpp/ch10.json) | [ch10.json](python/ch10.json) |
| 11 | Hai con trỏ và cửa sổ trượt | Chứng minh loại đầu, đếm đoạn số dương | [ch11.json](cpp/ch11.json) | [ch11.json](python/ch11.json) |
| 12 | Số học, số nguyên tố và modulo | Sàng, Euclid, lũy thừa nhị phân | [ch12.json](cpp/ch12.json) | [ch12.json](python/ch12.json) |
| 13 | Tham lam và chứng minh lựa chọn | Đổi chỗ, lịch hoạt động, ghép dây tối ưu | [ch13.json](cpp/ch13.json) | [ch13.json](python/ch13.json) |
| 14 | Quy hoạch động từ cơ bản đến HSG | Memoization/tabulation, leo bậc, đổi tiền, ba lô 0/1, LIS, LCS, đường đi lưới | [ch14.json](cpp/ch14.json) | [ch14.json](python/ch14.json) |

## Cách học một chương

1. Đọc mục tiêu và kiến thức cần có trước.
2. Đọc lý thuyết, dự đoán output, rồi chạy ví dụ. Với visualize, dự đoán trạng thái tiếp theo trước khi bấm Bước tiếp.
3. Làm quiz rồi xem giải thích và hướng cải thiện; làm lại nếu còn nhầm.
4. Viết chương trình cho bài luyện tập. Mở gợi ý nếu bí; chỉ mở lời giải sau khi tự thử.
5. Làm bài nâng cao HSG: nêu ý tưởng, chứng minh đúng, phân tích độ phức tạp và thử ca biên.

## Nguồn và cách biên soạn

Tham khảo chủ đề từ [C++ Tutorial](https://www.geeksforgeeks.org/cpp/c-plus-plus/), [Python Tutorial](https://www.geeksforgeeks.org/python/python-programming-language-tutorial/) và [DSA Tutorial](https://www.geeksforgeeks.org/dsa/introduction-to-dsa/) của GeeksforGeeks. Phần tiếng Việt, ví dụ, bài tập và mô phỏng được biên soạn riêng cho website, không phải bản dịch toàn bộ bài GFG. Từng chương có nguồn đọc thêm ở tab Tổng quan.

Đối chiếu ngữ nghĩa với [Python documentation](https://docs.python.org/3/), [C++ working draft](https://eel.is/c++draft/) và [GCC library documentation](https://gcc.gnu.org/onlinedocs/libstdc++/manual/). Tham khảo thêm phân tích thuật toán từ [Algorithms for Competitive Programming](https://cp-algorithms.com/).

HSG ở đây là bài luyện theo kỹ thuật và ràng buộc; không gắn nhãn một kỳ thi hoặc cấp thi cụ thể. Lộ trình kết thúc ở DP, chưa bao gồm đồ thị và cấu trúc dữ liệu nâng cao.
