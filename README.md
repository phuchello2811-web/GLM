# GLM Local — chạy mô hình GLM offline trên Mac Apple Silicon

Bộ script giúp chạy **GLM-Z1-9B-0414** (mô hình suy luận của Zhipu AI / Z.ai) hoàn toàn offline trên Mac chip M1/M2/M3/M4 bằng [llama.cpp](https://github.com/ggml-org/llama.cpp). Đã thử trên **MacBook M1, 8GB RAM**.

GLM-Z1 suy nghĩ từng bước trước khi trả lời, nên làm tốt các bài toán, lập trình và câu hỏi cần lập luận.

> **Vì sao không phải GLM-5.x?** GLM-5.2 có khoảng 753 tỷ tham số. Kể cả khi nén mạnh, nó vẫn cần hơn 200GB RAM, vượt xa khả năng của một chiếc Mac cá nhân. GLM-Z1-9B là bản suy luận lớn nhất của GLM chạy được trên máy 8GB.

## Yêu cầu

- Mac chip Apple Silicon (M1 trở lên), tối thiểu 8GB RAM
- Ổ đĩa còn trống khoảng 5GB
- [Homebrew](https://brew.sh)

## Cài đặt

```bash
git clone https://github.com/phuchello2811-web/GLM.git
cd GLM
./setup.sh
```

`setup.sh` cài llama.cpp qua Homebrew rồi tải mô hình (~4,1GB) vào thư mục `models/`. Chỉ cần mạng ở bước này, sau đó mọi thứ chạy offline.

## Sử dụng

**Trò chuyện trong Terminal:**

```bash
./chat.sh
```

Gõ câu hỏi rồi nhấn Enter. Nhấn `Ctrl+C` để thoát.

**Giao diện web trên trình duyệt:**

```bash
./server.sh
```

Mở http://127.0.0.1:8080. Server cũng có API tương thích OpenAI tại `http://127.0.0.1:8080/v1`, nên có thể nối với các ứng dụng hỗ trợ OpenAI API.

**Giao diện chat riêng (`index.html`):**

1. Chạy `./server.sh` và để Terminal đó mở.
2. Mở https://phuchello2811-web.github.io/GLM/ bằng Chrome. Lần đầu, nếu Chrome hỏi quyền truy cập thiết bị trong mạng cục bộ, chọn **Cho phép**. Cũng có thể mở `index.html` bằng **Go Live** trong VS Code.
3. Muốn dùng như ứng dụng riêng, bấm **Cài thành ứng dụng** ở góc dưới thanh bên.

Trang web chỉ là giao diện. Mô hình vẫn chạy trên máy bạn qua `./server.sh`, nên không có dữ liệu nào bị gửi lên mạng.

**Dùng online, không cần API key:** khi mở link trên, trang mặc định dùng **Puter**. Lần đầu gửi tin (hoặc bấm **Cài đặt → Đăng nhập Puter**), bạn đăng nhập tài khoản Puter miễn phí trong cửa sổ hiện ra là chat được với GLM, trên cả máy tính lẫn điện thoại. Lượt dùng tính vào tài khoản Puter của bạn.

**Dùng online với API key của riêng bạn:** vào **Cài đặt → Nguồn mô hình**, chọn **Z.ai**, rồi dán API key tạo miễn phí tại [z.ai](https://z.ai/manage-apikey/apikey-list). Các mô hình `glm-4.7-flash` và `glm-4.5-flash` miễn phí, `glm-5.3-flash` và `glm-5.3` mạnh hơn nhưng tính phí. Cách này dùng được cả trên điện thoại, nhưng tin nhắn sẽ được gửi tới máy chủ của Z.ai. Key chỉ lưu trong trình duyệt của bạn, không nằm trong code.

Giao diện có lịch sử chat (lưu trong trình duyệt), hiện quá trình suy nghĩ của mô hình, nút dừng và tạo lại câu trả lời, chế độ sáng/tối. Vào **Cài đặt** để đổi địa chỉ server, lời nhắc hệ thống hoặc nhiệt độ.

Bật nút **Nghĩ kỹ** cạnh ô nhập để mô hình tự kiểm tra và viết lại câu trả lời trước khi đưa ra kết quả cuối. Cách này chính xác hơn với toán và code, nhưng chậm gấp 2–3 lần.

Khi cần tính toán, mô hình tự viết code JavaScript. Trang chạy code đó ngay trong trình duyệt (cách ly, không truy cập mạng) rồi đưa kết quả cho mô hình, nên phép tính luôn chính xác. Muốn mô hình nhớ điều gì ở mọi đoạn chat, cứ nói "hãy nhớ: …". Danh sách ghi nhớ nằm trong **Cài đặt → Bộ nhớ**.

Muốn dạy mô hình theo văn phong hoặc kiến thức riêng của bạn, xem [FINETUNE.md](FINETUNE.md).

## Tuỳ chỉnh

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `MODEL_QUANT` | `IQ3_XS` | Mức nén. Máy 16GB nên dùng `Q4_K_M`, máy 24GB trở lên dùng `Q6_K` để mô hình trả lời tốt hơn |
| `CTX_SIZE` | `8192` | Độ dài ngữ cảnh (token). Giảm xuống `4096` nếu máy chậm |
| `PORT` | `8080` | Cổng của `server.sh` |

Ví dụ, trên máy 16GB:

```bash
MODEL_QUANT=Q4_K_M ./setup.sh
MODEL_QUANT=Q4_K_M ./chat.sh
```

## Lưu ý

- Với 8GB RAM, nên đóng bớt ứng dụng (đặc biệt là trình duyệt nhiều tab) khi chạy để mô hình không bị chậm.
- Bản nén 3-bit trả lời kém hơn bản gốc một chút. Đó là cái giá để vừa với 8GB RAM.
- Mô hình có thể trả lời sai. Hãy kiểm tra lại thông tin quan trọng.

## Nguồn và giấy phép

- Mô hình gốc: [THUDM/GLM-Z1-9B-0414](https://huggingface.co/THUDM/GLM-Z1-9B-0414) (giấy phép MIT)
- Bản GGUF: [bartowski/THUDM_GLM-Z1-9B-0414-GGUF](https://huggingface.co/bartowski/THUDM_GLM-Z1-9B-0414-GGUF)
- Bộ chạy: [llama.cpp](https://github.com/ggml-org/llama.cpp)
- Các script trong repo này: giấy phép MIT (xem [LICENSE](LICENSE))
