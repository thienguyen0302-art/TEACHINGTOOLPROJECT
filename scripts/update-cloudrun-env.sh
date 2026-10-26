#!/usr/bin/env bash
# Đổi cấu hình AI trên Cloud Run mà không build lại. Khóa lấy từ Secret Manager, không nằm trong file.
set -euo pipefail

SERVICE="${SERVICE:-peanutcode-api}"
REGION="${REGION:-asia-southeast1}"
SECRET="${SECRET:-openai-key}"

gcloud run services update "$SERVICE" --region "$REGION" --remove-env-vars OPENAI_API_KEY 2>/dev/null || true
gcloud run services update "$SERVICE" --region "$REGION" \
  --update-env-vars "AI_PROVIDER=openai,AI_API_URL=https://api.openai.com/v1,AI_MODEL=gpt-4o-mini,AI_PDF_MODEL=gpt-4o-mini" \
  --update-secrets "OPENAI_API_KEY=${SECRET}:latest"

echo "Hoàn tất! Cloud Run đang dùng OpenAI với khóa từ Secret Manager."
