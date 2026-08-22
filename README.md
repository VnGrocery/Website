# VNGrocery Admin Web

React + Vite admin UI cho VNGrocery Server: duyệt cửa hàng và sản phẩm, xem
event log đã ký, và tra cứu proof của các cam kết đã neo lên blockchain.

## Chạy

```bash
npm install
npm run dev            # dev server
npm run build          # build tĩnh vào dist/
npm run test:e2e       # build rồi kiểm tra mọi route render được
docker compose up --build
```

## Kết nối Server

API mặc định là `http://<host>:5050/v1` — cổng mà docker-compose publish cho
Server. Đổi bằng biến môi trường lúc build:

```bash
VITE_API_BASE_URL=https://api.example.com/v1 npm run build
```

Địa chỉ cũng sửa được ngay trong màn hình đăng nhập; giá trị đó lưu cùng phiên.

## Ghi chú

- Phiên đăng nhập lưu ở `localStorage`, khoá `vngrocery-admin-session`.
- Docker image build sẵn rồi phục vụ bằng Nginx (`nginx.conf`).
- Tài khoản phải có quyền admin; Server cấp qua `BOOTSTRAP_ADMIN_EMAILS`.
