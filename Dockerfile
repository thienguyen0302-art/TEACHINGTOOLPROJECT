# Backend Judge/AI cho Cloud Run. Build từ thư mục gốc project: gcloud run deploy --source .
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
# Backend đọc đề bài, test và nội dung chương từ src/content
COPY src/content ./src/content
COPY src/utils ./src/utils
ENV NODE_ENV=production HOST=0.0.0.0 REQUIRE_AUTH=true
CMD ["node", "server/index.js"]
