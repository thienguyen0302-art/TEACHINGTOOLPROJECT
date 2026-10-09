# Content Schema

## Problem Bank (Phase 1)

Problem Bank độc lập với các bài `practice`/`advanced` trong chapter cũ:

```text
src/content/problems/
├── _template.json
├── ch01/*.json
└── ch02...ch14/       # Có .gitkeep để giữ các thư mục chưa có bài
```

Để thêm bài, sao chép `_template.json` vào thư mục chương, đổi tên file,
đặt `id` và `slug` duy nhất trong toàn bộ bank. `chapterId` phải khớp thư mục.
Slug nên dùng chữ thường không dấu và dấu gạch ngang. Loader trong
`src/services/problemService.js` dùng `import.meta.glob` để tự phát hiện JSON
ở mọi chương; file bắt đầu bằng `_` là template và không được đưa vào danh sách.
Vite tự cập nhật khi phát triển; bản production cần build lại sau khi thêm bài.

| Trường | Kiểu / ý nghĩa |
|---|---|
| `id`, `slug`, `chapterId`, `title` | string; định danh, URL, mã chương, tên bài |
| `type` | string; Phase 1 dùng `coding` |
| `difficulty` | `basic` / `intermediate` / `advanced`; tương đối trong chương |
| `level` | số nguyên dương; cấp độ học tập |
| `tags` | string[] |
| `statement`, `inputDescription`, `outputDescription` | string; văn bản thuần, hỗ trợ xuống dòng |
| `constraints`, `hints` | string[] |
| `samples` | `{ input, output, explanation }[]`; các giá trị là string |
| `starterCode` | `{ cpp: string, python: string }` |
| `solution` | `{ explanation, code: { cpp, python }, complexity: { time, space } }` |
| `aiContext` | `{ objectives: string[], prerequisites: string[], commonMistakes: string[] }` |

Tất cả trường trên có mặt trong mỗi file problem. Xem `_template.json` làm mẫu.
Bank có đủ thư mục `ch01`–`ch14` để đồng bộ curriculum; thư mục chưa có bài
được giữ bằng `.gitkeep`, không cần thêm bài mẫu giả.
`listProblems({ difficulty?, chapterId? })` trả danh sách theo chương và ID;
`getProblemBySlug(slug)` trả bài hoặc `null`. Metadata sai hoặc ID/slug trùng
sẽ báo lỗi kèm đường dẫn file thay vì ghi đè bài.

`/practice` hiển thị danh sách và filter độ khó; `/problem/:slug` hiển thị đề,
ví dụ, gợi ý và Monaco Editor với starter C++/Python. Code nháp và lịch sử
undo/redo riêng cho từng ngôn ngữ, không lưu sau khi rời bài. Component
`src/components/CodeEditor.jsx` nhận `language`, `value`, `onChange`; editor và
worker được bundle cục bộ, không tải từ CDN. `solution` và `aiContext` chỉ là
dữ liệu chuẩn bị cho các phase sau. Chưa có chấm bài, progress hay AI.
Hai route dùng chung yêu cầu đăng nhập/xác minh email/chọn ngôn ngữ hiện có.

**Giới hạn Phase 1:** `solution.code` hiện nằm trong JSON được bundle vào frontend,
chỉ phục vụ Phase 1. Dù UI không hiển thị lời giải, người dùng vẫn có thể đọc code
trong bundle. Trước khi triển khai Judge0 production, phải chuyển `solution.code`
sang backend/private storage và loại khỏi dữ liệu trả về frontend; ẩn trên UI
không bảo vệ được lời giải.

`npm run validate:content` kiểm tra cả curriculum và Problem Bank. Với Bank,
validator kiểm tra mọi field bắt buộc ở bảng trên, kiểu dữ liệu và các field con
của `samples`, `starterCode`, `solution` và `aiContext`; phát hiện `id`/`slug` trùng
trong toàn bộ Bank và `chapterId` không khớp thư mục. `chapterId` chỉ nhận
`ch01`–`ch14`, `type` chỉ nhận `coding`, slug dùng chữ thường/số và gạch ngang,
`difficulty` chỉ nhận ba mức đã khai báo, `level` là số nguyên dương.

Với bài thực tế, các chuỗi bắt buộc phải có nội dung, kể cả code C++/Python;
`constraints` và `samples` có ít nhất một phần tử. Mỗi sample luôn có `input`,
`output`, `explanation` kiểu string (cho phép chuỗi rỗng). `tags`, `hints` và các
mảng trong `aiContext` có thể rỗng; phần tử khi có phải là chuỗi có nội dung.
File JSON bắt đầu bằng `_` được loại khỏi kiểm tra bài thực tế, giống loader;
template được phép giữ code lời giải rỗng để người viết điền sau.

Kiểm tra hồi quy validator bằng `python3 -m unittest discover -s scripts -p 'test_*.py'`.
`--run-code` hiện chỉ thực thi code tham khảo của curriculum, không chạy
`starterCode`/`solution.code` của Bank hoặc code do học sinh nhập.

Nội dung mỗi chương được lưu trong một file JSON theo ngôn ngữ:

```text
src/content/
├── cpp/ch01.json ... ch14.json
└── python/ch01.json ... ch14.json
```

## Chapter

Các trường cấp chương:

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | string | Có | Mã chương, ví dụ `ch01` |
| `title` | string | Có | Tên chương |
| `order` | number | Có | Thứ tự hiển thị |
| `language` | `cpp` \| `python` | Có | Ngôn ngữ của nội dung |
| `description` | string | Có | Mô tả ngắn |
| `objectives` | string[] | Có | Mục tiêu học tập |
| `prerequisites` | string[] | Có | Kiến thức cần có trước |
| `theory` | Theory[] | Có | Các phần lý thuyết |
| `examples` | Example[] | Có | Ví dụ minh họa |
| `quiz` | Quiz[] | Có | Câu hỏi trắc nghiệm |
| `practice` | Problem[] | Có | Bài luyện tập |
| `advanced` | Problem[] | Có | Bài nâng cao |
| `commonMistakes` | object[] | Có | Các lỗi thường gặp |
| `chapterSummary` | string[] | Có | Tóm tắt chương |

Một chương có thể có thêm dữ liệu riêng của ngôn ngữ, chẳng hạn `cppVsPython` trong bài Python. Renderer phải coi các trường không bắt buộc là tùy chọn.

## Theory

Mọi phần tử `theory` có các trường bắt buộc:

```json
{
  "id": "theory01",
  "title": "Biến",
  "content": "...",
  "keywords": ["variable", "datatype"]
}
```

Các trường minh họa như `code`, `output`, `table`, `hsgNote`, `commonMistakes`, `applications` và `template` là tùy chọn.

Các bài hiện có thêm `sections` để triển khai chi tiết theo từng chủ đề, giữ `content` làm đoạn dẫn nhập ngắn:

```json
{
  "sections": [
    { "title": "Hiểu bản chất", "paragraphs": ["Giải thích khái niệm...", "Phân tích ví dụ..."] },
    { "title": "Cách triển khai", "bullets": ["Bước 1...", "Bước 2..."] },
    { "title": "Vì sao đúng", "paragraphs": ["Bất biến hoặc chứng minh..."] }
  ],
  "selfCheck": {
    "question": "Câu hỏi kiểm tra cách hiểu...",
    "answer": "Giải thích để đối chiếu..."
  }
}
```

Mỗi mục lý thuyết có ít nhất ba section có nội dung và câu hỏi tự kiểm tra. Viết nội dung theo chính chủ đề, tránh thêm các đoạn mẫu chung chỉ để tăng độ dài. Mục lục lý thuyết tạo từ các ID; giữ ID ổn định khi sửa bài.

`visualization` là minh họa từng bước được biên soạn cùng bài học, không thực thi code của học sinh:

```json
{
  "visualization": {
    "title": "Tổng tích lũy",
    "description": "Tính 1 + 2",
    "steps": [
      {
        "cells": [{ "label": "sum", "value": "0", "active": true }],
        "explanation": "Khởi tạo tổng bằng 0."
      },
      {
        "cells": [{ "label": "sum", "value": "1", "active": true }],
        "explanation": "Cộng phần tử đầu tiên."
      }
    ]
  }
}
```

Giá trị `value` là chuỗi; `active` đánh dấu ô đang được xét. Mỗi minh họa cần ít nhất một bước và giải thích đúng với code hoặc ghi rõ nếu minh họa thuật toán khác.

Mỗi bước có thể thêm `title`, `formula` và một sơ đồ:

- `array`: `{ "values": ["1", "3", "7"], "activeIndices": [1], "discardedIndices": [], "pointers": [{ "index": 1, "label": "mid" }] }`. Giữ toàn dãy trong từng bước để người học không mất vị trí; chỉ số luôn trong miền.
- `matrix`: `{ "rows": [["i", "0", "1"], ["dp", "1", "1"]], "activeCells": [[1, 2]] }`. Tọa độ bao gồm cả hàng/cột nhãn; dùng `·` cho ô chưa tính.
- `stack`: mảng `{ "label": "fact(4)", "value": "chờ kết quả con", "active": true }`, theo thứ tự từ frame gốc đến frame mới.
- `flow`: mảng `{ "label": "x > 0", "value": "Sai", "active": true }` cho luồng rẽ nhánh.
- `intervals`: `{ "items": [{ "start": 1, "end": 3, "label": "A1" }], "selectedIndices": [0], "rejectedIndices": [], "currentIndex": 0 }`, các mốc không âm, start<end.

Visualizer hỗ trợ chọn trực tiếp từng bước, trước/tiếp, về đầu và tự chạy 2,2 giây mỗi bước. Chuyển bước thủ công dừng chế độ tự chạy; bước cuối dừng tự động. Ô giá trị hiển thị giá trị cũ khi nhãn giữ nguyên và giá trị đổi. Giữ `cells` làm phần theo dõi biến ngay cả khi có sơ đồ.

## Example

Các trường bắt buộc là `id`, `title`, `description`, `difficulty`, `code` và `explanation`. `input`, `output`, `complexity`, `wrongCode`, `correctCode` và `hsgLesson` là tùy chọn; giá trị `null` nghĩa là ví dụ không dùng trường đó.

## Quiz

```json
{
  "id": "quiz01",
  "type": "multiple_choice",
  "difficulty": "basic",
  "tags": ["datatype"],
  "question": "...",
  "choices": ["A", "B", "C", "D"],
  "answer": "A",
  "explanation": "...",
  "betterApproach": "..."
}
```

## Problem

`practice` và `advanced` dùng chung schema:

```json
{
  "id": "practice01",
  "title": "...",
  "difficulty": "basic",
  "tags": ["input", "output"],
  "problem": "...",
  "inputDescription": "...",
  "outputDescription": "...",
  "constraints": [],
  "sampleInput": "...",
  "sampleOutput": "...",
  "hint": "...",
  "answer": null,
  "explanation": "...",
  "betterApproach": "...",
  "complexity": null
}
```

`answer` có thể là `null` đối với bài code được chấm bằng test case. `complexity` có thể là `null` nếu bài không yêu cầu phân tích độ phức tạp.

`solutionCode` là chương trình tham khảo hoàn chỉnh cho đúng ngôn ngữ của chương. Website hiển thị trong phần lời giải có thể mở/đóng; bài tập không tự chấm code trên trình duyệt.

## Các trường mở rộng

- Quiz dạng `output_prediction` có thêm `code` để hiển thị riêng chương trình cần đọc. Đáp án phải là một trong `choices`, so khớp chính xác theo giá trị lựa chọn.
- `references` cấp chương chứa `{ "title": "...", "url": "https://..." }`, hiển thị ở Tổng quan. Ghi nguồn đọc thêm, không sao chép nguyên bài từ nguồn.
- `runnable: true` đánh dấu code hoàn chỉnh dùng trong kiểm tra offline. Với theory/example, so sánh output; với quiz, so sánh answer; với problem, chạy solutionCode cùng sampleInput.
- `testCases` tùy chọn trên problem là mảng `{ "input": "...", "output": "..." }` dùng kiểm tra thêm ca biên. Không thay thế sampleInput/sampleOutput.

## Kiểm tra nội dung

```bash
npm run validate:content
npm run validate:examples
npm run lint
npm run build
```

Hai lệnh validate cần Python 3. Lệnh validate:examples còn cần g++ hỗ trợ C++17. Chương trình kiểm tra chỉ chạy code tham khảo đã lưu trong repository, trong thư mục tạm, với timeout; không chạy code do người học gửi lên.

Các chương 2–14 có ví dụ C++17/Python 3 hoàn chỉnh. Chương 1 giữ cả các snippet để giải thích cú pháp; chỉ code được đánh dấu runnable mới được chạy tự động. Việc kiểm tra output bỏ qua khác biệt whitespace như online judge.

## Quy ước

- ID phải duy nhất trong một chương và dùng tiền tố đúng loại: `theory`, `example`, `quiz`, `practice`, `advanced`.
- Hai phiên bản C++ và Python phải dùng cùng schema cốt lõi.
- Trường bắt buộc luôn tồn tại; dữ liệu không áp dụng dùng `null`, chuỗi rỗng hoặc mảng rỗng tùy kiểu.
- File phải vượt qua kiểm tra `jq empty <file>` trước khi commit.
