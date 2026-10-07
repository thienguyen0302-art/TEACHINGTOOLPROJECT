# Hướng dẫn chạy project

1. Cài Node.js 20 trở lên (nodejs.org)
2. Clone repo:
   git clone https://github.com/TEN_BAN/hsg-tinhoc.git
   cd hsg-tinhoc
3. git checkout dev
4. npm install
5. Copy `.env.example` thành `.env`, điền 4 giá trị Người 1 gửi riêng
6. npm run dev
7. Mở http://localhost:5173

## Quy tắc Git
- Không code trực tiếp vào main
- Mỗi tính năng một nhánh: git checkout -b feature/ten-feature
- Xong thì merge vào dev, chỉ merge dev vào main khi bản chạy ổn