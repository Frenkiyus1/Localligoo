# LOCALINGO

Website học tiếng Anh qua văn hóa địa phương. Luồng học hiện có: **Home → Learn → Unit 2 · My House → Speaking**.

## Chạy local

Cần Node.js 22 trở lên.

```sh
npm ci
npm run dev
```

Mở http://localhost:4173. Các trang dùng JavaScript modules nên cần HTTP server thay vì mở trực tiếp file HTML.

`npm run dev` phục vụ giao diện và trả trạng thái AI chưa kết nối. Các chức năng xem bài, nghe mẫu bằng trình duyệt, ghi âm, phát lại và Explore vẫn hoạt động.

## Nội dung và giao diện

- Loại bỏ mục Practice khỏi menu và hành trình trang chủ.
- Learn, My House và bìa Speaking dùng ảnh từ thư mục thiết kế `TRANG LEARN`. Bản cần triển khai nằm trong `assets/learn/`; thư mục thiết kế gốc được bỏ qua trong Git để tránh lưu trùng nhiều ảnh lớn.
- Speaking có 5 nhiệm vụ bổ sung về My House, BanBan hướng dẫn, nghe mẫu, ghi âm tối đa 60 giây, tải file âm thanh, phát lại và thử lại.
- Explore giữ đúng **24 câu** và các lựa chọn trong file nội dung. File nguồn đánh số 1–25 nhưng thiếu câu 12; không thêm hoặc nhân đôi câu hỏi. Thứ tự thẻ được xáo trộn khi mở trang hoặc bấm Shuffle; có lọc chủ đề, đáp án và đặt lại bài.
- Khóa đáp án trong `questions.js` được suy ra từ các lựa chọn vì tài liệu nguồn không có bảng đáp án riêng. Có thể chỉnh thuộc tính `answer` (chỉ số từ 0).
- Tiến độ Speaking và câu trả lời Explore lưu ở `localStorage` trên từng trình duyệt, không đồng bộ tài khoản. Huy hiệu Storyteller mở khi hoàn thành 5 nhiệm vụ nói.
- Footer mọi trang có liên kết email `localingo.workspace@gmail.com`.
- Những unit/kỹ năng chưa có nội dung được ghi Coming soon. Chỉ Speaking của My House có bài học tương tác.

## AI Speaking trên Cloudflare

Backend `worker.js` dùng **Cloudflare Workers AI binding `AI`**, không cần khóa OpenAI:

1. `@cf/openai/whisper-large-v3-turbo` là mô hình nhận dạng giọng nói được Cloudflare host. Không gọi dịch vụ API OpenAI.
2. `@cf/meta/llama-3.3-70b-instruct-fp8-fast` sửa ngữ pháp, góp ý từ vựng và câu trả lời bằng tiếng Việt.
3. Chế độ **Read the example aloud** đối chiếu từ nhận dạng với câu mẫu; thống kê tốc độ nói từ độ dài bản ghi và khoảng nghỉ khi có timestamps.

**Giới hạn phát âm:** nhận dạng lời nói không phải bộ chấm âm vị. Không sinh điểm phát âm hoặc điểm trôi chảy giả từ transcript; các mục này hiển thị hướng dẫn luyện tập, đối chiếu từ và nhịp nói ước tính. Sai khác từ có thể do lỗi ASR. Muốn chấm chi tiết từng âm vị cần bổ sung dịch vụ chuyên dụng.

Người học phải đồng ý trước khi gửi bản ghi/câu trả lời tới Cloudflare Workers AI. Server không lưu bản ghi hay ghi nội dung vào log. Trình duyệt chỉ lưu tiến độ, không lưu audio/transcript trong localStorage. Mỗi lần đổi nhiệm vụ hoặc rời trang sẽ giải phóng bản ghi tạm.

Endpoint:

- `GET /api/speaking/status`: kiểm tra có binding AI.
- `POST /api/speaking/assess`: nhận JSON `missionId`, `mode` (`audio` hoặc `text`), `consent`, `readAloud` tùy chọn, `audio` (WAV base64) hoặc `text`.

Audio được chuyển trong trình duyệt thành WAV mono PCM 16-bit 16 kHz, dài 1–60 giây. Server giới hạn kích thước request, kiểm tra WAV và âm lượng, chống cross-origin, giới hạn 10 yêu cầu/phút/IP qua binding `SPEAKING_LIMITER`, kiểm tra kết quả AI trước khi trả về. Hạn mức có tính gần đúng theo cơ chế Cloudflare; không thay thế hạn mức chi phí của tài khoản.

Cần tài khoản Cloudflare có quyền Workers AI và hạn mức phù hợp. `wrangler.jsonc` đã khai báo `AI`, `ASSETS`, `SPEAKING_LIMITER` và route `/api/*`.

```sh
npx wrangler login
npm run preview
```

Workers AI chạy từ xa ngay khi dùng Wrangler preview; lệnh suy luận dùng hạn mức tài khoản. Chỉ trạng thái có binding chưa chứng minh tài khoản đã có quyền/hạn mức suy luận; lỗi thực tế sẽ hiển thị trên giao diện để người học thử lại.

## Kiểm tra

```sh
npm run test:api
npm test
npm run build
npm run deploy:check
```

Nếu dùng Chrome đã cài sẵn, trên PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm test
```

Hoặc cài Chromium bằng `npx playwright install chromium`.

Kiểm tra API dùng binding AI giả lập để xác minh xử lý request, lỗi, consent, giới hạn, silence và kết quả. Kiểm tra trình duyệt chạy desktop 1280 × 900 và mobile 390 × 844, xác minh luồng học, Explore, xử lý audio, lưu tiến độ và huy hiệu; lời gọi suy luận được giả lập. Ảnh QA trong `test-results/`.

## Build và triển khai

`npm run build` đóng gói frontend vào `dist/`. Wrangler bundle backend riêng; chỉ thư mục `dist/` được upload làm static assets.

Cloudflare Workers Builds:

- Root directory: gốc repository.
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Giữ tên Worker `localligoo` và cho phép binding Workers AI.

```sh
npm run deploy:check
npm run deploy
```

Dry-run không xuất bản website và không xác minh suy luận AI thật. Git push chỉ đưa mã nguồn lên GitHub; website chỉ cập nhật nếu repository đã nối Workers Builds hoặc có người chạy deploy.

Tài liệu: [Workers AI binding](https://developers.cloudflare.com/workers-ai/configuration/bindings/), [Whisper](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/), [Llama](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/), [Rate limit](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

Font Montserrat dùng giấy phép SIL Open Font License trong `assets/montserrat-OFL.txt`.
