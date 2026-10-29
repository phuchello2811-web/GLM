# Máy chủ GLM dùng chung (Cloudflare Worker)

Worker này giữ API key Z.ai của bạn, để mọi người mở trang chat là dùng được GLM ngay, không cần key hay tài khoản. Cloudflare Workers miễn phí tới 100.000 lượt mỗi ngày.

Worker được cài sẵn mấy lớp bảo vệ:

- Key nằm trong biến bí mật trên Cloudflare, không có trong code và không ai xem được.
- Chỉ cho dùng các mô hình **miễn phí** (`glm-4.7-flash`, `glm-4.5-flash`, `glm-4.6v-flash`). Ai cố gọi mô hình trả phí cũng bị đổi về mô hình miễn phí, nên bạn không bao giờ mất tiền.
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

## Tuỳ chỉnh (không bắt buộc)

- **Cho phép thêm trang khác:** trong **Variables and Secrets**, thêm biến thường (kiểu Text) tên `ALLOWED_ORIGINS`. Giá trị là danh sách địa chỉ cách nhau bằng dấu phẩy, ví dụ `https://phuchello2811-web.github.io,http://127.0.0.1:5500`.
- **Đổi giới hạn lượt hỏi:** sửa `PER_MINUTE` ở đầu `worker.js`. Giới hạn này đếm riêng trên từng máy chủ của Cloudflare, nên chỉ chặn tương đối. Muốn chặn chính xác, thêm binding **Rate limiting** tên `LIMITER` trong thẻ **Bindings** (nếu tài khoản có), Worker sẽ tự dùng nó.
- **Xem ai đang dùng:** thẻ **Metrics** của Worker hiện số lượt gọi mỗi ngày.
- **Lỡ lộ key:** vào trang key của Z.ai, xoá key cũ và tạo key mới, rồi cập nhật lại `ZAI_API_KEY` ở bước 3.

## Giới hạn cần biết

- Mọi người dùng chung giới hạn lượt hỏi của **một** key. Trang giá của Z.ai không ghi rõ giới hạn cho mô hình miễn phí. Nếu nhiều người dùng cùng lúc mà gặp lỗi 429, đó là giới hạn của Z.ai, không phải lỗi của Worker.
- Việc kiểm tra trang gửi yêu cầu chỉ chặn được trình duyệt. Người rành kỹ thuật vẫn có thể giả địa chỉ trang để gọi Worker từ chương trình riêng. Vì Worker chỉ cho dùng mô hình miễn phí nên việc này không làm bạn tốn tiền, chỉ tốn lượt hỏi của key.
