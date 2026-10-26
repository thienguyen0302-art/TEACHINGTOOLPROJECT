# Deploy production (Firebase Hosting + Cloud Run)

Kiến trúc: Firebase Hosting phục vụ frontend (`dist`); mọi request `/api/**` được rewrite sang
dịch vụ Cloud Run `peanutcode-api` (backend Judge0 + AI trong `server/`). Cùng origin nên không cần CORS.

## 0. Một lần: công cụ và project

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # chọn project Firebase, tạo .firebaserc
```

Bật Billing cho project (Cloud Run yêu cầu, vẫn có free tier) và bật Cloud Run + Cloud Build API.

## 1. Deploy backend lên Cloud Run

Chạy ở thư mục gốc project (dùng `Dockerfile`). Thay `<PROJECT_ID>` và các giá trị bí mật:

```bash
gcloud run deploy peanutcode-api \
  --source . --region asia-southeast1 --allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=<PROJECT_ID>,APP_ORIGIN=https://<PROJECT_ID>.web.app,JUDGE0_URL=https://judge0-extra-ce.p.rapidapi.com,JUDGE0_API_HOST=judge0-extra-ce.p.rapidapi.com,AI_PROVIDER=openai,AI_API_URL=https://api.openai.com/v1,AI_MODEL=gpt-5.4-mini,AI_PDF_MODEL=gpt-5.4-mini" \
  --set-secrets "JUDGE0_API_KEY=judge0-key:latest,OPENAI_API_KEY=openai-key:latest"
```

- `--allow-unauthenticated` vì Hosting gọi công khai; bảo vệ nằm ở `REQUIRE_AUTH=true` (đã đặt sẵn trong Dockerfile) — backend tự kiểm tra Firebase ID token.
- Key bí mật tạo bằng Secret Manager: `printf '<key>' | gcloud secrets create judge0-key --data-file=-` (tương tự `openai-key`).
- Nếu `APP_ORIGIN` chưa khớp URL Hosting thật, backend trả 403 "Origin không được phép".

## 2. Deploy Firestore rules + frontend

```bash
npm run build
firebase deploy --only firestore:rules,hosting
```

## 3. Tạo tài khoản giáo viên

Đăng ký 1 tài khoản bình thường → Firebase Console → Firestore → `users/{uid}` → thêm field `role` = `teacher`.
(Rules cấm người dùng tự đặt `role`, nên chỉ làm được bằng Console.)

## 4. Kiểm tra sau deploy

1. Mở URL `https://<PROJECT_ID>.web.app`, đăng nhập, học 1 quiz → Dashboard có tiến độ.
2. Chạy/Nộp 1 bài code → có kết quả Judge; hỏi AI → có gợi ý.
3. `curl -X POST https://<PROJECT_ID>.web.app/api/judge -d '{}'` (không token) phải trả 401.
4. Đăng nhập tài khoản giáo viên → menu "Giáo viên" hiện, bảng học sinh có dữ liệu.

## Giới hạn còn lại

Giới hạn tốc độ theo từng người dùng, và việc `solution.code` vẫn nằm trong bundle frontend (xem báo cáo Day 13), chưa xử lý.

## Contest backend / Admin Firestore

The Docker image now runs `npm ci --omit=dev` and includes shared server utilities.
Deploy with an explicit Cloud Run runtime service account that has
`roles/datastore.user` on the configured Firebase project. Cloud Run uses
Application Default Credentials; do not upload/commit service-account JSON.
`FIREBASE_PROJECT_ID` must match frontend Auth/Firestore. Keep the existing Judge0
and AI secrets in Secret Manager. The Hosting `/api/**` rewrite already covers the
new authoring and contest APIs; re-deploy both the backend and Firestore rules.

Before production, run the emulator suite documented in
[Checklist/contest-mode.md](Checklist/contest-mode.md), then test real teacher and
student accounts against staging: create/import/preview/publish, contest builder,
Run (no score), repeated WA/partial/AC Submit, leaderboard, private history, and
student DevTools/rules denials. The cloud task could not download the Firestore
Emulator (HTTP 403), so it does not claim that additional suite passed. Publishing
Git commits does not deploy Cloud Run, Hosting or Firestore rules.


## Khóa OpenAI: lưu ở Secret Manager, không ghi vào file

```bash
bash scripts/setup-openai-secret.sh   # 1 lần: dán khóa khi được hỏi (không hiện khi gõ)
bash scripts/deploy-cloudrun.sh       # deploy; Cloud Run đọc khóa từ secret `openai-key`
```

- Không đặt khóa vào script, README, `.env.example` hay tin nhắn chat. File thật chỉ để ở `.env.local` (đã nằm trong `.gitignore`).
- `npm run check:secrets` (tự chạy trước `npm run build`) báo lỗi nếu phát hiện khóa trong mã nguồn.
- Lỗi trả về trình duyệt chỉ là thông báo cố định theo mã HTTP; nội dung phản hồi của OpenAI không được chuyển tiếp.
