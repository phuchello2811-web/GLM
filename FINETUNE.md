# Fine-tune GLM-Z1 trên Google Colab

Mac 8GB không đủ RAM để train mô hình 9B, nên ta train trên GPU miễn phí của Google Colab. Kết quả là một file **LoRA** nhỏ (vài chục MB). File này gắn thêm vào mô hình đang có trong `models/`, không cần tải lại mô hình 4GB.

## Fine-tune làm được gì

| Làm được | Không làm được |
|---|---|
| Trả lời theo văn phong, định dạng bạn muốn | Làm mô hình suy luận, giải toán giỏi hơn hẳn |
| Nắm thuật ngữ, quy trình trong lĩnh vực của bạn | Nhồi một lượng lớn kiến thức mới (dùng cách đính kèm tài liệu sẽ tốt hơn) |
| Đóng vai cố định (trợ lý chăm sóc khách hàng, gia sư…) | Sửa lỗi bằng vài ví dụ |

Cần chuẩn bị ít nhất **100–300 ví dụ tốt**. Dữ liệu ít hoặc kém sẽ làm mô hình tệ đi.

## Bước 1: Chuẩn bị dữ liệu

Tạo file `data.jsonl`. Mỗi dòng là một đoạn hội thoại mẫu:

```json
{"messages": [{"role": "user", "content": "Chính sách đổi trả thế nào?"}, {"role": "assistant", "content": "<think>Khách hỏi về đổi trả. Theo quy định cửa hàng là 7 ngày, cần hoá đơn.</think>Bạn được đổi trả trong 7 ngày kể từ ngày mua, chỉ cần mang theo hoá đơn."}]}
{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "<think>...</think>..."}]}
```

> **Quan trọng:** GLM-Z1 là mô hình suy nghĩ trước khi trả lời. Nên để một đoạn suy nghĩ ngắn trong `<think>…</think>` ở đầu mỗi câu trả lời mẫu. Nếu bỏ phần này, mô hình có thể quen trả lời không suy nghĩ và làm toán, lập luận kém đi.

Có thể thêm `{"role": "system", "content": "..."}` ở đầu nếu muốn dạy theo một lời nhắc hệ thống cố định.

## Bước 2: Mở Colab và chọn GPU

1. Vào https://colab.research.google.com, chọn **New notebook**.
2. Chọn **Runtime → Change runtime type → T4 GPU**, rồi **Save**.

Mỗi khối code dưới đây dán vào một ô (cell) và bấm ▶ để chạy, lần lượt từ trên xuống.

## Bước 3: Cài thư viện

```python
!pip install -q -U transformers peft trl bitsandbytes accelerate datasets
```

## Bước 4: Tải dữ liệu lên

```python
from google.colab import files
files.upload()  # chọn file data.jsonl trên máy bạn
```

## Bước 5: Train

```python
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig

BASE = "THUDM/GLM-Z1-9B-0414"

tokenizer = AutoTokenizer.from_pretrained(BASE)
model = AutoModelForCausalLM.from_pretrained(
    BASE,
    quantization_config=BitsAndBytesConfig(
        load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16,
    ),
    device_map="auto",
    torch_dtype=torch.float16,
)

dataset = load_dataset("json", data_files="data.jsonl", split="train")

trainer = SFTTrainer(
    model=model,
    processing_class=tokenizer,
    train_dataset=dataset,
    peft_config=LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "down_proj"],
    ),
    args=SFTConfig(
        output_dir="out",
        num_train_epochs=2,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=1e-4,
        max_length=1024,
        gradient_checkpointing=True,
        fp16=True,
        logging_steps=5,
        save_strategy="no",
        report_to="none",
    ),
)
trainer.train()
trainer.save_model("glm-lora")
```

- Lần đầu chạy, Colab tải mô hình gốc (~18GB) về, mất vài phút.
- Theo dõi cột `loss`: con số này nên giảm dần. Nếu nó xuống gần 0, mô hình đang học thuộc lòng dữ liệu. Khi đó giảm `num_train_epochs` xuống 1.
- Nếu báo hết bộ nhớ GPU (`CUDA out of memory`), giảm `max_length` xuống `512`.

## Bước 6: Chuyển LoRA sang định dạng của llama.cpp

```python
!git clone --depth 1 https://github.com/ggml-org/llama.cpp
!pip install -q -r llama.cpp/requirements/requirements-convert_lora_to_gguf.txt
!python llama.cpp/convert_lora_to_gguf.py glm-lora --base-model-id THUDM/GLM-Z1-9B-0414 --outtype f16 --outfile glm-lora.gguf

from google.colab import files
files.download("glm-lora.gguf")
```

## Bước 7: Dùng trên Mac

Chép `glm-lora.gguf` vào thư mục `models/` của repo này, rồi chạy:

```bash
./server.sh --lora models/glm-lora.gguf
```

Sau đó mở `index.html` bằng Go Live như bình thường. Muốn quay lại mô hình gốc thì chạy `./server.sh` không kèm `--lora`.

Nếu thấy LoRA tác động quá mạnh (trả lời lạ, lặp lại), giảm mức ảnh hưởng của nó:

```bash
./server.sh --lora-scaled models/glm-lora.gguf:0.5
```

## Kiểm tra kết quả

Chuẩn bị khoảng 10 câu hỏi **không có** trong dữ liệu train. Hỏi cùng các câu đó với mô hình gốc và với mô hình có LoRA rồi so sánh. Chỉ giữ LoRA nếu nó trả lời tốt hơn thật.

Đặc biệt nên thử vài bài toán, để chắc rằng fine-tune không làm hỏng khả năng suy luận vốn có.
