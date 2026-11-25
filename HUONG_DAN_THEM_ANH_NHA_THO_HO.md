# Hướng dẫn thêm ảnh Nhà thờ họ

## 1. Chép ảnh
Chép ảnh vào `public/images/nha-tho-ho/`. Ví dụ:
- `nha-tho-ho-01.webp`
- `le-te-2026.jpg`
- `con-chau-hop-mat.jpg`

Nên đặt tên không dấu, không khoảng trắng. Khuyến nghị ảnh rộng 1.200–1.600 px và dung lượng khoảng 200–500 KB/ảnh.

## 2. Khai báo ảnh
Mở `src/gallery.js`, thêm từng ảnh vào mảng `TEMPLE_GALLERY`:

```js
export const TEMPLE_GALLERY = [
  { src: '/images/nha-tho-ho/nha-tho-ho-01.webp', caption: 'Toàn cảnh nhà thờ họ' },
  { src: '/images/nha-tho-ho/le-te-2026.jpg', caption: 'Ngày tế lễ năm 2026' },
];
```

Đường dẫn bắt đầu bằng `/images/nha-tho-ho/`; **không** ghi `public` ở đầu đường dẫn.

## 3. Kiểm tra và đưa lên website
Chạy website local để kiểm tra. Khi cập nhật GitHub, đưa cả thư mục `public/images/nha-tho-ho/` và tệp `src/gallery.js` lên cùng dự án. Vercel sẽ triển khai lại.

Tab ảnh sử dụng `loading="lazy"`, vì vậy ảnh chỉ tải khi người xem mở tab và ảnh tiến gần vùng hiển thị. Việc này giảm tải lúc mở trang chính, nhưng tổng dung lượng ảnh vẫn làm tăng dung lượng repository và dữ liệu cần tải khi xem thư viện.
