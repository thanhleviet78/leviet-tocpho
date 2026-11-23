# Lê Viết – Tộc Phổ | Phú Ngạn, Huế

Ứng dụng gia phả React + Vite.

## Chạy trên máy

1. Cài Node.js LTS.
2. Mở terminal tại thư mục dự án.
3. Chạy `npm install`.
4. Chạy `npm run dev` và mở URL Vite hiển thị.

## Giai đoạn 1 – An toàn dữ liệu

- Dữ liệu thành viên, tin tức, lịch phụng tu và lịch trùng tu được tự lưu trong `localStorage` của trình duyệt hiện tại; không tự đồng bộ giữa thiết bị.
- **Sao lưu dữ liệu** xuất JSON chứa thành viên, tin tức, lịch phụng tu và trùng tu.
- **Nhập bản sao lưu** kiểm tra JSON, danh sách thành viên, các mục dữ liệu dạng danh sách, ID, tên, đời, thứ tự con, liên kết cha/mẹ, vòng liên kết. Trước khi thay thế dữ liệu, ứng dụng yêu cầu xác nhận và tải bản sao dữ liệu hiện tại xuống.
- **Rà soát dữ liệu** hiển thị lỗi cấu trúc và cảnh báo để người quản lý đối chiếu. Tên trùng không tự động bị xóa hay gộp.
- Hãy giữ file JSON sao lưu ở nơi an toàn, nhất là trước khi nhập dữ liệu hoặc sửa nhiều thành viên.


## Giai đoạn 2 – Cây gia phả và hồ sơ

- Sơ đồ cây có thể thu gọn/mở từng nhánh, thu gọn hết, gọn đến đời 4 hoặc mở hết.
- Có thể phóng to/thu nhỏ sơ đồ.
- Bấm hoặc dùng bàn phím Enter/Space trên thẻ thành viên để mở hồ sơ.
- Việc thêm/sửa thành viên có kiểm tra mã trùng, người cha/mẹ không tồn tại và đời không khớp quan hệ cha/mẹ.
- Giữ nguyên thông tin thành viên và danh xưng đã có trong dữ liệu gốc; không tự bổ sung thông tin lịch sử.

## Kiểm tra dự án

- `npm run build`: build production.
- `npm run lint`: lint.
- `npm run preview`: xem bản production local.


## Lưu ý kiểm thử

Build/lint cần cài dependencies bằng `npm install`. Nếu mạng không ổn định, hãy thử lại trên máy cá nhân. Dữ liệu trong localStorage chỉ nằm trên trình duyệt/thiết bị đã lưu; website deploy không tạo kho dữ liệu dùng chung cho mọi người.
