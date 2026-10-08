# LOCALINGO frontend

Trang chủ dùng **BÌA CHỦ O ELM.png** làm nền và ghép 4 ảnh từ thư mục **ELEMENT LẺ** theo vị trí của **BÌA CHỦ.png**.

## Chạy

Cần Node.js 20 trở lên.

```sh
npm install
npm run dev
```

Mở **http://localhost:4173**. Có thể mở `index.html` trực tiếp; trang không cần backend hoặc dịch vụ ngoài.

## Build

```sh
npm run build
```

Thư mục `dist/` chứa frontend tĩnh, có thể đưa lên dịch vụ hosting. Các đường dẫn asset là đường dẫn tương đối, dùng được khi website nằm trong thư mục con.

## Bố cục và asset

- `assets/background.png`: bản sao nguyên gốc của **BÌA CHỦ O ELM.png**.
- `assets/start-learning.png`, `learn.png`, `explore.png`, `practice.png`: bản sao nguyên gốc của 4 element.
- `element-geometry.css`: vị trí, kích thước, vùng hiển thị và đường viền CSS của từng element.
- `assets/montserrat.ttf`: font menu, kèm giấy phép SIL Open Font License trong `assets/montserrat-OFL.txt`.
- `styles.css`: tỷ lệ trang, vùng bấm menu, hiệu ứng hover/focus và điều chỉnh trên điện thoại.
- `app.js`: hộp thoại giới thiệu Learn, Explore, Practice và Badges.

Canvas giữ tỷ lệ **2405 × 3619** theo ảnh mẫu và co giãn cùng các element. Các element gốc có nền hình chữ nhật và vài vệt trắng ở mép; CSS `clip-path` loại bỏ phần thừa theo đường viền ảnh mẫu mà không sửa ảnh gốc.

Nội dung chữ và minh họa có sẵn trong ảnh nền. HTML cung cấp thêm văn bản ngữ nghĩa cho trình đọc màn hình, vùng bấm menu, liên kết bỏ qua và điều khiển bàn phím. Điện thoại có thêm thanh điều hướng với vùng bấm lớn dưới ảnh.

Nút **Start Learning** cuộn đến hành trình học. Menu cuộn đến từng lựa chọn; các nút hành trình mở giới thiệu. Đây là frontend trang chủ; bài học, tài khoản và lưu huy hiệu chưa được tích hợp.

## Kiểm tra

```sh
npx playwright install chromium
npm test
```

Nếu máy đã có Google Chrome, có thể dùng `PLAYWRIGHT_CHANNEL=chrome` thay cho cài Chromium. Trên PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm test
```

Kiểm tra chạy ở hai kích thước 1280 × 900 và 390 × 844, xác minh ảnh tải đủ, không tràn ngang, điều hướng và thao tác bàn phím. Ảnh chụp toàn trang được lưu trong `test-results/`.
