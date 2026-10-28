# Cấu hình dùng chung cho các script.
# IQ3_XS (~4,4GB) vừa với Mac 8GB RAM. Máy 16GB trở lên có thể đổi sang Q4_K_M hoặc Q6_K.
MODEL_QUANT="${MODEL_QUANT:-IQ3_XS}"
MODEL_FILE="THUDM_GLM-Z1-9B-0414-${MODEL_QUANT}.gguf"
MODEL_URL="https://huggingface.co/bartowski/THUDM_GLM-Z1-9B-0414-GGUF/resolve/main/${MODEL_FILE}"
MODEL_PATH="models/${MODEL_FILE}"

# Độ dài ngữ cảnh (token). GLM-Z1 suy nghĩ dài nên để 8192; giảm xuống 4096 nếu máy bị chậm.
CTX_SIZE="${CTX_SIZE:-8192}"

# Thông số lấy mẫu theo khuyến nghị của nhóm GLM cho dòng Z1.
SAMPLING_ARGS=(--temp 0.6 --top-p 0.95 --top-k 40)
