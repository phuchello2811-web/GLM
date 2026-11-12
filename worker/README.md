# Máy chủ GLM dùng chung (Cloudflare Worker)

Worker này giữ API key Z.ai của bạn, để mọi người mở trang chat là dùng được GLM ngay, không cần key hay tài khoản. Cloudflare Workers miễn phí tới 100.000 lượt mỗi ngày.

Worker được cài sẵn mấy lớp bảo vệ:

- Key nằm trong biến bí mật trên Cloudflare, không có trong code và không ai xem được.
- Chỉ cho dùng các mô hình **miễn phí**: `glm-4.7-flash`, `glm-4.5-flash`, `glm-4.6v-flash` của Z.ai, và `glm-5.3-flash` trên NVIDIA (bước 7). Ai cố gọi mô hình trả phí cũng bị đổi về mô hình miễn phí, nên bạn không bao giờ mất tiền.
- Chỉ nhận yêu cầu từ trang `phuchello2811-web.github.io`. Trang web khác không dùng ké được.
- Mỗi địa chỉ IP được hỏi tối đa 20 lần mỗi phút.
- Câu hỏi có ảnh luôn được gửi tới `glm-4.6v-flash` (mô hình đọc được ảnh). Mỗi đoạn chat tối đa 8 ảnh và 8MB.

## Bước 1: Lấy API key Z.ai

1. Vào https://z.ai/manage-apikey/apikey-list và đăng nhập.
2. Bấm **Create API Key**, đặt tên tùy ý, rồi chép key lại.

> Để an toàn tuyệt đối, **đừng nạp tiền** vào tài khoản Z.ai này. Khi đó key chỉ dùng được mô hình miễn phí, kể cả nếu bị lộ.

## Bước 2: Tạo Worker

1. Vào https://dash.cloudflare.com/sign-up và tạo tài khoản miễn phí (nếu chưa có).
2. Ở menu bên trái, chọn **Compute (Workers) → Workers & Pages**, rồi bấm **Create**.
3. Chọn **Start with Hello World!**. Đặt tên là `glm`, rồi bấm **Deploy**.
4. Bấm **Edit code**. Xoá hết code mẫu, dán toàn bộ nội dung file [`worker.js`](worker.js) vào, rồi bấm **Deploy**.

## Bước 3: Cài key vào Worker

1. Quay lại trang của Worker `glm`, chọn thẻ **Settings → Variables and Secrets**, rồi bấm **Add**.
2. **Type** chọn **Secret**. **Variable name** nhập `ZAI_API_KEY`. **Value** dán key ở bước 1.
3. Bấm **Deploy**.

## Bước 4: Kiểm tra

Mở địa chỉ của Worker. Nó hiện ở đầu trang Worker, dạng `https://glm.<tên-bạn>.workers.dev`.

Thấy dòng `Máy chủ GLM đang chạy` là được. Dán địa chỉ đó vào dòng `const SHARED_URL = "...";` trong `index.html`, rồi `git push`.

## Bước 5: Bật tạo ảnh (miễn phí)

Trang dùng mô hình **FLUX.2 [klein]** trên Cloudflare Workers AI để tạo ảnh và **sửa ảnh** (đổi nền, đổi phong cách, thêm bớt vật). Gói miễn phí (10.000 neuron mỗi ngày) vẽ được khoảng 90 ảnh 1024x1024 mỗi ngày. Nếu FLUX.2 lỗi, Worker tự dùng FLUX.1 [schnell].

1. Mở Worker `glm`, chọn thẻ **Bindings**, bấm **Add binding**.
2. Chọn **Workers AI**. **Variable name** nhập `AI`, rồi bấm **Add Binding** (hoặc **Deploy**).

Chưa bật thì trang tự dùng Pollinations. Pollinations cũng miễn phí nhưng ảnh kém hơn và không sửa được ảnh.

Nhớ dán lại `worker.js` mới nhất (bước 2) mỗi khi trang được cập nhật, rồi bấm **Deploy**.

## Bước 6: Bật đồng bộ lịch sử giữa các máy (miễn phí)

1. Ở menu bên trái của Cloudflare, chọn **Storage & Databases → D1 SQL Database**, bấm **Create**. Đặt tên `glm-sync`, rồi bấm **Create**.
2. Mở lại Worker `glm`, chọn **Bindings → Add binding → D1 database**. **Variable name** nhập `DB`, chọn database `glm-sync`, rồi bấm **Add Binding**.

Không cần tạo bảng, Worker tự tạo ở lần đồng bộ đầu tiên. Máy chủ chỉ lưu mã đồng bộ đã băm, không lưu mã thật.

Muốn dùng: trong trang chat, vào **Cài đặt → Đồng bộ giữa các máy → Bật đồng bộ**, chép mã, rồi trên máy kia chọn **Nhập mã → Kết nối**.

## Bước 7: Bật GLM-5.3 Flash và các mô hình NVIDIA (miễn phí)

GLM-5.3 Flash là thế hệ GLM-5, mạnh hơn GLM-4.7 Flash nhiều và đọc được ảnh. Cùng key này còn mở thêm Kimi K2.6, DeepSeek V4.1 Flash, MiniMax M3.1 Flash, Mistral Large 4 và Gemma 4 31B. NVIDIA cho dùng miễn phí khoảng 40 lượt mỗi phút cho cả tài khoản, không cần thẻ tín dụng.

1. Vào https://build.nvidia.com, bấm **Login** và tạo tài khoản NVIDIA miễn phí (cần xác minh số điện thoại).
2. Mở https://build.nvidia.com/settings/api-keys, bấm **Generate API Key**, rồi chép key (bắt đầu bằng `nvapi-`). Đừng dán key này cho ai, kể cả vào khung chat.
3. Mở Worker `glm`, chọn **Settings → Variables and Secrets → Add**. **Type** chọn **Secret**, **Variable name** nhập `NVIDIA_API_KEY`, **Value** dán key. Bấm **Deploy**.

Kiểm tra: hỏi một câu trong trang chat. Nếu dưới câu trả lời **không** có dòng "trả lời bằng GLM-4.7 Flash vì GLM-5.3 Flash đang bận hoặc chưa bật" là GLM-5.3 Flash đã chạy.

NVIDIA ghi rằng bản miễn phí dùng để thử nghiệm và phát triển, và có thể đổi điều kiện bất cứ lúc nào. Bản miễn phí hay quá tải (nhiều người báo trên diễn đàn NVIDIA): Worker chỉ chờ chữ đầu tiên tối đa 25 giây, không được thì trả lời bằng GLM-4.7 Flash của Z.ai và tạm bỏ qua mô hình đó 5 phút. Menu chọn mô hình hiện mô hình nào đang **Sẵn sàng** (Worker kiểm tra qua đường dẫn `/status`).

## Tuỳ chỉnh (không bắt buộc)

- **Cho phép thêm trang khác:** trong **Variables and Secrets**, thêm biến thường (kiểu Text) tên `ALLOWED_ORIGINS`. Giá trị là danh sách địa chỉ cách nhau bằng dấu phẩy, ví dụ `https://phuchello2811-web.github.io,http://127.0.0.1:5500`.
- **Đổi giới hạn lượt hỏi:** sửa `PER_MINUTE` ở đầu `worker.js`. Giới hạn này đếm riêng trên từng máy chủ của Cloudflare, nên chỉ chặn tương đối. Muốn chặn chính xác, thêm binding **Rate limiting** tên `LIMITER` trong thẻ **Bindings** (nếu tài khoản có), Worker sẽ tự dùng nó.
- **Xem ai đang dùng:** thẻ **Metrics** của Worker hiện số lượt gọi mỗi ngày.
- **Lỡ lộ key:** vào trang key của Z.ai, xoá key cũ và tạo key mới, rồi cập nhật lại `ZAI_API_KEY` ở bước 3.

## Giới hạn cần biết

- Mọi người dùng chung giới hạn lượt hỏi của **một** key. Trang giá của Z.ai không ghi rõ giới hạn cho mô hình miễn phí. Nếu nhiều người dùng cùng lúc mà gặp lỗi 429, đó là giới hạn của Z.ai, không phải lỗi của Worker.
- Việc kiểm tra trang gửi yêu cầu chỉ chặn được trình duyệt. Người rành kỹ thuật vẫn có thể giả địa chỉ trang để gọi Worker từ chương trình riêng. Vì Worker chỉ cho dùng mô hình miễn phí nên việc này không làm bạn tốn tiền, chỉ tốn lượt hỏi của key.
