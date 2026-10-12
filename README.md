# Quý ông người pháp: ôn thi Chuẩn kỹ năng CNTT cơ bản

Web ôn thi trắc nghiệm từ 6 file PDF (718 câu, 6 module). Chọn đáp án, biết đúng sai ngay,
nếu sai thì hiện đáp án đúng. Có thi thử có tính giờ và danh sách câu sai để ôn lại.

## Chạy

```bash
npm install        # cài phụ thuộc (chỉ dùng khi phát triển và kiểm thử)
npm run build      # sinh font, icon, dữ liệu câu hỏi vào thư mục web
npm run serve      # mở http://127.0.0.1:4173
npm test           # unit test (node:test) + E2E (Playwright, dùng Edge có sẵn)
npm run shots      # chụp ảnh các màn hình ở 320/375/768/1024/1440, sáng và tối
```

Cũng có thể mở thẳng `index.html` bằng trình duyệt, không cần server.

## Cấu trúc

- `index.html`, `css/`, `js/`: giao diện thuần HTML/CSS/JS, không cần bước build.
- `js/core.js`: logic thuần (chấm điểm, tiến độ, chọn đề), có unit test.
- `data/questions.js`: dữ liệu sinh từ PDF. `tools/parse_pdfs.py` trích PDF sang JSON
  (đáp án đúng là chữ cái màu đỏ trong PDF; Module 2 câu 33 được khoanh tròn nên khai báo thủ công).
- Tiến độ lưu trong localStorage của trình duyệt; bài thi đang làm dở lưu trong sessionStorage.
