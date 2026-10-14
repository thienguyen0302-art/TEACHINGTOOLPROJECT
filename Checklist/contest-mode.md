# Contest Mode + Teacher Problem Authoring

## Repository baseline

On 2026-10-14 remote `main` and `dev` both pointed at `7998a95` (platform PR #12).
Fetched origin, checked out/pulled dev, fast-forward checked against origin/main,
pushed dev (already current), then created `feature/contest-mode` from dev.
The local exam-engine branch was left intact; this feature does not implement quiz exams.

## Architecture and routes

Teacher → visual editor / JSON import → authenticated `/api/authoring` → Firebase Admin repository.
Student → contest workspace → `/api/contest/judge` → verified Firebase uid → Firestore
public problem + private tests → existing Judge0 `executeTest` / `gradeSubmission`
→ atomic submission + scoreboard transaction → public-safe response.

Teacher routes (UI requires `users/{uid}.role === "teacher"`):

- `/teacher`: existing learning dashboard and management links.
- `/teacher/problems`, `/teacher/problems/new`, `/teacher/problems/:problemId/edit`.
- `/teacher/contests`, `/teacher/contests/new`, `/teacher/contests/:contestId/edit`.

Student routes require the existing app login/email-verification gate:

- `/contests`: published contests grouped by computed upcoming/running/ended status.
- `/contest/:contestId`: problem list, personal score, submissions, leaderboard.
- `/contest/:contestId/problem/:problemId`: statement, per-language local drafts, Monaco,
  custom stdin, Run, Submit, existing JudgeResults.
- `/contest/:contestId/scoreboard`: ranking by total descending, last submission ascending,
  then uid for deterministic equal timestamps.

Teacher can monitor participants, all submissions, filter by uid/click student, and review source.
Students query only their own submissions; scoreboard is readable for published contests.
No hints, AI chat, visualization, official solution or betterApproach is mounted in the contest workspace.
Existing Practice/Lesson AI remains unchanged. Statement rendering is shared with Practice.

## Firestore schema

Dates use backend UTC epoch milliseconds, supported alongside Firestore Timestamps by
`toMillis`. The UI displays dates in the browser's local timezone. Server time is authoritative.

| Path | Data | Read boundary | Writes |
| --- | --- | --- | --- |
| `problems/{autoId}` | id, slug, title, difficulty, tags, statement, inputDescription, outputDescription, constraints, samples[{input,output,explanation}], allowedLanguages, starterCode{cpp,python}, published, createdBy, createdAt, updatedAt, lockedUntil | teacher; signed-in student when published | teacher through API/Admin |
| `problemSecrets/{problemId}` | hiddenTests[{input,output}], updatedAt, lockedUntil | teacher via rules/API; Admin backend | teacher through API/Admin |
| `problemSlugs/{slug}` | problemId | Admin only | transaction reserves unique slug |
| `contests/{autoId}` | id, title, description, status=draft/published, startAt, durationMinutes, scoringMode=partial, problems[{problemId,label,points}], createdBy, createdAt, updatedAt | teacher; signed-in student when published | teacher through API/Admin |
| `contests/{id}/submissions/{autoId}` | uid, problemId, language, score, earnedPoints, passed, total, status, time, memory, source, submittedAt | own uid or teacher | Admin only |
| `contests/{id}/scoreboard/{uid}` | uid, displayName, problems{[problemId]:{attempts,bestScore,earnedPoints,accepted,lastStatus}}, totalScore, lastSubmissionAt | teacher; signed-in student for published contest | Admin only |

Public problems are serialized through an explicit nested allowlist. No hidden tests,
solution, credential or arbitrary import field can be copied to public documents.
Hidden tests never enter contest documents, student React state or student API responses.
Source history contains user source and aggregate results, not hidden input/output.

## Teacher authoring

The form supports title, editable generated Vietnamese slug, difficulty, comma-separated tags,
statement, input/output descriptions, constraints, add/remove samples and hidden tests,
C++/Python selection, starter code, draft/published selection, and student-style preview.
Preview omits hidden tests. Saving requires acknowledging the preview; edits reset acknowledgment.
The backend independently validates, checks teacher ownership and reserves slugs in a transaction.

Pure validation: `src/utils/problemAuthoring.js`.
At least one sample is required for any save, and at least one hidden test for publish.
Limits: 10 samples, 50 hidden tests, each input/output 20 KiB UTF-8, statement 100 KB,
other main text fields 20 KB, starter code 50 KB/language. Aggregate hidden-test JSON
is capped at 900 KB to fit Firestore's document limit. Errors identify sample/test index and field.

### JSON import

Download **Tải mẫu JSON** from the editor; its template is also exported as `problemTemplate`.
JSON fields:

```json
{
  "title": "Tổng hai số", "slug": "tong-hai-so", "difficulty": "basic", "tags": ["math"],
  "statement": "Cho a, b. In a + b.",
  "inputDescription": "Hai số nguyên a, b.", "outputDescription": "Tổng a + b.",
  "constraints": ["-10^9 <= a,b <= 10^9"],
  "samples": [{ "input": "2 3", "output": "5", "explanation": "" }],
  "hiddenTests": [{ "input": "0 0", "output": "0" }],
  "allowedLanguages": ["cpp", "python"],
  "starterCode": { "cpp": "", "python": "" }
}
```

File input accepts `.json,application/json`, up to 3 MB. Import only parses/validates/populates
form and opens preview. Imported `published` is always false. There is no implicit request,
save, or publish; the teacher reviews, selects status and clicks **Lưu bài**.
No PDF/Word/OCR processing is included.

## Contest lifecycle and fairness

Builder picks the teacher's own problems and supports up/down reorder, labels A–Z, points,
start time and duration. Server regenerates labels and ignores submitted labels/score mode.
Limits: 1–26 unique problems, 1–10080 whole minutes, 1–10000 whole points/problem.
Publish requires a future start, published problems and existing private tests.

`endAt = startAt + durationMinutes * 60000`; status is calculated from timestamps.
Countdown derives from `Date.now()` each tick; remaining-- is never the authority.
Backend rejects Run/Submit before start and at/after end (403), including manually crafted requests.
A submission admitted before the deadline may complete judging afterward and still count.

On publish, all selected public problems and private secrets are locked through the latest
referencing contest's end. Locked problems cannot be edited. This deliberately also locks
upcoming published contests to prevent unpublish/change-test races. Draft contests do not lock.
Once a published contest starts, its entire configuration is immutable, including after it ends.
Removing problems/unpublishing/rescheduling does not shorten old problem locks; wait for the
previous end or create a new problem. These conservative MVP locks protect overlapping contests.

## Judging and scoring

`POST /api/contest/judge` body: `{contestId, problemId, language, source, mode, stdin}`.
Firebase token/email verification is mandatory even if `REQUIRE_AUTH=false`.
The uid comes exclusively from the verified token. The server fetches contest, public problem
and private secrets, validates membership/time/language/source and checks Judge0 configuration.
No client-provided test, expected output, uid, score, totalScore or accepted flag is trusted.

Run uses custom stdin and `executeTest` and performs no writes, attempts or score updates.
Submit grades public samples + hidden tests using `gradeSubmission`. Hidden results are
re-serialized to `{index, hidden:true, passed, status, time, memory}`. Hidden input, expected,
stdout, stderr, compile output and message are omitted. Public sample diagnostics remain visible.
Existing Judge0 supports Accepted, Wrong Answer, Compilation Error, Runtime Error and Time Limit Exceeded.

`earnedPoints = Math.round(problemPoints * judgeScore / 100)`.
For each student/problem, attempts increase on every completed Submit, bestScore never decreases,
accepted stays true after AC, and earnedPoints derives from the bestScore. Total is the sum of
all problem earnedPoints. No penalty or WA deduction. Source and per-attempt points are stored
in submissions; scoreboard contains best points. Each completed request counts as one attempt;
repeated clicks/HTTP retries are not deduplicated, but concurrent requests cannot lose increments.

Admin `runTransaction` reads the latest scoreboard, checks unchanged published contest config,
and atomically writes one submission + scoreboard. Failed judging writes nothing. There is no
client score write path. UI provides manual refresh rather than polling/WebSockets.

## Firestore rules and Firebase Admin

Rules allow teachers to read public/private data, students to read published problems/contests,
their own submissions and published contest scoreboards. All direct client writes to the new
collections are denied, including teacher SDK writes. Teachers create/update through the
role/ownership-checked API; this is intentionally stricter than allowing browser writes so
unique slugs, publish checks and fairness locks cannot be bypassed. Existing learning rules remain.
`problemSlugs` is private to Admin. No indexes beyond built-in single-field indexes are needed.

`server/firebaseAdmin.js` lazily initializes Admin with Application Default Credentials and
optional FIREBASE_PROJECT_ID; no service-account JSON is used or committed. Cloud Run's service
account needs Firestore data access (e.g. roles/datastore.user). Admin bypasses rules, so both
backend authorization and repository transaction checks are mandatory.
Repository interface: get, list, id, transaction({get,set,delete}). Unit tests inject memory
repositories and Judge providers; no production Firebase/Judge0 call is made.

References: [Admin setup](https://firebase.google.com/docs/admin/setup),
[Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Verification

Passed on 2026-10-14:

- `npm run test:contest`: 23 tests (status/time boundaries, membership/language, run-no-writes,
  partial scoring, monotonic best/accepted, totals/attempts, 20 concurrent submissions, atomic
  conflict failure, verdicts, hidden result redaction, UID/score spoofing, ordering).
- `npm run test:authoring`: 25 tests (validation, invalid/duplicate slug, missing/oversized tests,
  JSON malformed/valid, nested public allowlist, teacher authorization, concurrent uniqueness,
  draft/publish readiness and fairness locks).
- `npm run test:judge`, `test:ai`, `test:progress`, `test:platform`.
- `npm run validate:content`, `test:content`, `lint`, `build`.
- Real HTTP smoke test: unauthenticated `/api/contest/judge` and `/api/authoring` both return 401
  with REQUIRE_AUTH=false (no production provider access). Vite dev proxy requests to both new
  endpoints also return 401; `/api/contest` and `/api/authoring` are explicitly proxied.
- `npm run test:contest:browser`: isolated Chromium fixture, real authoring/judging/scoring logic,
  mocked repository/Judge provider. Form create, add/remove tests, preview/save; template download,
  JSON import draft/save; A/B/C selection, reorder, points, publish; student list, Monaco editing,
  Run, WA then AC, score/history/leaderboard, no secret fields in student responses, no AI mounted.
  No page overflow at 1440, 768 and 390 px; no browser runtime errors.

The browser fixture substitutes users/Firestore and is NOT a real Firebase-login/Judge0 E2E test.
No production account was used. Firestore emulator rules tests were not run (Java/emulator not
installed). Before demo/deploy, manually verify teacher/student login, real Judge0 execution,
student secret read denial and scoreboard write denial against the deployed rules or emulator.
Follow the manual checklists in SETUP.md; do not treat mocked browser checks as proof of deployed IAM/rules.

Browser test setup: `npx playwright install --with-deps chromium`, then
`npm run test:contest:browser`. It starts/stops a localhost-only fixture on port 4178 and writes
screenshots/template under `/tmp/contest-mode-browser` (override CONTEST_BROWSER_ARTIFACTS).
Fixture files are only loaded by the test Vite entry, never by production main.jsx.
PLAYWRIGHT_EXECUTABLE_PATH can select a locally installed Chromium.

## Remaining limitations

- Live Firebase login/IAM/rules and real Judge0 manual acceptance checks remain deployment tasks.
- Existing published problem data is readable before contest start by schema design; hiding the
  workspace before start does not make the published statement secret. Use fresh tasks/scheduling
  operationally if advance problem disclosure matters.
- Lists/history use whole collections and manual refresh; pagination and larger-scale quotas/rate
  limits are future work. The existing process-wide two-active-request limit remains; no distributed quota.
- Firebase and Monaco's existing dependency audit reports advisories; the suggested npm automatic
  fixes change their major versions. No unrelated forced downgrade was made.
- Build retains existing large Monaco/bundle and static/dynamic Firebase import warnings.
- No penalty/freeze/virtual/team contests, custom checkers, interactive/output-only tasks,
  plagiarism/proctoring, AI problem generation, Word/PDF import or live WebSocket infrastructure.
