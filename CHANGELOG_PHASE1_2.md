# Nhật ký nâng cấp – Giai đoạn 1 và 2


## Giai đoạn 1: An toàn dữ liệu
- Kiểm tra cấu trúc thành viên: ID, tên, đời, thứ tự con, liên kết cha/mẹ, vòng liên kết.
- Rà soát cảnh báo số người gốc, tên trùng, thứ tự con trùng.
- Xác nhận file JSON nhập có danh sách thành viên; các trường newsList, revisions, renovations (nếu có) phải là mảng.
- Khi nhập: hiển thị xác nhận, cảnh báo kiểm tra và tải backup hiện trạng trước khi thay thế.
- Sao lưu/khôi phục JSON và tự lưu localStorage.

## Giai đoạn 2: Cây gia phả và hồ sơ
- Mở rộng/thu gọn cây theo nhánh, thu gọn hết, gọn tới đời 4, mở hết.
- Thẻ trong sơ đồ mở hồ sơ thành viên bằng click hoặc Enter/Space.
- Khởi tạo trạng thái mở cây dựa trên dữ liệu đang lưu (nếu có), không chỉ dựa trên bộ dữ liệu mặc định.
- Thêm kiểm tra khi thêm/sửa: mã ID không trùng, người cha/mẹ phải tồn tại, đời phải khớp với quan hệ.

## Không thay đổi
- Không chỉnh sửa nội dung danh sách thành viên trong `src/data.js`.
- Không tự gộp tên trùng hoặc thêm dữ kiện lịch sử.
- Giữ nguyên danh xưng "Ngài Thuỷ tổ" và "Thuỷ tổ tỷ Nguyễn Thị Bông" trong dữ liệu.

## Kiểm thử
- Đã kiểm tra dữ liệu gốc bằng cách import module: 406 thành viên, 1 người gốc, không trùng ID, không thiếu liên kết cha, không sai đời theo liên kết; 47 nhóm tên trùng cần xem xét thủ công.
- Chưa xác nhận build/lint vì quá trình cài dependencies bị timeout trong môi trường thực hiện.
