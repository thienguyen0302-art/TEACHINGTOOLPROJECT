#!/usr/bin/env bash
# CHẠY 1 LẦN: đưa khóa OpenAI vào Google Secret Manager. Khóa chỉ được gõ/dán lúc chạy,
# không bao giờ nằm trong file hay lịch sử git.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
SERVICE="${SERVICE:-peanutcode-api}"
REGION="${REGION:-asia-southeast1}"
SECRET="${SECRET:-openai-key}"

[ -n "$PROJECT_ID" ] || { echo "Chưa chọn project: gcloud config set project <PROJECT_ID>"; exit 1; }

printf "Dán OpenAI API key (không hiện khi gõ): "
read -rs KEY; echo
[ -n "$KEY" ] || { echo "Khóa rỗng."; exit 1; }

if gcloud secrets describe "$SECRET" --project "$PROJECT_ID" >/dev/null 2>&1; then
  printf '%s' "$KEY" | gcloud secrets versions add "$SECRET" --project "$PROJECT_ID" --data-file=-
else
  printf '%s' "$KEY" | gcloud secrets create "$SECRET" --project "$PROJECT_ID" --replication-policy=automatic --data-file=-
fi
unset KEY

# Cho tài khoản chạy Cloud Run quyền đọc secret này.
SA="$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" \
      --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)"
if [ -z "$SA" ]; then
  NUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  SA="${NUM}-compute@developer.gserviceaccount.com"
fi
gcloud secrets add-iam-policy-binding "$SECRET" --project "$PROJECT_ID" \
  --member "serviceAccount:${SA}" --role roles/secretmanager.secretAccessor >/dev/null

echo "Xong. Secret '$SECRET' đã sẵn sàng. Giờ chạy: bash scripts/deploy-cloudrun.sh"
