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
git clone https://github.com/<tên-tài-khoản>/glm-local.git
cd glm-local
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
