# LOCALINGO

**From Local to Global — Học tiếng Anh qua văn hóa Mộc Châu.**

LOCALINGO kết hợp bài học tiếng Anh với hình ảnh nhà sàn, đời sống và văn hóa của người Thái tại Mộc Châu. Người học khám phá từ vựng, luyện âm, ôn ngữ pháp và thực hành bốn kỹ năng thông qua các nhiệm vụ tương tác.

Giao diện sử dụng HTML, CSS và JavaScript modules. API Speaking chạy trên Cloudflare Workers, kết nối Workers AI để nhận dạng lời nói và góp ý câu trả lời.

## Chạy dự án

Yêu cầu **Node.js 22 trở lên** và npm. Chạy tại thư mục gốc:

```sh
npm ci
npm run dev
```

Mở [localhost:4173](http://localhost:4173). Các trang dùng JavaScript modules nên cần mở qua HTTP server. Để ghi âm, trình duyệt cần được cấp quyền micro và trang phải chạy trên localhost hoặc HTTPS.

Luồng học chính: **Home → Learn → Unit 2 · My House → chọn hoạt động**. Mục **Explore** cung cấp các bài khám phá văn hóa và câu hỏi trắc nghiệm.

Các bài học, audio và chức năng ghi âm hoạt động với máy chủ local. Phản hồi AI của Speaking cần môi trường Cloudflare có binding AI; khi chưa kết nối, người học vẫn có thể nghe, ghi âm, phát lại và chuyển câu.

## Nội dung hiện có

### Unit 2 · My House

| Hoạt động | Nội dung | Trang |
| --- | --- | --- |
| Vocabulary | Khám phá đồ vật trong nhà sàn, nghe phát âm và xem nghĩa tiếng Việt. | [My House](my-house.html#vocabulary) |
| Pronunciation | **The Bamboo Matcher**: ghép 8 thẻ thành 4 cặp cùng âm cuối, nghe audio và xem phiên âm IPA. | [Pronunciation](pronunciation.html) |
| Grammar | **The Magic’s Game**: 4 vòng sở hữu cách; **Thai Stilt House Tidy-Up**: 7 câu giới từ chỉ vị trí. | [Grammar](grammar.html) |
| Reading | **Secret Code Hunt – Who Am I?**: đọc email, thu thập gợi ý và giải câu đố; **Discover My Home**: đọc nhật ký và tìm địa điểm. | [Reading](reading.html) |
| Listening | **Alex’s Guidebook – The Missing Notes**: nghe hội thoại và nối 4 câu mô tả với đồ vật. | [Listening](listening.html) |
| Writing | **Explorer’s Journal – Write It Down!**: đọc email của Alex, gõ đáp án vào 6 chỗ trống và hoàn thành thư trả lời. | [Writing](writing.html) |
| Speaking | **Storyteller’s Camp**: 3 hoạt động, 5 câu hỏi; ghi âm và nhận phản hồi từ Banban. | [Speaking](speaking.html) |

**Pronunciation:** roofs, steps, baskets và mats thuộc nhóm âm cuối /s/; doors, windows, beads và clothes thuộc nhóm /z/. Hai từ bất kỳ cùng nhóm được tính là một cặp đúng. Chọn thẻ để nghe và lật sang phiên âm, nghĩa tiếng Việt. Thẻ đúng giữ mặt sau; thẻ sai úp lại để thử tiếp. Hoàn thành 4 cặp sẽ mở màn chúc mừng và Play Again để xáo thẻ chơi mới. Giao diện dùng nền giấy vàng, chữ nâu và nút bo tròn theo phong cách chung của My House.

**Listening:** phát file `LISTENING/1013.mp4` dưới dạng audio. Chọn câu mô tả rồi chọn ô ảnh; đường nối và ký hiệu thể hiện lựa chọn. Submit chỉ chấm khi đã nối đủ 4 cặp, phản hồi hiện bên dưới nút. Transcript mở sau lần kiểm tra đủ 4 cặp đầu tiên. Các ô ảnh trong game hiện là khung tạm có nhãn đồ vật, chờ thay bằng ảnh chính thức.

**Writing:** chấm chính tả và cách viết hoa; cho phép viết hoa chữ đầu, riêng `Pine Forest` phải đúng cách viết tên riêng. Có giải thích cho từng đáp án. Try again giữ câu đúng và cho sửa câu sai; đạt 6/6 sẽ mở bước gửi email mô phỏng và xem lại thư đã gửi.

**Speaking** gồm:

1. **Listen and repeat** — 2 câu hỏi, có audio câu hỏi và đáp án; không hiện đáp án mẫu bằng chữ.
2. **Complete and Speak** — 2 câu điền khuyết kèm từ gợi ý; học sinh nói cả câu hoàn chỉnh.
3. **Look, Think and Speak** — mô tả căn phòng bằng 2–3 câu. Sau 90 giây chưa có câu trả lời, Banban đưa gợi ý. Khi có phản hồi, trang hiển thị và đọc câu cải thiện dựa trên lời học sinh.

Dừng ghi âm sẽ tự gửi câu trả lời khi AI đã kết nối. Nút Next mở ngay sau lần ghi âm đầu tiên, kể cả khi đang chấm hoặc câu trả lời chưa đúng. Chuyển câu sẽ hủy phản hồi đang chờ; mở lại bài sẽ quay về câu chưa hoàn thành đầu tiên. Huy hiệu **Storyteller** được mở khi cả 5 câu đạt đánh giá.

### Explore

[Explore](explore.html) có **24 câu hỏi**, mỗi lượt chọn ngẫu nhiên **5 câu không trùng nhau**. Sau mỗi đáp án, trang hiển thị phản hồi rồi tự chuyển câu; cuối lượt hiện điểm trên 5. Mỗi lần vào lại bắt đầu một lượt mới.

Bốn chủ đề, mỗi chủ đề có 3 bài khám phá:

- [Nature & Wildlife](explore-nature-wildlife.html)
- [Local Food](explore-local-food.html)
- [People & Traditions](explore-people-tradition.html)
- [Festivals & Seasons](explore-festivals-seasons.html)

Các unit chưa có nội dung được đánh dấu **Coming soon** trên trang Learn.

## Cấu trúc mã nguồn

| Thành phần | Vị trí |
| --- | --- |
| Trang chủ và điều hướng | `index.html`, `learn.html`, `my-house.html` |
| Hoạt động học | Các file `pronunciation.*`, `grammar.*`, `reading.*`, `listening.*`, `writing.*`, `speaking.*` ở thư mục gốc |
| Giao diện chung | `styles.css`, `chrome.css`, `element-geometry.css`, `app.js` |
| Tiến độ và huy hiệu | `progress.js` |
| API và đánh giá Speaking | `worker.js`, `speaking-assessment.js`, `speech-analysis.js`, `audio.js` |
| Hình ảnh, font và media triển khai | `assets/`, `VOCABULARY/` |
| Máy chủ local, build và xử lý tài nguyên | `scripts/` |
| Kiểm thử | `tests/`, `playwright.config.js` |
| Cấu hình Cloudflare | `wrangler.jsonc` |
| Kết quả build | `dist/` — được tạo tự động và bỏ qua trong Git |

## Cập nhật bài học

### Nội dung

| Nội dung cần sửa | File |
| --- | --- |
| Từ, IPA, nghĩa và nhóm âm cuối của Bamboo Matcher | `pronunciation-content.js` |
| Câu mô tả, đồ vật và transcript Listening | `listening.js` |
| Nội dung Grammar | `grammar-content.js` |
| Email, nhật ký và câu hỏi Reading | `reading-content.js` |
| Email, đáp án và quy tắc chấm Writing | `writing.js` |
| Câu hỏi, đáp án chấp nhận và gợi ý Speaking | `missions.js` |
| Ngân hàng câu hỏi Explore | `questions.js` |
| Nội dung chữ của các trang chủ đề Explore | `scripts/explore-content.mjs` |

Trong `questions.js`, `answer` là chỉ số lựa chọn đúng, bắt đầu từ 0. Tài liệu Explore gốc đánh số 1–25 nhưng thiếu câu 12 nên ngân hàng có 24 câu; giữ nguyên các ID khi cập nhật. Khóa đáp án hiện được suy ra từ các lựa chọn trong tài liệu nguồn.

### Tài nguyên

Ba nhóm tài nguyên sau được tự đồng bộ khi chạy `npm run build`:

| Nguồn | Đầu ra | Script |
| --- | --- | --- |
| `PRONUNCIATION/*.mp3` — 8 audio | `assets/pronunciation/` | `scripts/prepare-pronunciation.mjs` |
| `LISTENING/1013.mp4` và `LISTENING/Ảnh 1.png` | `assets/listening/` | `scripts/prepare-listening.mjs` |
| Ba thư mục `ACT 1`, `ACT 2`, `ACT 3` trong `E. SPEAKING/Audio/` — 14 audio | `assets/speaking/audio/` | `scripts/prepare-speaking-audio.mjs` |

Giữ đúng tên file nguồn mà các script tham chiếu. Với hình ảnh thiết kế Writing và Explore, chạy lại các script sau khi thay nguồn tương ứng:

```sh
node scripts/prepare-writing.mjs
node scripts/prepare-explore.mjs
```

Hai script này dùng Sharp và cần đủ nguồn trong `WRITING/` hoặc `EXPLORE/`. Thư mục `EXPLORE/` và `TRANG LEARN/` được bỏ qua trong Git; bản tài nguyên đã chuẩn bị để triển khai nằm trong `assets/`.

Khi thêm một trang hoặc file JavaScript/CSS mới, cập nhật danh sách sao chép trong `scripts/build.mjs`. Thư mục `assets/` được sao chép đệ quy vào `dist/`.

## Speaking với Cloudflare Workers AI

API gọi hai mô hình qua binding `AI`:

| Mô hình | Vai trò |
| --- | --- |
| `@cf/openai/whisper-large-v3-turbo` | Chuyển bản ghi thành văn bản. |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Đánh giá nội dung, góp ý ngữ pháp và từ vựng, cải thiện câu trả lời. |

Dự án sử dụng Cloudflare Workers AI và không cần khóa API OpenAI. Để chạy môi trường Cloudflare, đăng nhập tài khoản có quyền sử dụng Workers AI:

```sh
npx wrangler login
npm run preview
```

Phản hồi phụ thuộc quyền truy cập và hạn mức AI của tài khoản. Endpoint trạng thái chỉ kiểm tra sự hiện diện của binding; cần gửi bản ghi để xác minh suy luận thực tế.

### API

| Endpoint | Chức năng |
| --- | --- |
| `GET /api/speaking/status` | Trả về trạng thái cấu hình AI. |
| `POST /api/speaking/assess` | Nhận câu trả lời và trả về đánh giá. |

Request đánh giá dùng JSON với `missionId` từ `house-1` đến `house-5`, `mode` là `audio` hoặc `text`, và `consent: true`. Chế độ audio nhận `audio` là WAV base64; chế độ text nhận `text` dài 5–2000 ký tự. Giao diện Speaking tự gửi bản ghi ở chế độ audio sau khi dừng ghi âm.

Trình duyệt chuyển bản ghi sang WAV mono PCM 16-bit, 16 kHz, dài 1–60 giây. API giới hạn request ở 3.000.000 byte, kiểm tra cấu trúc WAV và âm lượng, từ chối yêu cầu khác nguồn và kiểm tra kết quả AI. Binding `SPEAKING_LIMITER` được cấu hình 10 yêu cầu/phút theo IP.

### Tiến độ và giới hạn hiện tại

Thẻ tiến độ trên My House hiển thị số phần đã hoàn thành trên 7 phần học; Grammar và Reading được tính khi hoàn thành cả hai bài bên trong. Phần trăm và thanh tiến độ tăng dần theo số từ vựng đã nghe, bài Grammar/Reading đã xong và câu Speaking đã đạt; bộ đếm chỉ tăng khi hoàn tất cả phần. Learn cũng phản ánh tiến độ đang học trên tổng 4 unit. Các mốc trên thẻ có thể bấm để mở lại bài học; tiến độ được đọc lại khi quay về bằng nút Back của trình duyệt. Thanh Learn dùng cùng thiết kế, hiển thị số unit đã hoàn thành trên tổng 4 unit; kết quả bài nói được lưu để tính hoàn thành unit. My House được tính khi đã nghe hết 15 từ vựng, ghép xong Pronunciation, kết thúc cả hai game Grammar, hoàn thành cả hai hoạt động Reading, ghép đúng Listening, gửi thư Writing và đạt đủ 5 câu Speaking. Tiến độ được cộng dồn giữa các lần học; chơi lại không xóa phần đã hoàn thành. Các unit Coming soon chưa được tính chỉ vì người học mở thẻ.

- Tiến độ unit, các phần đã học, Speaking và câu trả lời Explore được lưu trong `localStorage` của từng trình duyệt. Huy hiệu dựa trên các câu Speaking đã đạt đánh giá.
- API không ghi bản thu vào kho lưu trữ của ứng dụng; audio và transcript không được lưu trong `localStorage`. Bản ghi tạm được giải phóng khi đổi câu hoặc rời trang.
- Đối chiếu từ nhận dạng giúp chọn từ cần luyện lại. Kết quả có thể chịu ảnh hưởng của nhận dạng giọng nói; hệ thống chưa chấm phát âm từng âm vị hoặc cho điểm trôi chảy.
- Lời chào và các phản hồi động dùng tổng hợp giọng nói của trình duyệt. Audio câu hỏi, đáp án và gợi ý có sẵn được phát từ tài nguyên dự án.

## Kiểm thử

Cài Chromium cho Playwright, sau đó chạy kiểm thử API và giao diện:

```sh
npx playwright install chromium
npm run test:api
npm test
```

Chạy riêng một hoạt động:

```sh
npm test -- tests/pronunciation.spec.js
npm test -- tests/listening.spec.js
```

Nếu dùng Chrome đã cài trên máy, có thể chọn trình duyệt đó trong PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm test
```

Playwright kiểm tra **desktop 1280 × 900** và **mobile 390 × 844**, gồm điều hướng, chấm bài, audio, micro, chơi lại, lưu tiến độ và ảnh chụp giao diện. Kiểm thử API và luồng phản hồi AI dùng binding giả lập; chúng không xác minh quyền hoặc hạn mức suy luận trên Cloudflare thật. Ảnh và kết quả nằm trong `test-results/`.

## Build và triển khai

```sh
npm run build
npm run deploy:check
npm run deploy
```

| Lệnh | Chức năng |
| --- | --- |
| `npm run build` | Đồng bộ tài nguyên và đóng gói frontend vào `dist/`. |
| `npm run deploy:check` | Chạy Wrangler dry-run để kiểm tra gói triển khai. |
| `npm run deploy` | Triển khai Worker và static assets lên Cloudflare. |

Wrangler đóng gói backend từ `worker.js`; thư mục `dist/` cung cấp static assets qua binding `ASSETS`. Các đường dẫn `/api/*` được chuyển qua Worker. Tên Worker hiện tại là **localligoo**; cấu hình gồm các binding `ASSETS`, `AI` và `SPEAKING_LIMITER`.

Nếu dùng **Cloudflare Workers Builds** nối với GitHub:

| Thiết lập | Giá trị |
| --- | --- |
| Root directory | Thư mục gốc repository |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Worker name | `localligoo` |

Git push cập nhật mã nguồn trên GitHub. Website được cập nhật qua Workers Builds khi đã kết nối, hoặc bằng deploy thủ công. Dry-run kiểm tra gói triển khai và không xác minh suy luận AI thực tế.

## Liên hệ và font

- Email: [localingo.workspace@gmail.com](mailto:localingo.workspace@gmail.com)
- Font Montserrat sử dụng SIL Open Font License; xem [giấy phép font](assets/montserrat-OFL.txt).
