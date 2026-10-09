// Dữ liệu tĩnh của giao diện (theo bản thiết kế Figma).
// Khóa ngôn ngữ ở đây là nhãn hiển thị: "C++" | "Python".
// Dùng LANG_BY_KEY để đổi từ giá trị lưu trong Firestore ("cpp" | "python").
export const LANG_BY_KEY = { cpp: "C++", python: "Python" };
export const KEY_BY_LANG = { "C++": "cpp", Python: "python" };

export const languageCourses = {
  "C++": {
    accent: "cpp",
    description: "Lựa chọn phổ biến nhất cho thi học sinh giỏi Tin học.",
    firstLesson: "Nhập xuất cơ bản với cin và cout",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello PeanutCode!";\n}',
  },
  Python: {
    accent: "python",
    description: "Cú pháp sáng rõ, phù hợp để bắt đầu tư duy lập trình.",
    firstLesson: "Làm quen với print và biến",
    code: 'name = "PeanutCode"\nprint("Hello", name)',
  },
};

export const curriculum = {
  "C++": [
    { title: "Nhập xuất, biến và kiểu dữ liệu", description: "Làm quen với cấu trúc chương trình, cin, cout và các kiểu dữ liệu cơ bản.", lessons: 8, exercises: 14, duration: "2 giờ 30 phút" },
    { title: "Phép toán và biểu thức", description: "Toán tử số học, chia nguyên, modulo, ép kiểu và biểu thức trong C++.", lessons: 7, exercises: 18, duration: "2 giờ 15 phút" },
    { title: "Câu lệnh điều kiện", description: "Rèn tư duy rẽ nhánh với if, else và các bài toán điều kiện tổng hợp.", lessons: 9, exercises: 22, duration: "3 giờ" },
    { title: "Vòng lặp", description: "Sử dụng for, while, do-while để giải quyết các bài toán lặp.", lessons: 10, exercises: 28, duration: "3 giờ 30 phút" },
    { title: "Mảng một chiều", description: "Lưu trữ, duyệt, tìm kiếm và xử lý dãy số bằng mảng.", lessons: 11, exercises: 30, duration: "4 giờ" },
    { title: "Xâu ký tự", description: "Xử lý chuỗi, ký tự và các dạng bài toán văn bản phổ biến.", lessons: 9, exercises: 24, duration: "3 giờ 20 phút" },
    { title: "Hàm và đệ quy", description: "Chia nhỏ bài toán bằng hàm và xây dựng tư duy giải bài toán đệ quy.", lessons: 10, exercises: 25, duration: "4 giờ" },
    { title: "Mảng hai chiều", description: "Biểu diễn ma trận và xử lý hàng, cột, đường chéo, miền con.", lessons: 9, exercises: 26, duration: "3 giờ 45 phút" },
    { title: "Sắp xếp và tìm kiếm", description: "Các thuật toán sắp xếp, tìm kiếm nhị phân và ứng dụng thực tế.", lessons: 12, exercises: 32, duration: "4 giờ 30 phút" },
    { title: "Số học và lý thuyết số", description: "Số nguyên tố, ước số, UCLN, BCNN, sàng và modulo.", lessons: 13, exercises: 36, duration: "5 giờ" },
    { title: "Cấu trúc dữ liệu cơ bản", description: "Vector, stack, queue, set, map và cách lựa chọn cấu trúc phù hợp.", lessons: 14, exercises: 35, duration: "5 giờ 30 phút" },
    { title: "Thuật toán nâng cao", description: "Tham lam, quy hoạch động và nhập môn đồ thị cho kỳ thi HSG.", lessons: 16, exercises: 42, duration: "7 giờ" },
  ],
  Python: [
    { title: "Làm quen với Python", description: "Cấu trúc chương trình, print, input và cách chạy đoạn mã Python đầu tiên.", lessons: 7, exercises: 12, duration: "2 giờ" },
    { title: "Biến và kiểu dữ liệu", description: "Số, chuỗi, boolean, chuyển đổi kiểu và biểu thức trong Python.", lessons: 8, exercises: 16, duration: "2 giờ 30 phút" },
    { title: "Câu lệnh điều kiện", description: "Xây dựng chương trình rẽ nhánh bằng if, elif và else.", lessons: 9, exercises: 22, duration: "3 giờ" },
    { title: "Vòng lặp", description: "Lặp với for, while, range và các kỹ thuật kiểm soát vòng lặp.", lessons: 10, exercises: 27, duration: "3 giờ 30 phút" },
    { title: "Danh sách", description: "Lưu trữ, duyệt, cập nhật và xử lý dữ liệu với list.", lessons: 11, exercises: 29, duration: "4 giờ" },
    { title: "Chuỗi ký tự", description: "Các thao tác với string và bài toán xử lý văn bản.", lessons: 9, exercises: 24, duration: "3 giờ 15 phút" },
    { title: "Hàm và phạm vi biến", description: "Tổ chức chương trình bằng hàm, tham số và giá trị trả về.", lessons: 9, exercises: 21, duration: "3 giờ 20 phút" },
    { title: "Tuple, Set và Dictionary", description: "Lựa chọn cấu trúc dữ liệu Python phù hợp với từng bài toán.", lessons: 10, exercises: 25, duration: "3 giờ 45 phút" },
    { title: "Sắp xếp và tìm kiếm", description: "Sort, sorted, key, tìm kiếm nhị phân và các ứng dụng.", lessons: 11, exercises: 30, duration: "4 giờ 15 phút" },
    { title: "Số học và lý thuyết số", description: "Số nguyên tố, ước số, sàng và các bài toán modulo.", lessons: 12, exercises: 34, duration: "4 giờ 45 phút" },
    { title: "Đệ quy và quay lui", description: "Giải bài toán bằng đệ quy, sinh cấu hình và kỹ thuật quay lui.", lessons: 12, exercises: 31, duration: "5 giờ" },
    { title: "Thuật toán nâng cao", description: "Tham lam, quy hoạch động và nhập môn đồ thị bằng Python.", lessons: 16, exercises: 40, duration: "7 giờ" },
  ],
};

