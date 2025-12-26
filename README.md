# Portfolio (tĩnh)  Basic

Các file: `index.html`, `styles.css`, `script.js`.

Xem trước cục bộ:
1. Mở PowerShell trong thư mục này.
2. Chạy: `python -m http.server 8000` (cần Python).
3. Mở trình duyệt: http://localhost:8000

Hoặc mở `index.html` trực tiếp trong trình duyệt.

Sau khi tạo, mở project trong VS Code để tôi chỉnh nội dung (tên, mô tả, project cụ thể, link GitHub, hình ảnh).

Maintenance helper
------------------

- `node scripts/assign-images.js` — (tuỳ chọn) tự động gán ảnh trong `assets/images/` vào các bài trong `data/posts.json` khi thiếu hoặc không hợp lệ.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\assign-images.ps1` — chạy trên Windows (không cần Node). Sử dụng khi bạn thêm ảnh mới vào thư mục `assets/images/`.

