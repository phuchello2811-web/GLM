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

**Trang chat online (`index.html`):**

Mở https://phuchello2811-web.github.io/GLM/ (hoặc mở `index.html` bằng **Go Live** trong VS Code). Muốn dùng như ứng dụng riêng, bấm **Cài thành ứng dụng** ở góc dưới thanh bên.

Trang dùng **GLM miễn phí** qua máy chủ chung (dựng theo [worker/README.md](worker/README.md)). Ai mở link cũng chat được ngay, không cần key hay tài khoản. Bấm nút tên mô hình trong khung chat (hoặc ở đầu trang) để chọn:

- **GLM-4.7 Flash**: mạnh nhất, mặc định.
- **GLM-4.5 Flash**: ít quá tải hơn, trả lời nhanh.
- **GLM-4.6V Flash**: bản đa phương thức, hay bị quá tải.

Mô hình nào quá tải hoặc trả lời quá chậm thì trang tự chuyển sang mô hình GLM khác. Trang chỉ dùng mô hình miễn phí, không có chỗ nhập API key. Trang không dùng mô hình tải về máy; muốn chạy offline thì dùng `./chat.sh` hoặc `./server.sh` ở trên.

Giao diện có lịch sử chat (lưu trong trình duyệt), hiện quá trình suy nghĩ của mô hình, nút dừng và tạo lại câu trả lời, chế độ sáng/tối. Vào **Cài đặt** để đổi lời nhắc hệ thống hoặc nhiệt độ.

Bật nút **Nghĩ kỹ** trong khung chat để mô hình tự kiểm tra và viết lại câu trả lời trước khi đưa ra kết quả cuối. Cách này chính xác hơn với toán và code, nhưng chậm gấp 2–3 lần.

Khi cần tính toán, mô hình tự viết code JavaScript hoặc Python. Trang chạy code đó ngay trong trình duyệt (cách ly, không truy cập mạng; Python chạy bằng [Pyodide](https://pyodide.org), có sẵn numpy, pandas, sympy) rồi đưa kết quả cho mô hình, nên phép tính luôn chính xác. Khi bạn nhờ viết code, mô hình chạy thử với vài ví dụ, tự sửa nếu lỗi, rồi mới đưa code cuối cùng. Code trong câu trả lời được tô màu cho dễ đọc. Khi cần thông tin thực tế (sự kiện, nhân vật, số liệu), mô hình tự tra Wikipedia tiếng Việt hoặc tiếng Anh rồi trả lời kèm nguồn. Mô hình cũng được dạy cách suy nghĩ: chia nhỏ bài toán, thử nhiều cách và tự kiểm tra trước khi trả lời. Nếu máy chủ ngắt kết nối giữa chừng, trang tự nối lại và cho mô hình viết tiếp. Muốn mô hình nhớ điều gì ở mọi đoạn chat, cứ nói "hãy nhớ: …". Danh sách ghi nhớ nằm trong **Cài đặt → Bộ nhớ**.

GLM được dạy thêm vài kỹ năng, tự bật khi câu hỏi đúng chủ đề:

- **Làm trang web:** viết trọn một file HTML. Bấm **Xem trước** dưới khối code để chạy thử ngay trong khung chat, hoặc **Tải về** để lấy file.
- **Làm slide:** slide dạng HTML, chuyển trang bằng phím mũi tên hoặc chạm; bấm **Toàn màn hình** để trình chiếu.
- **Vẽ hình:** logo, icon, biểu đồ được vẽ bằng SVG và hiện ảnh ngay trong chat.
- **Lập trình thi đấu (IOI, ICPC, Codeforces, HSG Tin):** phân tích ràng buộc và độ phức tạp, chọn thuật toán, viết C++17, rồi kiểm tra bằng cách so sánh với lời giải vét cạn trên test ngẫu nhiên (chạy bằng Python).

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
