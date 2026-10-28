#!/usr/bin/env bash
# Cài llama.cpp và tải mô hình GLM-Z1-9B (bản nén ~4,1GB) về thư mục models/.
set -euo pipefail

cd "$(dirname "$0")"
source ./config.sh

if ! command -v brew >/dev/null 2>&1; then
  echo "Chưa có Homebrew. Cài tại https://brew.sh rồi chạy lại." >&2
  exit 1
fi

if ! command -v llama-cli >/dev/null 2>&1; then
  echo "==> Cài llama.cpp"
  brew install llama.cpp
fi

mkdir -p models
if [ -f "$MODEL_PATH" ]; then
  echo "==> Đã có mô hình: $MODEL_PATH"
else
  echo "==> Tải $MODEL_FILE (~4,1GB)"
  curl -L -C - --fail -o "$MODEL_PATH.part" "$MODEL_URL"
  mv "$MODEL_PATH.part" "$MODEL_PATH"
fi

echo "==> Xong. Chạy ./chat.sh để trò chuyện, hoặc ./server.sh để mở giao diện web."
