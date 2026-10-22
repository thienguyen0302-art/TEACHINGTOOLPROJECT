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

// Danh sách chương lấy theo đúng nội dung trong src/content/{cpp,python}/chXX.json (14 chương mỗi ngôn ngữ).
// Chương thứ i trong danh sách ứng với file ch{i}.json. lessons = số mục lý thuyết, exercises = bài luyện tập + nâng cao.
export const curriculum = {
  "C++": [
    { title: "Nhập xuất, biến và kiểu dữ liệu", description: "Cấu trúc chương trình C++, nhập xuất, biến, kiểu dữ liệu, phép toán, chia nguyên, modulo và tràn số.", lessons: 19, exercises: 8, duration: "3 giờ 50 phút" },
    { title: "Điều kiện và biểu thức logic", description: "Viết nhánh if/else để phân loại dữ liệu.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Vòng lặp và mô phỏng", description: "Dùng for khi biết số lần lặp, while khi phụ thuộc điều kiện.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Mảng, vector/list và ma trận", description: "Truy cập phần tử theo chỉ số từ 0.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Chuỗi và xử lý ký tự", description: "Duyệt và chuẩn hóa chuỗi.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Hàm, đệ quy và quay lui", description: "Tách công việc thành hàm có hợp đồng rõ ràng.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Độ phức tạp và chọn thuật toán", description: "Phân biệt O(1), O(log n), O(n), O(n log n), O(n²).", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Sắp xếp và gom nhóm", description: "Dùng sort/sorted và comparator hợp lệ.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Tìm kiếm nhị phân và tìm trên đáp án", description: "Tìm vị trí đầu tiên >=x.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Tổng tiền tố và mảng hiệu", description: "Trả lời tổng đoạn sau tiền xử lý.", lessons: 3, exercises: 2, duration: "50 phút" },
    { title: "Hai con trỏ và cửa sổ trượt", description: "Tìm cặp tổng trên dãy đã sắp.", lessons: 3, exercises: 2, duration: "50 phút" },
    { title: "Số học, số nguyên tố và modulo", description: "Dùng gcd/lcm và kiểm tra tràn.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Tham lam và chứng minh lựa chọn", description: "Phân biệt tối ưu cục bộ và tối ưu toàn cục.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Quy hoạch động: từ cơ bản đến HSG", description: "Xác định trạng thái, chuyển trạng thái, cơ sở và thứ tự tính.", lessons: 7, exercises: 5, duration: "2 giờ" },
  ],
  "Python": [
    { title: "Nhập xuất, biến và kiểu dữ liệu", description: "Cấu trúc chương trình Python, nhập xuất, biến, kiểu dữ liệu, phép toán, chia nguyên, modulo và số thực.", lessons: 26, exercises: 10, duration: "5 giờ" },
    { title: "Điều kiện và biểu thức logic", description: "Viết nhánh if/else để phân loại dữ liệu.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Vòng lặp và mô phỏng", description: "Dùng for khi biết số lần lặp, while khi phụ thuộc điều kiện.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Mảng, vector/list và ma trận", description: "Truy cập phần tử theo chỉ số từ 0.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Chuỗi và xử lý ký tự", description: "Duyệt và chuẩn hóa chuỗi.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Hàm, đệ quy và quay lui", description: "Tách công việc thành hàm có hợp đồng rõ ràng.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Độ phức tạp và chọn thuật toán", description: "Phân biệt O(1), O(log n), O(n), O(n log n), O(n²).", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Sắp xếp và gom nhóm", description: "Dùng sort/sorted và comparator hợp lệ.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Tìm kiếm nhị phân và tìm trên đáp án", description: "Tìm vị trí đầu tiên >=x.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Tổng tiền tố và mảng hiệu", description: "Trả lời tổng đoạn sau tiền xử lý.", lessons: 3, exercises: 2, duration: "50 phút" },
    { title: "Hai con trỏ và cửa sổ trượt", description: "Tìm cặp tổng trên dãy đã sắp.", lessons: 3, exercises: 2, duration: "50 phút" },
    { title: "Số học, số nguyên tố và modulo", description: "Dùng gcd/lcm và kiểm tra tràn.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Tham lam và chứng minh lựa chọn", description: "Phân biệt tối ưu cục bộ và tối ưu toàn cục.", lessons: 4, exercises: 2, duration: "1 giờ" },
    { title: "Quy hoạch động: từ cơ bản đến HSG", description: "Xác định trạng thái, chuyển trạng thái, cơ sở và thứ tự tính.", lessons: 7, exercises: 5, duration: "2 giờ" },
  ],
};
