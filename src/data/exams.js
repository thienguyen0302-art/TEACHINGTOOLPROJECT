// Dữ liệu kho đề thi HSG Tin học (C++ và Python).
// Hợp đồng lưu kết quả: { examId, language, correct, total, durationSec, maxScore: 20, autoSubmitted, chapterIds }

export const EXAMS_DATA = [
  {
    id: "HSG-CPP-01",
    title: "Đề thi thử HSG Tin học C++ — Đề số 1",
    description: "Bộ đề tổng hợp kiến thức nền tảng, kiểu dữ liệu, vòng lặp, xử lý mảng và độ phức tạp thuật toán.",
    language: "cpp",
    durationMinutes: 30,
    maxScore: 20,
    level: "Cơ bản - Trung bình",
    chapterIds: ["ch01", "ch02", "ch03", "ch04", "ch05"],
    questions: [
      {
        id: "q1",
        question: "Trong C++, khi tính giá trị biểu thức `1000000 * 1000000` với hai toán hạng đều là kiểu `int` 32-bit (giới hạn ~2.14 × 10^9), điều gì sẽ xảy ra?",
        choices: [
          "Tự động ép lên long long và cho kết quả 10^12",
          "Tràn số nguyên (Integer Overflow) do tích tính theo kiểu int trước khi gán",
          "Chương trình báo lỗi biên dịch (Compile Error)",
          "Trả về giá trị 0"
        ],
        answer: "Tràn số nguyên (Integer Overflow) do tích tính theo kiểu int trước khi gán",
        explanation: "Trong C++, tích của 2 số `int` được tính theo kiểu `int` trước. Để tránh tràn số, cần viết `1LL * a * b` hoặc ép kiểu một toán hạng thành `long long`."
      },
      {
        id: "q2",
        question: "Đoạn mã sau có thời gian thực thi (Time Complexity) là bao nhiêu?",
        code: "for (int i = 1; i <= n; i++) {\n    for (int j = 1; j <= n; j *= 2) {\n        // O(1) operation\n    }\n}",
        choices: [
          "O(n^2)",
          "O(n log n)",
          "O(log n)",
          "O(n)"
        ],
        answer: "O(n log n)",
        explanation: "Vòng lặp ngoài chạy n lần. Vòng lặp trong mỗi lần j nhân đôi nên chạy log2(n) lần. Tổng độ phức tạp là O(n log n)."
      },
      {
        id: "q3",
        question: "Kỹ thuật Fast I/O thường dùng trong lập trình thi đấu C++ gồm các câu lệnh nào?",
        code: "ios_base::sync_with_stdio(false);\ncin.tie(NULL);",
        choices: [
          "Hủy đồng bộ giữa luồng C I/O (stdio) và C++ stream, đồng thời ngắt liên kết giữa cin và cout",
          "Tăng tốc độ ép xung CPU khi chạy hàm main()",
          "Tự động giải phóng bộ nhớ RAM sau mỗi truy vấn",
          "Bật cờ tối ưu O3 cho trình biên dịch"
        ],
        answer: "Hủy đồng bộ giữa luồng C I/O (stdio) và C++ stream, đồng thời ngắt liên kết giữa cin và cout",
        explanation: "`sync_with_stdio(false)` hủy đồng bộ luồng C/C++ giúp `cin`/`cout` nhanh tương đương hoặc hơn `scanf`/`printf`. `cin.tie(NULL)` ngắt việc flush `cout` mỗi khi gọi `cin`."
      },
      {
        id: "q4",
        question: "Cho mảng `a` có `n` phần tử đã được sắp xếp tăng dần. Thuật toán tìm kiếm nhị phân (Binary Search) có độ phức tạp thời gian tốt nhất và xấu nhất lần lượt là:",
        choices: [
          "O(1) và O(log n)",
          "O(log n) và O(n)",
          "O(1) và O(n)",
          "O(log n) và O(log n)"
        ],
        answer: "O(1) và O(log n)",
        explanation: "Trường hợp tốt nhất tìm thấy ngay ở phần tử giữa mảng: O(1). Trường hợp xấu nhất phải chia đôi không gian tìm kiếm log2(n) lần: O(log n)."
      },
      {
        id: "q5",
        question: "Phép toán `n & (n - 1)` trong xử lý bitwise (với n là số nguyên dương) có tác dụng gì?",
        choices: [
          "Tắt bit 1 nhỏ nhất (phải cùng) của số n",
          "Bật bit 0 nhỏ nhất thành 1",
          "Kiểm tra xem n có phải là số lẻ hay không",
          "Nhân n với 2"
        ],
        answer: "Tắt bit 1 nhỏ nhất (phải cùng) của số n",
        explanation: "Thuật toán Brian Kernighan sử dụng `n & (n - 1)` để tắt bit 1 thấp nhất của n sau mỗi bước, thường dùng để đếm số bit 1 của số nguyên."
      },
      {
        id: "q6",
        question: "Cấu trúc dữ liệu nào trong C++ STL thực hiện việc thêm, xóa và tìm kiếm phần tử với độ phức tạp trung bình O(1)?",
        choices: [
          "std::map",
          "std::set",
          "std::unordered_map",
          "std::priority_queue"
        ],
        answer: "std::unordered_map",
        explanation: "`std::unordered_map` cài đặt dựa trên bảng băm (Hash Table) nên có độ phức tạp trung bình O(1). Trong khi `std::map` dựa trên Red-Black Tree nên có độ phức tạp O(log n)."
      },
      {
        id: "q7",
        question: "Để sắp xếp mảng các cặp số `pair<int, int>` theo thứ tự tăng dần của `first`, nếu `first` bằng nhau thì giảm dần theo `second`, hàm so sánh (comparator) viết đúng là:",
        choices: [
          "bool cmp(pair<int,int> a, pair<int,int> b) { if (a.first != b.first) return a.first < b.first; return a.second > b.second; }",
          "bool cmp(pair<int,int> a, pair<int,int> b) { return a.first < b.first && a.second > b.second; }",
          "bool cmp(pair<int,int> a, pair<int,int> b) { return a.first <= b.first || a.second >= b.second; }",
          "bool cmp(pair<int,int> a, pair<int,int> b) { if (a.first == b.first) return a.first < b.first; return a.second > b.second; }"
        ],
        answer: "bool cmp(pair<int,int> a, pair<int,int> b) { if (a.first != b.first) return a.first < b.first; return a.second > b.second; }",
        explanation: "Hàm so sánh chuẩn strict weak ordering: nếu tiêu chí 1 khác nhau thì so sánh theo tiêu chí 1 (`a.first < b.first`), nếu bằng nhau thì so sánh tiêu chí 2 (`a.second > b.second`)."
      },
      {
        id: "q8",
        question: "Thuật toán Sàng nguyên tố Eratosthenes để tìm tất cả các số nguyên tố không vượt quá N có độ phức tạp thời gian là:",
        choices: [
          "O(N * sqrt(N))",
          "O(N log(log N))",
          "O(N^2)",
          "O(N log N)"
        ],
        answer: "O(N log(log N))",
        explanation: "Tổng số phép toán của Sàng Eratosthenes xấp xỉ N * (1/2 + 1/3 + 1/5 + ...) = O(N log log N), gần như tuyến tính với N."
      },
      {
        id: "q9",
        question: "Trong bài toán mảng cộng dồn (Prefix Sum Array) `prefix[i] = a[1] + ... + a[i]`, tổng đoạn con từ chỉ số L đến R (1-indexed) được tính trong O(1) theo công thức:",
        choices: [
          "prefix[R] - prefix[L - 1]",
          "prefix[R] - prefix[L]",
          "prefix[R + 1] - prefix[L]",
          "prefix[R] + prefix[L - 1]"
        ],
        answer: "prefix[R] - prefix[L - 1]",
        explanation: "Tổng các phần tử a[L] + a[L+1] + ... + a[R] chính bằng tổng từ 1 đến R trừ đi tổng từ 1 đến L-1: `prefix[R] - prefix[L - 1]`."
      },
      {
        id: "q10",
        question: "Khi giới hạn thời gian (Time Limit) là 1.0 giây, một chương trình C++ trên các máy chấm thi thông thường (như VNOJ, Codeforces) có thể thực hiện an toàn tối đa khoảng bao nhiêu phép toán cơ bản?",
        choices: [
          "Khoảng 10^5 phép toán",
          "Khoảng 10^8 phép toán",
          "Khoảng 10^12 phép toán",
          "Không giới hạn số phép toán"
        ],
        answer: "Khoảng 10^8 phép toán",
        explanation: "Kinh nghiệm thi HSG: máy tính chấm thi thực hiện được khoảng 10^8 phép tính cơ bản trong 1 giây. Nếu thuật toán có N = 10^5 mà độ phức tạp O(N^2) thì số phép toán là 10^10 sẽ bị Time Limit Exceeded (TLE)."
      }
    ]
  },
  {
    id: "HSG-PY-01",
    title: "Đề thi thử HSG Tin học Python — Đề số 1",
    description: "Bộ đề tổng hợp kiến thức Python thi HSG: cấu trúc dữ liệu list/dict/set, xử lý chuỗi, đệ quy và tối ưu tốc độ.",
    language: "python",
    durationMinutes: 30,
    maxScore: 20,
    level: "Cơ bản - Trung bình",
    chapterIds: ["ch01", "ch02", "ch03", "ch04", "ch05"],
    questions: [
      {
        id: "py1",
        question: "Trong Python 3, kết quả của phép chia `7 // 2` và `7 / 2` lần lượt là:",
        choices: [
          "3 và 3.5",
          "3.5 và 3",
          "3 và 3",
          "3.5 và 3.5"
        ],
        answer: "3 và 3.5",
        explanation: "Toán tử `//` là phép chia lấy phần nguyên (floor division) trả về kiểu int nếu cả 2 là int. Toán tử `/` là phép chia thực trả về float."
      },
      {
        id: "py2",
        question: "Cấu trúc dữ liệu nào trong Python giúp kiểm tra sự tồn tại của một phần tử (`x in collection`) với thời gian O(1) trung bình?",
        choices: [
          "list",
          "set",
          "tuple",
          "string"
        ],
        answer: "set",
        explanation: "`set` và `dict` trong Python sử dụng bảng băm (Hash Table) nên phép kiểm tra `x in s` mất O(1) trung bình. Trong khi `list` hay `tuple` mất O(n)."
      },
      {
        id: "py3",
        question: "Để đọc dữ liệu nhanh trong bài thi HSG bằng Python với số lượng dòng lớn, cách làm nào tối ưu nhất?",
        code: "import sys\ninput = sys.stdin.readline",
        choices: [
          "Dùng `sys.stdin.readline` thay cho hàm `input()` mặc định",
          "Dùng hàm `eval()` để phân tích dữ liệu",
          "Dùng vòng lặp `while True` với `try...except`",
          "Dùng thư viện `math`"
        ],
        answer: "Dùng `sys.stdin.readline` thay cho hàm `input()` mặc định",
        explanation: "`sys.stdin.readline()` đọc trực tiếp buffer luồng vào mà không xử lý định dạng lời nhắc như `input()`, giúp tăng tốc độ đọc dữ liệu lên gấp 2-5 lần."
      },
      {
        id: "py4",
        question: "Đoạn mã List Comprehension sau tạo ra kết quả gì?",
        code: "res = [x * x for x in range(6) if x % 2 == 1]",
        choices: [
          "[1, 9, 25]",
          "[0, 4, 16]",
          "[1, 4, 9, 16, 25]",
          "[1, 3, 5]"
        ],
        answer: "[1, 9, 25]",
        explanation: "`range(6)` sinh các số 0, 1, 2, 3, 4, 5. Điều kiện `x % 2 == 1` lọc các số lẻ: 1, 3, 5. Bình phương các số này là 1, 9, 25."
      },
      {
        id: "py5",
        question: "Trong Python, giới hạn độ sâu đệ quy mặc định (recursion limit) là bao nhiêu, và hàm nào dùng để tăng giới hạn này?",
        choices: [
          "Mặc định khoảng 1000, tăng bằng `sys.setrecursionlimit()`",
          "Mặc định không giới hạn",
          "Mặc định khoảng 10^6, tăng bằng `os.setlimit()`",
          "Mặc định 100, tăng bằng `time.sleep()`"
        ],
        answer: "Mặc định khoảng 1000, tăng bằng `sys.setrecursionlimit()`",
        explanation: "Python đặt mặc định đệ quy sâu khoảng 1000 tầng để tránh tràn Call Stack. Trong bài thi HSG dùng đệ quy sâu (như DFS), cần gọi `sys.setrecursionlimit(200000)`."
      },
      {
        id: "py6",
        question: "Phương thức `sort()` của danh sách trong Python (Timsort) có độ phức tạp thời gian trường hợp xấu nhất là:",
        choices: [
          "O(n log n)",
          "O(n^2)",
          "O(n)",
          "O(log n)"
        ],
        answer: "O(n log n)",
        explanation: "Timsort (kết hợp Merge Sort và Insertion Sort) đảm bảo thời gian chạy xấu nhất luôn là O(n log n) và tốt nhất là O(n) khi dữ liệu đã gần như được sắp xếp."
      },
      {
        id: "py7",
        question: "Cho xâu `s = 'hsgtin'`. Kết quả của `s[::-1]` là:",
        choices: [
          "'nitgsh'",
          "'hsgtin'",
          "'hsg'",
          "Lỗi Index"
        ],
        answer: "'nitgsh'",
        explanation: "Cú pháp slicing `[start:stop:step]` với `step = -1` là cách đảo ngược xâu ký tự cực kỳ nhanh và ngắn gọn trong Python."
      },
      {
        id: "py8",
        question: "Để sắp xếp danh sách các từ theo độ dài tăng dần, nếu bằng độ dài thì theo thứ tự từ điển, tham số `key` trong hàm `sorted` được viết là:",
        choices: [
          "sorted(words, key=lambda w: (len(w), w))",
          "sorted(words, key=lambda w: len(w) and w)",
          "sorted(words, key=lambda w: [w, len(w)])",
          "sorted(words, key=len)"
        ],
        answer: "sorted(words, key=lambda w: (len(w), w))",
        explanation: "Python hỗ trợ so sánh tuple: tuple `(len(w), w)` sẽ so sánh theo phần tử đầu tiên trước (`len(w)`), nếu bằng nhau sẽ so sánh tiếp phần tử thứ hai (`w`)."
      },
      {
        id: "py9",
        question: "Đoạn code sau xuất ra kết quả gì?",
        code: "d = {'a': 1, 'b': 2}\nprint(d.get('c', 0) + 5)",
        choices: [
          "5",
          "KeyError",
          "0",
          "None"
        ],
        answer: "5",
        explanation: "`d.get('c', 0)` trả về giá trị mặc định là 0 nếu khóa 'c' không tồn tại trong từ điển, tránh gây lỗi `KeyError`. Khi đó 0 + 5 = 5."
      },
      {
        id: "py10",
        question: "Khi làm bài thi HSG bằng Python, nguyên nhân phổ biến nhất khiến code bị TLE (Time Limit Exceeded) khi N = 10^5 là gì?",
        choices: [
          "Sử dụng toán tử `in` trên cấu trúc `list` bên trong vòng lặp",
          "Khai báo quá nhiều biến số thực",
          "Dùng câu lệnh if/else",
          "Tên biến quá dài"
        ],
        answer: "Sử dụng toán tử `in` trên cấu trúc `list` bên trong vòng lặp",
        explanation: "Phép toán `item in my_list` mất O(N). Nếu đặt trong vòng lặp N lần, tổng độ phức tạp thành O(N^2) khiến Python chạy quá thời gian 1 giây. Nên chuyển sang `set` để tra cứu trong O(1)."
      }
    ]
  }
];

export function getExamById(id) {
  return EXAMS_DATA.find((e) => e.id === id) || null;
}

export function listExamsByLang(language) {
  return EXAMS_DATA.filter((e) => e.language === language);
}
