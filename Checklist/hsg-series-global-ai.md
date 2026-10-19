# HSG series + Global Peanut AI integration

Branch: `feature/hsg-series-global-ai` (based on main `8c32103`).

## Contest series

See [seed report](../seed/kien-giang-hsg/REPORT.md) and [import instructions](../seed/kien-giang-hsg/README.md). Prepared nineteen seasons, two days apart, 19:00 UTC+07, from 16 October to 21 November 2026. Seventy-three source candidates, seventy-two eligible draft documents, zero READY seasons. All durations 150 minutes, each independently read from annual page-one scan. No live import or publication performed; owner UID was not provided. No verified hidden tests exist for these candidates yet.

The list has a small series badge and next-release countdown, derived from deterministic IDs of **published** records only. Draft imports are teacher-only. Existing upcoming-statement checks, public serializers, Judge0 scoring and Firestore security rules remain in place. The importer uses create-only transactions and preserves existing records. A draft may omit samples; publication cannot.

## Global chat

`GlobalPeanutChat.jsx` replaces VI at the same topbar position, with icon-only mobile trigger. It is a modal right-side drawer; no navigation or provider call occurs on opening. Notifications and account menu are retained. Focus goes to the textarea, Tab stays in the dialog, Escape closes and focus returns to the trigger. Chat is bounded to four turns in memory, not Firestore/localStorage. Closing cancels generation; a new conversation clears it. User change or navigation into a contest unmounts/clears the chat; ordinary page navigation preserves history.

`POST /api/ai/global-chat` has a dedicated handler and always requires a verified Firebase token, even when legacy dev auth is disabled. It uses the existing Gemini adapter, server API key, credential redaction and normalized `{message, suggestedActions: []}` output. The provider budget is 700 output tokens. Provider transport shares a two-request cap across Global Chat, existing Tutor and Self-Check; the handler additionally caps its own pending requests at two. Body limit is 100 KB, message 2000 characters, history eight alternating messages, timeout 30 seconds with AbortController and safe errors. Existing Tutor's actions/caps/contexts remain intact.

Frontend and server use explicit request allowlists. No email, UID, profile, current source, Judge result, teacher form, Firestore secret or contest document is loaded into context. The pathname is reduced to a public area name before Gemini. User text/history remain untrusted data in the prompt. Routes `/contest`, `/contest/*` and `/contests` hide/unmount the drawer, and the endpoint rejects those page contexts. Teacher pages can use global chat without their form/document data.

## Verification

PASS: test:contest, test:authoring, test:lesson, test:ai, test:judge, test:progress, test:platform, validate:content, test:content, lint, build.

New PASS: test:series (schedule, IDs, typo evidence, uncertain-source drafts, publication gate, private serialization, idempotency, file I/O, next release); test:global-ai (auth, strict payload, bounded history, contest blocking, normalization/redaction, safe errors, timeout, disconnect, concurrency).

Browser regression PASS with mocked provider, Chromium and React StrictMode at 1280px and 390px: VI absent; trigger/open/focus; no automatic provider call; Enter/Shift+Enter; success/error/retry/cancel; Escape/focus restoration; reset/history persistence on route navigation; contest lock; notification and account menus; panel fits viewport. Screenshots inspected at `/tmp/peanut-global-1280.png` and `/tmp/peanut-global-390.png`. Run `npm run test:global-ai:browser` after `npx playwright install chromium` and installing OS browser dependencies if missing.

Not verified live: a real Gemini response with Firebase token; real Judge0 submissions for these imported problems; live Firestore writes; Firestore Emulator rules suite (Java/emulator unavailable here). No claim of manual end-to-end Firebase/Gemini testing or publication. Build reports existing large Monaco/Firebase chunks. Seed/source review remains necessary before release. No merge into main is performed by this feature task.
