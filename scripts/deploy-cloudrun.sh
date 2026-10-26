#!/usr/bin/env bash
# Deploy backend lên Cloud Run, lấy khóa OpenAI từ Secret Manager (xem setup-openai-secret.sh).
# KHÔNG ghi khóa vào file này.
set -euo pipefail

SERVICE="${SERVICE:-peanutcode-api}"
REGION="${REGION:-asia-southeast1}"
SECRET="${SECRET:-openai-key}"

echo "[1/2] Gỡ biến môi trường OPENAI_API_KEY dạng chữ thường (nếu còn từ bản cũ)..."
gcloud run services update "$SERVICE" --region "$REGION" --remove-env-vars OPENAI_API_KEY 2>/dev/null || true
gcloud run services update "$SERVICE" --region "$REGION" --remove-secrets OPENAI_API_KEY 2>/dev/null || true

echo "[2/2] Build và deploy backend..."
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --update-env-vars "AI_PROVIDER=openai,AI_API_URL=https://api.openai.com/v1,AI_MODEL=gpt-4o-mini,AI_PDF_MODEL=gpt-4o-mini" \
  --update-secrets "OPENAI_API_KEY=${SECRET}:latest"

echo "=== Deploy Cloud Run thành công! ==="
