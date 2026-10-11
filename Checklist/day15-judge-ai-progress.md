# Day 15 — Judge + AI + Progress Integration

Branch: `feature/judge-ai-progress`, based on latest `dev` commit `ffbee75` (Gemini Day 14). Gemini prerequisite checks test:ai, test:judge, lint and build passed before Day 15 started.

## Architecture and contracts

Judge Submit → buildSubmissionResult → session store/updateSubmissionStats → SubmissionProgress → optional recordSubmissionProgress adapter. Judge snapshot independently feeds AITutorPanel through currentJudgeResult. No automatic AI calls.

Normalized submission:

```js
{
  problemId, slug, chapterId, sourceType, section, language,
  status: 'accepted' | 'attempted', judgeStatus,
  score, passed, total, time, memory, submittedAt
}
```

Problem Bank uses existing problem.id; Lesson uses exercise ID and existing lesson slug. Metrics are maxima across executed tests. Partial/early-stopped results retain the original total. Accepted requires all tests passed; a rounded 100 alone is insufficient. Hidden diagnostics, source, solution and arbitrary extra fields never enter progress. Unknown/inconsistent/internal results are rejected for progress.

Session stats:

```js
{ attempts, bestScore, lastScore, solved, lastStatus }
```

Store key: user/guest + slug + language. Attempts increment only for Submit. CE/RE/WA/TLE count once; Run and Judge transport failures do not count. Best/solved are monotonic. Editing source retains stats and latest normalized submission. Reopening a workspace retains tab-session stats.

Persistence handoff:

```js
{
  problemId, slug, chapterId, sourceType, section, language,
  status, score, passed, total, attempts, bestScore, solved, submittedAt
}
```

Dev1 installs async adapter with setSubmissionPersistenceAdapter(fn), invoked as fn(contract, { uid }). Default is session-only; no new Firestore schema or Dashboard change. Anonymous requests skip persistence. Adapter errors show a non-blocking warning and cannot invalidate Accepted. Late completion cannot replace newer session progress.

## Changes

- src/services/submissionService.js: pure normalized result, stats, contract and stale Judge helper.
- src/services/submissionProgressService.js: session store and optional persistence boundary.
- src/hooks/useSubmissionProgress.js: shared React subscription/orchestration.
- src/components/SubmissionProgress.jsx and .css: compact reusable progress summary.
- src/pages/Problem.jsx and src/components/LessonCodeExercise.jsx: Submit-only recording, summary and shared stale protection.
- src/components/AITutorPanel.jsx: recommended selection changes with current context, no automatic request.
- src/utils/tutorActions.js: tolerate absent fields and require positive total for full Submit acceptance.
- server/submissionProgress.test.js, package.json: test:progress.
- SETUP.md, this checklist: data contracts, adapter setup, validation and limits.

## Verification

All seven required commands PASS: test:ai, test:judge, test:progress (20 cases), validate:content, test:content (13 cases), lint, build.

Progress unit coverage: Run exclusion; WA/CE/RE/TLE attempts; Accepted; monotonic solved/best; latest score/status; bank/practice/advanced metadata; no hidden diagnostics/source/solution in contract; persistence success/failure/anonymous isolation; AI recommendations; stale source/language protection; session retention; late persistence errors; malformed Judge results and rounded scores.

Manual browser checks use real Monaco with mocked Judge/AI/Auth/persistence. No live quota-consuming Judge/Gemini or production Firestore calls in this phase. All browser checks PASS: Run keeps attempts at zero; WA/AC/CE/RE/TLE update attempts; best/solved survive later failures; source edit invalidates AI verdict and preserves stats; language switch restores Monaco draft and stats; no automatic AI calls; AI error leaves Judge/progress working; persistence failure preserves Accepted; Judge error creates no attempt; Practice/Advanced/remount have independent stats; responsive summary fits mobile; no browser errors.

## Limits

- Persistence handoff is implemented, actual per-exercise Firestore/API writes await Dev1's adapter. Existing Quiz persistence is unchanged.
- Stats survive navigation/remount within the tab, not refresh/close; per-language session stats are independent.
- Lifetime aggregate attempts, hydration, idempotency and multi-device merge belong to the persistence adapter.
- Client receives Judge result and supplies AI snapshot; server-attested progress is not production-hardened.
- Existing frontend solution.code production limitation remains; visualization remains AI illustration.
- Existing large Monaco bundle warning remains non-fatal.
- Unrelated user package-lock.json edits are excluded from the commit.
- No Exam Engine, Timer, Dashboard redesign, AI history/auto-call or production auth work.
