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

Trang chat có tên **Astra AI**. Astra dùng máy chủ chung, dựng theo [worker/README.md](worker/README.md). Ai mở link cũng chat được ngay, không cần key hay tài khoản.

Các mô hình của Astra được đặt tên theo họ: cùng gốc thì cùng tên, giữ nguyên số phiên bản, vì chúng cùng dùng cách suy nghĩ, kỹ năng, công cụ và quy trình kiểm tra chéo riêng của Astra. Khi được hỏi, Astra tự giới thiệu là Astra và tên mô hình đang chạy. Bấm nút tên mô hình trong khung chat để chọn:

Nhóm **Mạnh nhất** (chạy trên NVIDIA, cần thêm key NVIDIA vào máy chủ theo [worker/README.md](worker/README.md)):

| Tên trong Astra | Mô hình gốc | Điểm mạnh |
| --- | --- | --- |
| **Titan 4 Mega** (mặc định) | GLM-5.3 Flash | mạnh nhất: suy luận, toán, code và đọc ảnh, trả lời nhanh |
| **Titan 3 Ultra** | Nemotron 3 Ultra | rất thông minh, suy luận, toán và code rất tốt |
| **Titan 3.5 Vision** | Nemotron 3.5 Super VL | đọc ảnh giỏi, suy nghĩ kỹ; câu hỏi có ảnh tự gửi tới mô hình này |
| **Lyra 4** | Mistral Large 4 | viết văn hay, dịch và dùng nhiều ngôn ngữ giỏi |
| **Titan 3.5 Lightning** | Nemotron 3.5 Lightning | giải thích dễ hiểu bằng ví dụ đời thường |
| **Forge XS** | Laguna XS | chuyên viết code, trả lời rất nhanh |
| **Atlas 5** | Step 5 | suy luận nhiều bước rất kỹ, trả lời chậm hơn |
| **Nova 5 Prime** | MiniMax M3.1 Flash | mạnh nhất dòng Nova: suy luận nhanh và chắc, toán, code, việc nhiều bước |

Nhóm **Nhanh và ổn định** (chạy trên Z.ai):

| Tên trong Astra | Mô hình gốc | Điểm mạnh |
| --- | --- | --- |
| **Nova 4.7** | GLM-4.7 Flash | ổn định, suy luận và viết code tốt |
| **Nova 4.5** | GLM-4.5 Flash | nhanh nhất, hợp câu hỏi ngắn và trò chuyện |
| **Nova 4.6 Vision** | GLM-4.6V Flash | đọc ảnh: ảnh chụp, tài liệu, biểu đồ |

Mỗi mô hình có **lời dặn điểm mạnh riêng** để phát huy sở trường và tránh lỗi hay mắc: Titan 4 Mega và Titan 3 Ultra lập luận chặt và luôn tự kiểm chứng; Titan 3.5 Vision và Nova 4.6 Vision đọc ảnh theo quy trình (nhìn tổng thể, quét từng vùng, chép nguyên văn chữ và số, đọc trục biểu đồ, nói rõ chỗ không đọc được); Lyra 4 viết tiếng Việt tự nhiên, dịch giữ nghĩa và giọng văn gốc; Titan 3.5 Lightning giải thích theo lớp bằng ví dụ đời thường; Forge XS viết code gọn kiểu production; Atlas 5 lập kế hoạch, ghi kết quả trung gian và kiểm tra từng chặng; Nova 5 Prime làm việc nhiều bước theo danh sách và luôn kiểm chứng câu khó. Dòng **Titan** còn có thêm **tay nghề làm slide** (xác định khán giả và mục tiêu, tra cứu số liệu thật, dàn ý theo câu chuyện, chọn bố cục theo nội dung, ít nhất 5 kiểu bố cục trong bài 10 slide, tự soát JSON và giới hạn chữ) và **tay nghề làm web** (thiết kế có hệ thống bằng biến CSS, HTML ngữ nghĩa, CSS từ điện thoại lên, JS theo lớp state, render, sự kiện, lưu trữ; chi tiết cao cấp; đi lại từng luồng như người dùng thật trước khi nộp), chỉ thêm khi câu hỏi là làm slide hoặc làm web. Lời dặn gắn theo mô hình thật sự trả lời, kể cả khi máy chủ tự đổi mô hình lúc quá tải hoặc nhiều mô hình cùng giải ở mức Tối đa, Ultra.

Mọi mô hình cũng được dạy **thói quen của người giỏi** cho câu khó: nhận diện dạng bài, ước lượng đáp số trước khi tính, tự đoán 2 chỗ dễ sai nhất rồi kiểm tra riêng, tránh các lỗi tư duy hay gặp (bám ý đầu tiên, nhầm điều kiện cần và đủ, coi tương quan là nhân quả…), đổi góc nhìn khi bế tắc, lập danh sách yêu cầu cho việc dài và nói rõ mức chắc chắn.

Ba mô hình nhóm Nhanh và ổn định có thêm lời dặn riêng cho những lỗi chúng hay mắc. Khi suy nghĩ, chúng đi theo khung Đề → Bẫy → Cách 1 → Cách 2 → Đối chiếu → Kết luận. Chúng phải thử phản bác đáp án đầu tiên, tính bằng code thay vì tính nhẩm, và không chen chữ Hán. Ở mức Cân bằng, chúng còn tự chấm lại rồi sửa câu trả lời một lượt với các câu toán, logic, lập trình và câu cần lập luận. Mọi mô hình đều học thêm cách chọn chiến lược theo loại câu hỏi và tự soát trước khi gửi.

**Bốn chế độ** (nút cạnh tên mô hình, hoặc bấm thẻ ở màn hình chào; mỗi chế độ có sẵn vài câu hỏi mẫu):

- **Auto**: tự nhận ra bạn đang hỏi gì và dùng đúng kỹ năng.
- **Life** (vấn đề đời sống): sức khoẻ, tiền bạc, giấy tờ thủ tục, nấu ăn, học hành, công việc, chuyện gia đình và tâm lý. Astra nói chuyện như một người bạn thực tế: hiểu đúng hoàn cảnh, đưa các bước làm được ngay kèm con số cụ thể, và tra cứu những thông tin hay thay đổi.
- **Studio** (làm website): luôn bật kỹ năng làm web, phát triển ứng dụng web lớn, dự án nhiều file, kiến thức web và vẽ SVG.
- **Arena** (lập trình thi đấu): luôn bật kỹ năng IOI, lập trình và toán. Lời giải được kiểm tra bằng cpp-run, đối chiếu với lời giải trâu trước khi nộp.

Danh sách trên đã được kiểm tra trả lời được ngày 13/11/2026. Titan 4 Mega được chọn làm mặc định sau bài kiểm tra 5 câu toán khó (không dùng công cụ): đúng 5/5, trung bình khoảng 27 giây mỗi câu, so với Titan 3 Ultra đúng 4/5 và chậm hơn. **Nova 5 Prime** (MiniMax M3.1 Flash, thêm ngày 14/11/2026) được chọn sau khi so với Nova 4.7 trên 3 bài toán, logic và code: đúng cả 3 (14–63 giây mỗi câu), còn Nova 4.7 có câu không trả lời sau hơn 14 phút vì Z.ai quá tải. Trên Z.ai, các mô hình mạnh hơn (GLM-4.7 bản đầy đủ, GLM-5.x) đều cần trả phí nên không dùng được. DeepSeek V4.1 Flash trên NVIDIA đang quá tải; Kimi K2.6 và Nemotron 3 Super đã bị NVIDIA gỡ khỏi bản miễn phí, nên chưa có trong menu. Khi mở menu, mỗi mô hình mạnh có nhãn **Sẵn sàng** hoặc **Đang quá tải**. Mô hình nào không trả lời trong 25 giây thì máy chủ trả lời bằng Nova 4.7, ghi lý do dưới câu trả lời, và tạm bỏ qua mô hình đó 5 phút.

Mô hình nào quá tải hoặc trả lời quá chậm thì trang tự chuyển sang mô hình GLM khác. Trang chỉ dùng mô hình miễn phí, không có chỗ nhập API key. Trang không dùng mô hình tải về máy; muốn chạy offline thì dùng `./chat.sh` hoặc `./server.sh` ở trên.

Giao diện có lịch sử chat (lưu trong trình duyệt), hiện quá trình suy nghĩ của mô hình, nút dừng và tạo lại câu trả lời, chế độ sáng/tối. Vào **Cài đặt** để đổi lời nhắc hệ thống hoặc nhiệt độ.

Nút **Mức suy nghĩ** (biểu tượng bóng đèn) trong khung chat mở một thanh trượt 5 nấc (kéo, bấm hoặc dùng phím mũi tên; bấm vào tên mức để xem giải thích):

- **Nhanh**: trả lời ngay, không suy nghĩ dài. Hợp chào hỏi, câu đơn giản.
- **Cân bằng** (mặc định): suy nghĩ bình thường. Mô hình GLM tự chấm lại câu toán, logic, lập trình thi đấu.
- **Kỹ** (4 bước, khoảng 1–3 phút): phân tích đề (yêu cầu, dữ kiện, bẫy, kế hoạch, cách kiểm chứng) → giải theo kế hoạch với suy nghĩ ở mức cao nhất → một mô hình khác đóng vai người chấm, soát từng bước và chạy code kiểm chứng → sửa lỗi và viết câu trả lời cuối (người chấm không thấy lỗi thì giữ nguyên).
- **Tối đa** (5 bước, khoảng 3–8 phút): phân tích đề → **ba mô hình giải song song** (mô hình đang chọn và hai mô hình mạnh khác họ), mỗi mô hình một góc nhìn: giải bình thường, giải theo hướng khác, đóng vai người phản biện tìm bẫy → **kiểm tra chéo**: cả ba mô hình soát tất cả lời giải và chạy code kiểm chứng → mô hình đang chọn tổng hợp, tự kiểm chứng chỗ khác nhau (không tin theo số đông) và viết câu trả lời → một mô hình khác **kiểm tra lần cuối**, còn lỗi thì sửa thêm một lượt. Bước nào quá chậm thì bị dừng đúng hạn và dùng phần đã viết.
- **Ultra** (8 bước, hết công suất): phân tích đề → vòng 1: **bốn mô hình** giải độc lập → vòng 2: các mô hình **trao đổi suy luận**, đọc lời giải của cả nhóm, kiểm chứng chỗ mâu thuẫn bằng code rồi viết lại lời giải đã cải tiến → so sánh kết luận, **còn bất đồng thì thêm vòng 3** chỉ bàn về chỗ bất đồng → giám khảo tổng hợp → ba mô hình khác **kiểm tra chéo** → giám khảo **tinh chỉnh** theo nhận xét → kiểm tra lần cuối (sửa xong thì kiểm lại thêm một lượt). Khi yêu cầu là **xây dựng phần mềm** (làm web, app, game, công cụ), Ultra làm như một lập trình viên chuyên nghiệp, theo 7 bước:
  1. viết **kế hoạch Markdown** (mục tiêu, yêu cầu, công nghệ, kiến trúc, cấu trúc thư mục, các giai đoạn kèm tiêu chí hoàn thành, kiểm thử, rủi ro);
  2. một kỹ sư khác **phản biện kế hoạch**, rồi kế hoạch được cải tiến;
  3. **code theo từng giai đoạn**, chạy thử và sửa lỗi ngay sau mỗi giai đoạn;
  4. hai mô hình khác **rà soát code**;
  5. sửa theo kết quả rà soát;
  6. **chạy thử toàn bộ** (trang web) hoặc viết và chạy kiểm thử (code khác);
  7. tổng hợp. Câu trả lời cuối có đủ mọi file, kèm `PLAN.md`.

  **Lưu ý: Ultra chạy rất lâu (khoảng 6–30 phút), chỉ dùng cho bài khó hoặc việc lớn.**

Các lời giải nháp vẫn xem được bên trên câu trả lời, kèm tên mô hình.

Khi cần tính toán, mô hình tự viết code JavaScript, Python hoặc C++. Code C++ được biên dịch và chạy thật bằng GCC qua [Compiler Explorer](https://godbolt.org) (code được gửi lên trang đó). Với bài lập trình thi đấu, mô hình bắt buộc chạy một chương trình C++ so sánh lời giải với vét cạn trên ví dụ của đề và vài trăm test ngẫu nhiên, rồi chỉ nộp đúng code đã qua kiểm tra. Trang chạy code đó ngay trong trình duyệt (cách ly, không truy cập mạng; Python chạy bằng [Pyodide](https://pyodide.org), có sẵn numpy, pandas, sympy) rồi đưa kết quả cho mô hình, nên phép tính luôn chính xác. Khi bạn nhờ viết code, mô hình chạy thử với vài ví dụ, tự sửa nếu lỗi, rồi mới đưa code cuối cùng. Code trong câu trả lời được tô màu cho dễ đọc. Khi cần thông tin thực tế, mô hình tự tra cứu rồi trả lời kèm nguồn. Câu hỏi có chữ như "hiện nay", "mới nhất", "hôm nay", "giá"… thì bắt buộc phải tra, vì kiến thức có sẵn của mô hình đã cũ. Các nguồn (đều miễn phí, không cần key):

- **Wikipedia và web cùng lúc** (Wikipedia tiếng Việt/Anh và tìm kiếm DuckDuckGo), và **đọc nội dung trang web** qua [Jina Reader](https://jina.ai/reader). Bạn có thể dán đường dẫn để mô hình đọc.
- **Tin tức mới nhất** kèm ngày đăng (Bing News).
- **Nghiên cứu sâu:** với câu hỏi phức tạp, GLM tìm tối đa 4 truy vấn cùng lúc, tự đọc các trang tốt nhất và trích đoạn liên quan, rồi tổng hợp kèm nguồn.
- **Thời tiết** hiện tại và 3 ngày tới ([Open-Meteo](https://open-meteo.com)).
- **Tỷ giá ngoại tệ** ([ExchangeRate-API](https://www.exchangerate-api.com)).
- **Bài báo khoa học** ([OpenAlex](https://openalex.org)), gồm tóm tắt, tác giả, số trích dẫn.
- **Kiến thức thực tế:** thủ tục, giấy tờ, luật, thuế, bảo hiểm, tài chính cá nhân, sức khoẻ và sơ cứu, công nghệ, nấu ăn, sửa chữa, học tập, việc làm, du lịch. GLM đưa các bước cụ thể làm được ngay, và với quy định, phí, giá cả thì tra cứu bản mới nhất (kể cả Cổng Dịch vụ công, văn bản pháp luật) rồi ghi rõ nguồn.
- **Lập trình:** câu hỏi và câu trả lời hay nhất trên Stack Overflow, cùng kho mã trên GitHub.
- **Từ điển tiếng Anh** ([Wiktionary](https://en.wiktionary.org)).

Các trang đã tra hiện thành danh sách **Nguồn** dưới câu trả lời. Từ khoá tra cứu được gửi tới các dịch vụ trên. Mô hình cũng được dạy cách suy nghĩ: hiểu đề, chia thành câu hỏi con, thử ít nhất hai hướng, kiểm chứng kết quả bằng một cách độc lập (chạy code, thay ngược, vét cạn) và nói rõ mức độ chắc chắn. Bài toán, xác suất và câu đố logic được kiểm lại bằng sympy hoặc vét cạn. Nếu máy chủ ngắt kết nối giữa chừng, trang tự nối lại và cho mô hình viết tiếp. Nếu câu trả lời bị ngắt giữa khối code (khối chưa đóng, trang HTML thiếu thẻ đóng, code thiếu dấu `}`), trang tự cho viết tiếp đúng vào dòng đang dở. Phần mô hình lặp lại được bỏ đi, dù lặp theo từng dòng, giữa dòng hay viết lại cả khối từ đầu. Viết tiếp không được thì trang đổi cách: gửi phần cuối ngắn hơn, rồi nhờ viết lại trọn file đang dở. Với dự án nhiều file, trang còn tự tìm các file được trang dẫn tới (link, script, fetch) hoặc có trong sơ đồ thư mục mà chưa viết, cùng các file bị cắt hay JSON sai, rồi nhờ viết nốt. Chỉ khi thật sự không tiến thêm được mới hiện nút **Viết tiếp** (ghi rõ file nào còn thiếu). Bấm nút thì câu trả lời được viết nốt ngay tại chỗ, không tạo tin nhắn mới, rồi chạy thử lại. Muốn mô hình nhớ điều gì ở mọi đoạn chat, cứ nói "hãy nhớ: …". Danh sách ghi nhớ nằm trong **Cài đặt → Bộ nhớ**.

**Kho kiến thức, đồng bộ:**

- **Kho kiến thức:** **Cài đặt → Kho kiến thức → Thêm tài liệu** (PDF, Word, Excel, văn bản). Mỗi câu hỏi, Astra tự tìm đoạn liên quan trong kho và ghi rõ tài liệu đã dùng. Tài liệu chỉ lưu trong trình duyệt.
- **Học từ câu trả lời được thích:** khi bạn hỏi câu giống câu cũ, các câu trả lời bạn đã bấm thích được dùng làm mẫu, để Astra trả lời đúng văn phong bạn muốn.
- **Tạo và sửa ảnh:** nhờ "vẽ…" hoặc "tạo bức tranh…", GLM tự viết mô tả chi tiết và chọn khổ ảnh (vuông, ngang 16:9, dọc 9:16…). Có thể xin **nhiều phiên bản cùng lúc** (2–4 ảnh hiện thành lưới), **ảnh cỡ lớn**, và **phong cách có sẵn** (ảnh thật, anime, Ghibli, màu nước, sơn dầu, 3D, pixel art, phác thảo chì, điện ảnh, cyberpunk, poster). Dưới mỗi ảnh ghi số seed để vẽ lại đúng ảnh đó. Trên mỗi ảnh có nút **Tải về**, **Vẽ lại** (cùng mô tả, ảnh khác) và **Sửa** (gõ thay đổi, ví dụ "đổi nền thành bãi biển"). Ảnh do FLUX.2 trên Cloudflare vẽ; sửa ảnh cần bật Workers AI theo [worker/README.md](worker/README.md).
- **Xuất file PowerPoint, Excel, Word:** nhờ "làm file PowerPoint…", "tạo file Excel…" hoặc "xuất file Word…". Câu trả lời hiện một thẻ file có nút **Tải về**, file được tạo ngay trong trình duyệt: PowerPoint xem mục Làm slide; Excel có nhiều trang tính và công thức (tự tính khi mở); Word có tiêu đề, danh sách và bảng.
- **Đồng bộ giữa các máy:** **Cài đặt → Đồng bộ giữa các máy**. Cần bật trên Cloudflare theo [worker/README.md](worker/README.md).
- **Sắp xếp đoạn chat:** bấm nút `⋯` cạnh đoạn chat để ghim, đổi tên, chuyển vào thư mục. GLM tự đặt tên đoạn chat sau câu trả lời đầu tiên.

**Tiện ích khác:**

- **Công thức toán** hiển thị như trong sách (KaTeX).
- **Nói thay vì gõ:** bấm nút micro trong khung chat và nói tiếng Việt (Chrome, Edge, Safari).
- **Đọc to** câu trả lời: bấm nút loa dưới câu trả lời, bấm lần nữa để dừng.
- **Sửa câu hỏi đã gửi:** rê chuột vào câu hỏi rồi bấm nút bút chì; các câu phía sau bị bỏ và GLM trả lời lại.
- **Tìm trong lịch sử chat** theo tên hoặc nội dung, không cần gõ dấu.
- **Tải đoạn chat về** dạng Markdown bằng nút tải xuống ở góc trên.

**Gửi ảnh và file:** bấm nút kẹp giấy trong khung chat, kéo thả vào khung chat, hoặc dán ảnh bằng `Cmd+V`.

- **Ảnh** (tối đa 4 ảnh mỗi tin): **GLM-5.3 Flash** đọc ảnh trực tiếp. Khi chọn mô hình khác, hoặc GLM-5.3 Flash chưa bật, trang chuyển sang **GLM-4.6V Flash** (mô hình miễn phí của Z.ai đọc được ảnh). Ảnh được thu nhỏ trước khi gửi.
- **File:** đọc được văn bản, code, CSV, JSON, PDF có chữ (PDF scan thì chụp từng trang gửi dạng ảnh), Word `.docx` và Excel. File được đọc ngay trong trình duyệt rồi gửi phần chữ cho mô hình, tối đa khoảng 60.000 ký tự mỗi file.
- Ảnh và file được lưu cùng lịch sử chat. Khi bộ nhớ trình duyệt đầy, ảnh và file của các đoạn chat cũ nhất sẽ bị xoá trước.

GLM được dạy thêm vài kỹ năng, tự bật khi câu hỏi đúng chủ đề:

- **Phát triển web hoàn chỉnh:** mọi yêu cầu làm hoặc **nâng cấp** web, ứng dụng, dashboard, game mặc định thành **sản phẩm hoàn chỉnh dạng dự án nhiều file** (ES module), trừ khi bạn nói rõ "chỉ cần 1 file". Mô hình làm **vượt kỳ vọng**: liệt kê yêu cầu bạn nói và yêu cầu ngầm (chạy trên điện thoại, lưu lại, chế độ tối, tìm kiếm…), tự thêm 3–5 tính năng nổi bật hợp chủ đề (ví dụ web hoá học: bảng tuần hoàn bấm được, mô phỏng phản ứng, quiz có giải thích) và đánh dấu chúng ở cuối câu trả lời; mọi nút, liên kết, menu, form phải chạy thật. Kèm **cẩm nang phát triển web** (quy trình, cấu trúc mô-đun, các lỗi làm nút bấm "chết" như `onclick` trong HTML khi dùng module hay lớp phủ che nút, an toàn, trợ năng, hiệu năng, dữ liệu) và hướng dẫn **giao diện, hoạt ảnh, tính năng cao cấp** (hướng thẩm mỹ theo chủ đề, font hỗ trợ tiếng Việt, kính mờ, hiện dần khi cuộn, View Transitions, hiệu ứng nền, tìm kiếm Ctrl+K, nội dung tương tác, PWA). Thiết kế chuyên nghiệp, chế độ tối, dùng được bằng bàn phím, biểu tượng SVG (Lucide), ảnh minh hoạ do AI vẽ. Sau khi viết, trang **tự chạy thử** trong khung điện thoại: bắt lỗi JavaScript, bấm thử mọi nút, phát hiện **nút bị phần tử khác che** (bấm không trúng), kiểm tra tràn ngang; có lỗi thì tự sửa (tối đa 2 lượt). Bấm **Chạy thử** / **Xem trước** để dùng ngay.
- **Không còn câu trả lời trống hay lỗi "Prompt exceeds max length":** nếu mô hình chỉ suy nghĩ mà không viết câu trả lời, trang tự nhờ viết lại ngay (không suy nghĩ dài), vẫn trống thì báo rõ để bạn bấm Tạo lại. Nếu máy chủ báo lời nhắc quá dài (mô hình nhỏ như Nova 4.5), trang tự rút gọn hai mức (bỏ phần dặn dò phụ, cắt bớt lịch sử và code cũ) rồi gửi lại.
- **Ứng dụng web lớn:** Astra được dạy kiến trúc phía trình duyệt (store chứa state, lớp dữ liệu có phiên bản, định tuyến theo hash, gán sự kiện theo kiểu uỷ quyền). Astra cũng học các tính năng nền tảng mà sản phẩm thật luôn có (tìm kiếm, lọc, sắp xếp, phân trang, hoàn tác, xuất và nhập dữ liệu, phím tắt) và form chuyên nghiệp. Với từng loại sản phẩm (bán hàng, dashboard, đặt lịch, blog, quiz, Kanban, mạng xã hội, đăng nhập), Astra biết danh sách tính năng tối thiểu. Ngoài ra còn hiệu năng, PWA, SEO, cách làm máy chủ Node.js, và tự đi qua từng luồng như người dùng thật trước khi nộp.
- **Kỹ sư phần mềm:** Astra học thêm thiết kế (tách lớp, SOLID, mẫu thiết kế), xử lý lỗi, kiểm thử, bất đồng bộ, hiệu năng, cơ sở dữ liệu, thiết kế API, bảo mật OWASP, cách viết đúng chuẩn từng ngôn ngữ (Python, JS/TS, Java, C++, Go, Rust, SQL), Git, CI và Docker.
- **Nút Chạy trên khối code:** khối code Python, JavaScript, C++ trong câu trả lời có nút **Chạy**, kết quả hiện ngay bên dưới (Python chạy trong trình duyệt, C++ chạy trên Compiler Explorer). Khối code có tên file có thêm nút **Tải file**.
- **Dự án web nhiều file:** website nhiều trang hoặc khi bạn muốn tách file, mô hình viết sơ đồ thư mục trước rồi viết đủ từng file theo thứ tự phụ thuộc (`index.html`, các trang con, `css/`, `js/`, `data/*.json`, `README.md`), mỗi file một khối code có tên file, rồi tự đối chiếu để không sót file nào. JS có thể dùng script thường hoặc **ES module** (`import`/`export` giữa các file): khung chạy thử chạy được cả hai, kể cả import lồng nhiều thư mục. Nếu mô hình quên ghi tên file ở khối code, trang tự suy ra tên từ dòng chú thích đầu khối, dòng tiêu đề phía trên hoặc sơ đồ thư mục, nên dự án vẫn ghép đủ. Trang cũng phát hiện file được `import` mà chưa viết để nhờ viết nốt. Dưới câu trả lời hiện **thẻ dự án** có cây thư mục và các nút: **Chạy thử** chạy cả dự án ngay trong chat (bấm link giữa các trang vẫn chuyển được, fetch đọc được file JSON, chọn trang, đổi khổ thiết bị), **Xem code** và **Tải .zip**. Khi nhờ sửa, mô hình chỉ viết lại các file thay đổi, trang tự ghép với các file cũ; bản tự sửa lỗi quên tên file cũng được ghép đúng file cũ.
- **Trình xem code kiểu VS Code** (nút **Xem code**): khung nổi bo tròn theo phong cách Astra, dùng cùng bảng màu với trang và tự theo giao diện sáng hoặc tối. Có thanh hoạt động (Explorer, Tìm kiếm), cây thư mục với icon theo loại file và **đánh dấu kiểu Git** (**U** file mới, **M** file vừa sửa so với lần trả lời trước), tab, số dòng, tô màu cú pháp. Phím tắt: **Ctrl+P** mở nhanh file, **Ctrl+G** nhảy tới dòng, **Ctrl+F** tìm trong file (tô sáng mọi chỗ khớp, Enter để sang chỗ sau), **Ctrl+Shift+F** tìm trong cả dự án, **Alt+Z** tự xuống dòng, **Ctrl+=** / **Ctrl+-** cỡ chữ, **Ctrl+B** ẩn hiện thanh bên, **Esc** đóng. Dự án web có **xem trước ngay bên cạnh code** (đổi trang, khổ điện thoại, tải lại); file Markdown và SVG xem được ở dạng đã hiển thị. Bấm số dòng để đánh dấu dòng; sao chép, tải từng file, tải .zip, chạy thử. Trên điện thoại, thanh bên mở bằng nút ☰.
- **Khung chat Astra trong trình xem code** (nút ngôi sao nhỏ ở góc trên, hoặc **Ctrl+I**): giống khung Claude trong VS Code, mở bên phải code. Ô nhập tự kèm **ngữ cảnh** là file đang xem và đoạn code đang bôi đen (bấm × để bỏ); khi chưa hỏi có sẵn gợi ý (giải thích cấu trúc, tìm lỗi, thêm tính năng, tối ưu). Câu trả lời hiện ngay khi Astra đang viết; tin nhắn đi qua đúng luồng chat chính nên vẫn có suy nghĩ, công cụ, tự kiểm tra và được lưu trong đoạn chat. Khi Astra sửa file, bấm **Mở bản dự án mới** để xem ngay, file vừa sửa được đánh dấu **M**. Enter gửi, Shift+Enter xuống dòng, nút dừng khi đang trả lời, Esc đóng khung.
- **Làm game:** nhờ "làm game…". Mô hình thiết kế vòng chơi trước (mục tiêu, cách thua, tiến trình, độ khó tăng dần), rồi viết theo kiến trúc chuẩn: vòng lặp bước thời gian cố định, máy trạng thái cảnh (menu, chơi, tạm dừng, thua), thực thể và object pool, va chạm, điều khiển cả bàn phím lẫn cảm ứng, canvas sắc nét theo màn hình, **âm thanh tự tạo bằng Web Audio** (không cần file), hiệu ứng phản hồi (rung màn hình, hạt nổ, số điểm bay lên), lưu kỷ lục. Game nhỏ là một file HTML; game lớn là dự án nhiều file dùng ES module (`js/core`, `js/scenes`, `js/entities`, `config.js`) và chạy thử được ngay trong chat. Sau khi viết, trang **tự thử chơi**: chạm giữa màn hình, bấm nút Bắt đầu nếu có, Enter, Space, giữ phím mũi tên, rồi so hình trên canvas trước và sau. Game đứng yên ở màn hình bắt đầu, không phản hồi hoặc màn hình trống thì bị coi là lỗi và mô hình tự sửa (game bấm chuột như cờ caro vẫn được nhận là có phản hồi; trang không phải game như biểu đồ thì không bị thử). Khung chạy thử giờ chạy đủ 60 khung hình mỗi giây (trước đây khung bị giấu nên vòng lặp game không chạy), nên lỗi xảy ra lúc đang chơi cũng bị bắt.
- **Làm slide:** nhờ "làm bài thuyết trình về…". GLM tra cứu số liệu trước, rồi viết nội dung theo mạch kể chuyện; trang tự dựng slide bằng bộ khung có sẵn nên luôn đẹp và đồng bộ: 8 bộ màu (midnight, ocean, sunset, forest, minimal, corporate, neon, warm), nhiều kiểu slide (tiêu đề, chia phần, gạch đầu dòng, hai cột, bảng, biểu đồ cột/đường/tròn, số liệu nổi bật, thẻ có biểu tượng, dòng thời gian, trích dẫn, slide kết), chữ tự co cho vừa slide. Bấm **Trình chiếu** để xem ngay trong chat với hiệu ứng (chữ hiện dần, chuyển slide, số liệu đếm tăng, biểu đồ tự vẽ; phím ← →, F toàn màn hình, N xem ghi chú), hoặc tải **PowerPoint** (có hiệu ứng chuyển slide và ghi chú người thuyết trình) hay **HTML**.
- **Vẽ hình:** logo, icon, biểu đồ được vẽ bằng SVG và hiện ảnh ngay trong chat.
- **Tư duy lập trình (mọi mô hình):** biến yêu cầu thành tiêu chí kiểm tra được, chọn cấu trúc dữ liệu và giao diện hàm trước khi code, làm từng bước nhỏ chạy được, chỉ dùng API chắc chắn có thật, giữ bất biến và xét trường hợp biên, đọc lại như người rà soát khó tính, kiểm thử thật bằng công cụ. Tay nghề làm web và slide mức chuyên gia (trước chỉ dòng Titan có) nay dùng cho mọi mô hình.
- **Lập trình:** nắm rõ yêu cầu, viết code sạch có xử lý lỗi và trường hợp biên, chạy thử bằng Python, JavaScript hoặc C++ trước khi đưa code cuối; gỡ lỗi theo các bước tái hiện, tìm nguyên nhân, sửa đúng gốc, chạy lại; chú ý bảo mật và độ phức tạp.
- **Toán:** giải theo chiến lược Polya và kỹ thuật riêng từng phân môn (đại số, bất đẳng thức, hình học, số học, tổ hợp, giải tích, xác suất), kiểm chứng bằng sympy hoặc vét cạn, trình bày kiểu bài làm (điều kiện, lời giải, đáp số) và loại nghiệm ngoại lai.
- **Phát triển web và tư duy suy luận:** kiến thức về HTML, CSS, JavaScript hiện đại, hiệu năng, bảo mật, React, Vue, Tailwind, backend, cơ sở dữ liệu và triển khai; các khung suy luận (tách sự thật và giả định, nhân quả, xác suất có điều kiện, ước lượng, ra quyết định, tránh ngụy biện).
- **Lập trình thi đấu (IOI, ICPC, Codeforces, HSG Tin):** phân tích ràng buộc và độ phức tạp, chọn thuật toán, viết C++17, rồi chạy C++ thật để so sánh với lời giải vét cạn trên ví dụ của đề và vài trăm test ngẫu nhiên trước khi nộp.

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
