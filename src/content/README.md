# Content Schema

Nội dung mỗi chương được lưu trong một file JSON theo ngôn ngữ:

```text
src/content/
├── cpp/ch01.json
└── python/ch01.json
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

## Quy ước

- ID phải duy nhất trong một chương và dùng tiền tố đúng loại: `theory`, `example`, `quiz`, `practice`, `advanced`.
- Hai phiên bản C++ và Python phải dùng cùng schema cốt lõi.
- Trường bắt buộc luôn tồn tại; dữ liệu không áp dụng dùng `null`, chuỗi rỗng hoặc mảng rỗng tùy kiểu.
- File phải vượt qua kiểm tra `jq empty <file>` trước khi commit.
