# Teacher authoring

## Default teacher workflow: simple manual authoring

The primary **Soạn bài mới** action now opens a single-page editor with three sections: complete problem content, public examples, and private judging tests. Teachers can paste the full statement into one field; separate Input/Output/constraints fields are optional, and empty optional sections are omitted from the student view. New slugs are generated automatically with a short unique suffix. Language/starter-code settings, JSON and PDF/AI import are collapsed under optional tools. No Polygon integration or AI request is required for authoring, saving or publishing.

Drafts require only a title and statement. Publication still uses the existing backend requirements (at least one sample and private test), role checks and active-contest locks. The extra preview/confirmation-checkbox steps have been removed; preview remains available on demand. The library leads with manual creation, while PDF/AI remains under **Công cụ hỗ trợ**.

`npm run test:teacher:simple` checks the manual draft/edit/publish flow, optional sections, private preview, auto slugs, desktop/mobile layout and zero AI requests against a mocked backend. No real records are created.

## Optional AI PDF to contest authoring

The manual editor also offers **Tạo test tự động** in section 3. Teachers enter the statement and at least one nonempty public example, generate up to eight candidate tests (subject to the 50-test limit), review them, then choose **Thêm test vào bài** and explicitly save. Existing private tests are retained; duplicate inputs are skipped when outputs agree and rejected when they conflict. Changes to the statement or examples invalidate pending results. Cancellation and failed generation leave existing tests intact.

`POST /api/teacher/problems/generate-tests` reuses the teacher-only reference execution pipeline described below. Generation itself never writes database records. Only statement context and public examples are sent, excluding existing private tests. `npm run test:test-generation` checks merging and backend validation; `npm run test:teacher:generate` checks errors, cancellation, stale results, explicit application/save and desktop/mobile layouts using mocked providers.

Teacher entry points: `/teacher/problems` and `/teacher/contests` → **Nhập từ PDF**. The previous OCR/heading-regex import has been replaced by native PDF understanding with the existing server-side Gemini provider. PDF.js is used only for local page previews; there is no Tesseract dependency or intermediate raw-text splitting step.

## Workflow

1. Select a PDF (text or scan, up to 20 MB), then choose at most 30 source pages. `/api/teacher/pdf/analyze` validates and physically copies only those pages into a new PDF with pdf-lib before sending inline PDF bytes to Gemini. The dialog explicitly states that selected document pages are sent to Gemini. The original PDF is not persisted as a public attachment.
2. Gemini returns a schema-constrained contest: title, duration, points, complete statements, input/output, constraints, source-page references, original samples and review notes. A second Gemini pass compares the extracted draft against the attached PDF and flags contradictions or unclear output formats. The backend validates it using the same problem validator and removes unexpected model fields. Missing or ambiguous source content is flagged; no extra problems or samples are invented to reach the four-problem minimum.
3. Teachers edit structured fields and compare the original PDF in the same dialog. Changes to statements or samples invalidate generated tests. Source-page indices are mapped back to original PDF page numbers.
4. **AI tạo & kiểm tra bộ chấm** runs per problem or over selected problems. The model supplies two reference Python implementations and new test inputs. Judge0 executes both references against every original sample, then every candidate test. Any runtime failure, sample mismatch or disagreement rejects the entire candidate test set for that problem. Expected outputs come from execution, not from model assertions. Reference sources remain server-side and are not stored in public problem documents. A comparison of two AI references is a useful consistency check, not proof of correctness; teachers review test coverage before publishing.
5. Choose problems, acknowledge review and create the contest. Problems can remain drafts, or teachers can explicitly publish reviewed problems with samples/tests. The contest itself always starts as a draft so its schedule and order can be adjusted before publication. Standard contest publication requires at least four published problems with private tests.
6. `/api/teacher/pdf/import` atomically creates the contest, problems, slug reservations and private tests. A teacher-scoped import key makes retries idempotent, including when the response is lost after a successful commit. Later teacher edits are never overwritten by a retry. The UI opens the created contest editor directly.

Single-problem import into an existing editor is also supported. It replaces the reviewed problem content, samples and tests; language/starter settings are retained.

## Configuration

The existing backend `AI_API_KEY` and `AI_API_URL` are reused. PDF analysis and test generation use `AI_PDF_MODEL` (default `gemini-3.5-flash`), with medium thinking. Tutor chat keeps its existing `AI_MODEL`; the lighter tutor model is not used for document conversion by default. No API key is sent to the browser. Judge0 configuration is required for test preparation, but PDF analysis and draft creation work independently of Judge0.

All three routes require verified Firebase authentication and an existing teacher profile. Input limits, model-output limits, a two-request concurrency cap, timeout and cancellation are enforced. Unexpected provider/database/Judge errors are not reflected with private request data. Unselected PDF pages are not sent to the AI provider.

## Validation

- `npm run test:pdf-import`: synthetic PDF slicing, structured multimodal requests, provider redaction, source normalization, malformed content, teacher permissions, timeout, Judge sample/reference failures, private storage and atomic retry behavior.
- `npm run test:teacher:browser`: desktop/mobile flow using synthetic PDFs and mocked provider/Judge responses; structured editing, generated-test invalidation, cancellation, retries, four-problem contest creation and public-only preview. No real documents are uploaded and no real contests are created.
- Existing authoring, contest and AI tests cover integration regressions.

After document-specific user authorization, a live Gemini trial analyzed page 1 of `Tinhoc_0607.pdf` (Kiên Giang 2006–2007). It recognized the three source problems, two samples per problem, 150 minutes and the 6/8/6 point distribution (stored as 600/800/600). The default Flash-Lite tutor model missed examples or source contradictions in some trials. A separate `gemini-3.5-flash` trial preserved all six examples and flagged the snail task’s odd-N/movement contradiction and ambiguities in Tribonacci output/uniqueness. Flagged problems receive a [CẦN KIỂM TRA] marker; automatic test preparation is blocked until the teacher resolves it. This is evidence for one page, not a guarantee for arbitrary scans. The trial only analyzed the authorized PDF page: it created no Firestore documents and did not publish a contest. Live reference-test generation through Judge0 has not been exercised; its execution and rejection paths are covered with mocks.

The two experimental contests (`kien-giang-hsg-2006-2007-trial`, `kien-giang-round-01`) and their five generated problems were deleted from Firebase at the user's request in the preceding task. No replacements are automatically published by the PDF import flow.

## API not found troubleshooting

`/api/teacher/pdf/analyze`, `/prepare-tests` and `/import` are backend routes. Updating only the frontend leaves an older backend returning 404. On localhost, stop the existing `npm run dev` process and start it again; both `dev` and `judge:dev` now use Node watch mode so later backend edits restart automatically. For Firebase Hosting, `/api/**` is routed to the `peanutcode-api` Cloud Run service in `asia-southeast1`, so that service must also be deployed with the updated source and dependencies. The client reports an outdated backend explicitly when these routes return 404.

`npm run test:pdf-api` exercises the actual HTTP server entry point, verifying that all three routes reach authentication (401 without login), rather than returning 404. It requires local socket access, but sends no PDF, calls no AI service and writes no database records.
