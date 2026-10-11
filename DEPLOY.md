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
  --set-env-vars "FIREBASE_PROJECT_ID=<PROJECT_ID>,APP_ORIGIN=https://<PROJECT_ID>.web.app,JUDGE0_URL=https://judge0-extra-ce.p.rapidapi.com,JUDGE0_API_HOST=judge0-extra-ce.p.rapidapi.com,AI_PROVIDER=gemini,AI_MODEL=gemini-3.5-flash-lite" \
  --set-secrets "JUDGE0_API_KEY=judge0-key:latest,AI_API_KEY=gemini-key:latest"
```

- `--allow-unauthenticated` vì Hosting gọi công khai; bảo vệ nằm ở `REQUIRE_AUTH=true` (đã đặt sẵn trong Dockerfile) — backend tự kiểm tra Firebase ID token.
- Key bí mật tạo bằng Secret Manager: `printf '<key>' | gcloud secrets create judge0-key --data-file=-` (tương tự `gemini-key`).
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
