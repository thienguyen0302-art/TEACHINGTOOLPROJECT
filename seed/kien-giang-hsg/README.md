# Kiên Giang annual series

This is a **review import**, not a released contest series. See [REPORT.md](REPORT.md) for all nineteen release times, duration evidence and outstanding work.

## Source and fidelity

The user authorized the existing extracted directory `Đề Thi HSG tin học/Đề Thi HSG tin học` in place of a ZIP. On another machine, place the archive at `imports/kien-giang-hsg/De-Thi-HSG-Tin-Hoc.zip`, extract it and pass `--source-dir` pointing at the PDFs. Every annual PDF and the compilation are checked against SHA-256 hashes. Missing or changed inputs stop the import.

`manifest.json` enumerates exactly nineteen seasons (2006–2007 to 2024–2025), and records source evidence. All nineteen page-one scans were visually inspected: each specifies **150 minutes**. The page-one header of `tin_1728.pdf` explicitly reads **2017–2018**.

`annual-candidates.json` contains 73 unverified OCR/review candidates. `review-candidates.json` contains 59 pre-solution excerpts from the 15_DE compilation, only for comparison. Neither is imported by frontend code. Both exclude reference code/solution sections. The compilation has gaps (notably the prime-number problem in 2013–2014), so it cannot replace annual verification.

No sample I/O or hidden expected output was invented. All candidates have `needsReview: true`, no verified public samples and no validated hidden tests. OCR can reorder text, lose powers/inequalities and corrupt tables. Seventy-two candidates have parsed point weights and can become teacher-only drafts; 2016–2017 Problem D has no trusted point weight and stays in seed review material. Points are represented as original points × 100 to preserve fractional source distributions within the existing integer scoring model. These OCR weights also require review.

Unfinished drafts may have zero public samples in the backend authoring validator; published problems still require samples and private tests. Existing Firestore security rules remain unchanged. Drafts are invisible to students. Do not publish a draft until comparing the full annual PDF, including all pages/tables, and validating outputs.

## Commands

```bash
# No Firebase credentials or teacher UID needed. No writes.
npm run import:kiengiang -- --dry-run
npm run import:kiengiang -- --source-dir '/absolute/path/to/extracted/PDFs'

# Explicit writes only. Requires ADC and an existing teacher profile in the same project.
IMPORT_TEACHER_UID='<teacher uid>' npm run import:kiengiang -- --apply
```

`FIREBASE_PROJECT_ID` is loaded from `.env.local`. `IMPORT_TEACHER_UID` is **not** an email address. A teacher UID is required only for apply: it establishes the owner using an existing `users/{uid}.role = teacher` profile. The importer does not create users or grant teacher roles. Without it, use dry-run and keep the seed ready for a teacher to apply later.

Each season uses one Firestore transaction. Deterministic contest/problem/slug/secret IDs prevent duplicates. Existing contests and problem/slug/secret/lock collisions are skipped with a report; teacher changes and ongoing submissions are preserved. Incomplete extraction flags, sample validation, reference-test validation or duration evidence prohibit publication. Existing records are never silently overwritten. To migrate an already imported draft later, use Teacher Authoring after completing source review; re-running import skips it.

The default run prepares 19 draft contests / 72 draft problems. **This repository task has performed zero Firestore writes.** No contest is READY. Public serializers strip solution fields; validated hidden tests belong only in `problemSecrets/{id}`. Readiness flags are human review attestations, not an automated proof of algorithm correctness. When reviewing a candidate, run trusted reference implementations on edge cases, compare samples and independently check outputs before adding private tests and setting verification flags. Keep reference sources and generated private tests under ignored `imports/`, never in `src/`.

For old file-I/O tasks, reviewers can set candidate `originalFileIO: {input: 'BAI1.INP', output: 'BAI1.OUT'}`. The importer adds a source note and normalizes UI descriptions to Standard Input/Output. Do not infer file names from `.pas` program names.

## Re-extracting privately

```bash
python3 -m pip install -r scripts/kien-giang-requirements.txt
python3 scripts/extract-kien-giang-hsg.py --source-dir 'Đề Thi HSG tin học/Đề Thi HSG tin học'
# Optional: install Tesseract and vie/eng language data on your machine first.
python3 scripts/extract-kien-giang-hsg.py --source-dir 'Đề Thi HSG tin học/Đề Thi HSG tin học' --ocr
```

Extraction outputs raw text/images only under ignored `imports/`, since annual files include marking guides and the compilation includes solutions. It never auto-marks OCR verified or publishes records. Reconcile extracted text and public samples manually into reviewed candidates. The checked-in candidates were staged from this source set and deliberately remain unverified.
