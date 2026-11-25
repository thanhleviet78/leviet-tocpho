# Lê Viết – Tộc Phổ | Phú Ngạn, Huế

Ứng dụng gia phả React + Vite.

## Chạy trên máy

1. Cài Node.js LTS.
2. Mở terminal tại thư mục dự án.
3. Chạy `npm install`.
4. Chạy `npm run dev` và mở URL Vite hiển thị.

## Giai đoạn 1 – An toàn dữ liệu

- Dữ liệu thành viên, tin tức, lịch phụng tu và lịch trùng tu được tự lưu trong `localStorage` của trình duyệt hiện tại; không tự đồng bộ giữa thiết bị.
- **Xuất dữ liệu cập nhật website** tạo file `data.js` từ dữ liệu đang quản lý trên máy. Thay file này vào `src/data.js`, sau đó Git commit/push để cập nhật website công khai.


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


## Cache trên Vercel

- `vercel.json` yêu cầu trình duyệt và CDN kiểm tra lại trang `/` và `/index.html` mỗi lần truy cập, tránh giữ HTML cũ sau khi deploy.
- Các file trong `/assets/` do Vite tạo có tên kèm hash nên được cache dài hạn an toàn.
- Sau khi cập nhật, Vercel cần triển khai lại để áp dụng header mới.


## Cập nhật dữ liệu website công khai

Trên localhost, sau khi sửa dữ liệu thành viên, bấm **Xuất dữ liệu cập nhật website**. Trình duyệt tải xuống file `data.js` chứa toàn bộ dữ liệu hiện tại (thành viên, tin tức, lịch sử tu sửa và thông tin nhà thờ). Chép file vừa tải đè lên `src/data.js`, sau đó chạy `git add .`, `git commit` và `git push origin main`. Chỉ Git Push sau khi đã thay `src/data.js` mới đưa dữ liệu lên Vercel. Nút xuất sẽ kiểm tra lỗi cấu trúc thành viên trước khi tạo file.
