# Contest Mode MVP + Teacher Problem Authoring

## Architecture and integration

Started from `origin/dev` `7998a95`, on `feature/contest-mode`. The subsequent
integration includes `origin/main` `283c204` (Lesson Self-Check, profiles,
notifications, exams and ranking), without redesigning Lesson.

Learning Mode retains its existing Judge/AI/progress services. Contest Mode has
its own authenticated API and authoritative persistence, and reuses
`CodeEditor`, `JudgeResults`, `ProblemStatement`, `executeTest`, `gradeSubmission`
and the existing Firebase token verifier. The existing Exam countdown decrements
local state, so Contest uses a separate timestamp-based clock: interval refreshes
`Date.now()`, remaining = max(0, startAt + durationMinutes * 60000 - now).
The backend independently checks time for every Run/Submit.

`App` lazy-loads Learning workspaces and does not fetch chapter JSON on contest
routes. Contest workspaces never render hints, solution, AI chat, AI visualization
or Peanut AI, including archives. Learning features remain available in Learning
Mode; this is not a browser lockdown or a guarantee against external assistance.

## Teacher authoring

Routes: `/teacher/problems`, `/teacher/problems/new`,
`/teacher/problems/:problemId/edit`. Both route guard and backend require the
Firestore profile `users/{uid}.role == "teacher"`. Client flags never authorize
requests. New API routes always verify Firebase ID tokens and verified email,
even if legacy development Judge uses `REQUIRE_AUTH=false`.

The form supports metadata, statement/input/output/constraints, repeatable sample
and hidden-test fields, languages and starter code, Preview, Save Draft, Publish.
Preview uses only the public serializer and must be opened for the current form
contents before publishing. Private tests are labelled teacher/system-only.

Import JSON uses a file picker, size check, JSON parse and shared pure validation,
then populates the form. It never saves or publishes automatically. The list and
editor provide a downloadable template. Teachers need no Firestore Console edits
for authoring. Slug uniqueness is enforced transactionally via a private registry.

### Import schema

```json
{
  "title": "Tổng hai số",
  "slug": "tong-hai-so",
  "difficulty": "basic",
  "tags": ["math"],
  "statement": "Cho a và b. In tổng.",
  "inputDescription": "Hai số nguyên.",
  "outputDescription": "Một số nguyên.",
  "constraints": ["|a|, |b| <= 1000"],
  "samples": [{ "input": "2 3", "output": "5", "explanation": "" }],
  "hiddenTests": [{ "input": "0 0", "output": "0" }],
  "allowedLanguages": ["cpp", "python"],
  "starterCode": { "cpp": "int main() { return 0; }", "python": "" }
}
```

Use actual JSON newline escapes (`\n`) inside starter code. Official solutions and
arbitrary extra fields are not saved. Difficulty: basic/intermediate/advanced.
At least one public sample and allowed language are required; draft may have no
hidden tests; Publish needs at least one. Caps: 10 samples, 50 private tests,
20 KiB UTF-8 per input/output, 50 KB source, 2 MiB import/request, and 900 KiB per
public/private document to leave Firestore's 1 MiB overhead. Starter code may be
empty. Duplicate slugs return 409.

## Firestore schemas and privacy

- `problems/{id}`: title, slug, difficulty, tags, statement, inputDescription,
  outputDescription, constraints, samples[{input,output,explanation}],
  allowedLanguages, starterCode{cpp,python}, status, createdBy, createdAt, updatedAt.
  Only these public fields are stored; no hidden tests or official solution.
- `problemSecrets/{id}`: hiddenTests[{input,output}], updatedAt. Student read and
  write are denied. Only teacher editor API and teacher rules can read them;
  Admin reads them to judge. Teacher list returns a count, never test content.
- `problemSlugs/{slug}`: problemId. Server-only registry for atomic uniqueness.
- `problemLocks/{id}`: until (Timestamp). Teacher read, server-only write.
- `contests/{id}`: title, description, status, startAt (Timestamp), durationMinutes,
  scoringMode="partial", problems[{problemId,label,points}], createdBy,
  createdAt, updatedAt. No duplicated statement, private tests or solutions.
- `contests/{id}/submissions/{id}`: uid, problemId, language, score (percentage),
  earnedPoints, passed, total, status, time, memory, source, submittedAt.
  Source is for private review; no testcase content/diagnostics are persisted.
- `contests/{id}/scoreboard/{uid}`: uid, displayName, problems map with attempts,
  bestScore, earnedPoints, accepted, lastStatus; totalScore, lastSubmissionAt.

Timestamps are Firestore Timestamps at rest and milliseconds in API JSON.
Students see published contests/problems, leaderboard and their own submissions.
Teachers can review all submissions. No client can write contest submissions or
scoreboard. Profile role escalation rules remain unchanged.

Teacher authoring normally writes through the API. Rules additionally permit
valid unlocked public/secret problem updates by teachers, with a server-managed
slug reservation. Draft contests may be edited directly by teachers; **publish
and edits of published contests require the Admin API**, so no client can bypass
atomic problem-lock creation. Private locks/slug registry cannot be edited by
clients, including teachers.

## Contest lifecycle and teacher builder

Routes: `/teacher/contests`, `/teacher/contests/new`,
`/teacher/contests/:contestId/edit`, `/teacher/contests/:contestId/monitor`.

Choose published problems with private tests, set points, start time and duration,
reorder with up/down, save draft or Publish. Labels A–Z are generated on the
server, not trusted from input. No duplicate problems; 1–26 problems to publish,
positive integer points <=10000, duration 1–1440 minutes, valid start timestamp.
Actual published status and hidden-test existence are rechecked inside the same
Firestore transaction that publishes the contest.

Published contests lock all referenced problems (public content and hidden tests)
**from publish until their latest contest deadline**, including scheduled time.
This is deliberately stricter than locking only while running. Multiple contests
extend the lock to the latest end. Removing a scheduled problem does not shorten
its old lock. Scheduled contests may be edited via API; once a published contest
has started, its configuration stays immutable, including the archive, so historic
scores remain meaningful. Cancelling/unpublishing an upcoming contest may leave
conservative locks until its old deadline.

Student routes: `/contests`, `/contest/:contestId`,
`/contest/:contestId/problem/:problemId`, `/contest/:contestId/submissions`,
`/contest/:contestId/scoreboard`. Phase is computed from start/deadline, never a
client "running" string. Upcoming statements are not returned by the workspace
API. After end, statements, submission history and leaderboard remain readable;
Run/Submit are disabled and also rejected by the backend.

## Judge API, score and transactions

`POST /api/contest/judge` accepts only contestId, problemId, language, source,
mode (`run`/`submit`), stdin. UID comes from the verified token. Client uid,
score, expected outputs, test arrays and contest points are ignored.

The backend verifies published contest, server time, membership, published problem
and language. Run uses only custom stdin and does not write any submission,
attempt or score. Submit reads samples and private tests and reuses the existing
Judge0 grading pipeline. Verdicts remain Accepted/WA/CE/RE/TLE; CE stops early.
Infrastructure failures never award a fake zero or increment attempts.

Hidden result fields are allowlisted: index, hidden, passed, status, time, memory.
Private input, expected output, stdout, stderr, compilation diagnostics and raw
backend errors never appear in a Submit response. Test visibility is derived
from the server-owned public sample count. Public sample diagnostics remain
available as in Learning Mode.

`score = round(passed / total * 100)`;
`earnedPoints = round(serverContestPoints * score / 100)`.
Each completed Submit is a legitimate attempt. Best percentage and earned points
never decrease; accepted is true only when passed==total and never resets.
A single Firestore transaction reads the scoreboard row, merges the new per-problem
state, recalculates the total from that state, creates the private submission and
writes the row. Firestore retries on contention; no client read/set score race.
The admitted server timestamp is stored; a request admitted before the deadline
may finish grading afterwards. Last-submission time is monotonic across completion
order. Ties sort by total descending, lastSubmissionAt ascending, then stable UID.

Teacher monitor polls participants (students with at least one submission), source
history and leaderboard every 10s. Student scoreboards/history poll every 10s;
contest list every 15s. There is no websocket infrastructure.

## Verification

Required commands:

```bash
npm run test:contest
npm run test:authoring
npm run test:lesson
npm run test:ai
npm run test:judge
npm run test:progress
npm run test:platform
npm run validate:content
npm run test:content
npm run lint
npm run build
```

The unit suites use injected repository/Judge doubles; they never call production
Firebase, Judge0 or AI. Authoring covers schema/import/privacy/slug races and
publish locks. Contest covers deadline/membership/language/auth, run isolation,
partial/monotonic scores, hidden result redaction, private history, and concurrent
transaction retries. Existing regression suites cover Learning/Self-Check/AI and
platform progress.

Additional real Firestore Emulator rule/transaction suite:

```bash
npx firebase-tools emulators:exec --only firestore \
  --project demo-peanutcode-contest 'npm run test:rules'
```

Requires Java 21 and emulator download access. It verifies student secret/source
denials, forged writes, role escalation, teacher reads/locks, and concurrent Admin
transactions against real Firestore Emulator. **Not yet executed successfully in
this cloud environment:** Google's emulator download was denied HTTP 403. This is
an explicit pending deployment check; unit transaction doubles do not replace it.

Browser smoke testing uses the actual pages/components and HTTP handler with
mock identities/storage/Judge. It is not a production teacher/student login or
live Judge0/Firestore integration test. Re-run the full manual teacher/student and
DevTools checks from the task against staging after configuring Firebase ADC,
role accounts and Judge0. No service-account JSON is committed.

## Production limitations

- Deployment, live token/role accounts, real Judge0 and staging Firestore security
  checks need the project's credentials and were not executed here.
- New authored contest content is private/public split. Legacy Learning-mode
  curriculum/solutions remain educational public assets; do not reuse them as
  confidential contest tests. A teacher may independently author public material.
- Small-class MVP: list/history/scoreboard queries are not paginated; no per-user
  distributed rate limiting, task queue, idempotency key, resumable jobs or recovery
  after process crash. Two in-flight contest jobs per API process, 120s timeout;
  many long hidden tests can exceed the synchronous request budget. Large workloads
  require a later durable job service. Browser Submit is disabled while pending,
  but legitimate separate backend attempts each count once.
- ADC service account needs Firestore read/write permission. Failures return a
  generic safe service error and do not disclose private data. Monitor backend
  health through platform logs without logging raw tests/source/credentials.
- No plagiarism, anti-cheat, AI-generated problems, document parsing, penalty,
  freeze, virtual/team contest, custom checker, interactive/output-only judging.

### Results recorded before publishing Git commits

- Passed: test:contest (15), test:authoring (12), test:lesson (10), test:ai (22),
  test:judge (9), test:progress (20), test:platform (13), test:content (18).
  Content validation: 28 chapters, 158 quizzes, 76 lesson exercises, 3 static bank
  problems. Lint and production build pass (large-bundle
  warnings remain).
- Chromium HTTP smoke passed for the actual teacher forms, malformed/valid import,
  template download, public preview, draft/publish, 3-problem contest builder and
  reorder; student Run isolation, WA/partial/AC/lower attempts, per-language
  drafts, best-score retention, own submission source, leaderboard, teacher
  monitor, upcoming/ended/invalid routes, and desktop/mobile overflow checks.
  Student API responses were scanned for private test sentinels/hiddenTests and
  solution fields; none were present. Auth, repository and Judge were controlled
  mocks for this smoke, not production services.
- The new main snapshot contained lint errors (unused imports/state/functions,
  empty optional-cache catches and synchronous state reset effects). These were
  corrected without redesigning those pages. AppShell is keyed by UID so the
  per-user notification read state resets safely without a state-setting effect.
- Pending: test:rules and real staging login/Judge0/Firestore integration, for the
  external requirements stated above. No cloud deployment was performed.
