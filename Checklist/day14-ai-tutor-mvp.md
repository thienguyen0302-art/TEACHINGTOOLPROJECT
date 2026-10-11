# Day 14 — AI Tutor MVP

Implementation branch: `feature/ai-tutor`, updated from `dev` Day 13 commit `7d005ef`. No changes to Day 15, Quiz, Dashboard, Monaco implementation, Judge adapter/grading or curriculum/Problem Bank schemas.

## Implementation

- `server/aiTutor.js`: server-owned hint-first system prompt, backend problem lookup, explicit context allowlist, Judge sanitizer, action/source validation, HTTP handler.
- `server/aiProvider.js`: isolated one-shot Chat Completions-compatible provider adapter, structured/text normalization, malformed-output fallback, normalized provider errors, secret redaction and obvious complete-code blocker.
- `server/index.js`: dispatch `/api/ai/tutor` before Judge-specific availability/concurrency checks, preserving origin/localhost protections and existing Judge path.
- `src/services/aiService.js`: only calls backend, strips all Submit diagnostics before sending, supports AbortController.
- `src/components/AITutorPanel.jsx` and CSS: four action buttons, recommended action, loading/error/retry, contextual feedback, cancellation on source/language/result changes.
- `src/utils/tutorActions.js`: pure Judge-aware action selection.
- `src/pages/Problem.jsx`, `src/components/LessonCodeExercise.jsx`: additive panel next to JudgeResults; record judged source to avoid applying an old Judge verdict to changed code. Editor/draft ownership unchanged.
- `vite.config.js`: AI route proxy to existing Node service.
- `.env.example`, `SETUP.md`: server-side AI configuration and limitations.
- `server/aiTutor.test.js`, `package.json`: mocked tests and `npm run test:ai`.

## Privacy and independence

Context selects metadata, public samples, concepts/objectives/prerequisites/common mistakes, student source and a public Judge snapshot. Neither backend solutions nor hidden test files are passed to model. Submit only carries pass/total plus allowlisted test statuses and metrics; no input, expected output, stdout, stderr, compileOutput or message. Public Run diagnostics are allowed. Unknown client prompt fields/actions are rejected; no user-defined system prompt.

AI has independent concurrency (2), timeout (30 s), body (100 KB) and source (50 KB) limits. No AI result mutates code, Judge results or scores. No multi-turn history, Firestore, streaming, voice, RAG or automatic submission.

## Verification

| Check | Result |
| --- | --- |
| `npm run test:ai` | PASS — mock provider only |
| `npm run test:judge` | PASS |
| `npm run validate:content` | PASS |
| `npm run test:content` | PASS — 13 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS — existing bundle-size warning |

HTTP integration checks used the real Node routes with a local mock LLM HTTP endpoint. No real LLM API was called:

- Before Run → Hint returns structured feedback.
- C++ CE includes public compiler diagnostics in context.
- Python RE includes public runtime diagnostics in context.
- Wrong Answer and partial Submit retain Judge status/counts without hidden data.
- Accepted → complexity request; mock feedback trusts Judge.
- Lesson Practice and Advanced both resolve context and return feedback.
- AI unconfigured → HTTP 503; real Judge0 Run returns Accepted/output 5 and Submit returns 100/100.
- Judge unconfigured → HTTP 503 for Judge; mock AI Hint still HTTP 200.

Unit tests cover validation, solution/hidden-data exclusion, token statuses, malformed responses, provider/network/timeout errors, retryable frontend errors, cancellation signal, action recommendations and HTTP request limits.

## Verification limits and follow-up

No configured real AI provider/model was available; pedagogical quality, model behavior on CE/RE/WA/TLE and adherence to hint-first remain to be evaluated with a real provider. No browser automation/runtime is available in this environment, so browser click-through, loading/retry interaction and language-switch draft persistence were not manually verified. Existing draft state remains unchanged by inspection, and production build passes.

Prompt policy plus an obvious-code blocker does not guarantee semantic compliance by every model. Client-supplied Judge snapshots are not cryptographically attested. Existing solutions are still bundled in frontend educational content (Day 13 limitation), but excluded from Tutor context. Production auth, per-user limits and submission/history storage remain deferred.

No merge to main performed. Unrelated local package-lock.json changes remain excluded.
