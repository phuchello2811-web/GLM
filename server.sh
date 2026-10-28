#!/usr/bin/env bash
# Mở giao diện chat trên trình duyệt tại http://127.0.0.1:8080 (kèm API tương thích OpenAI).
set -euo pipefail

cd "$(dirname "$0")"
source ./config.sh

if [ ! -f "$MODEL_PATH" ]; then
  echo "Chưa có mô hình. Chạy ./setup.sh trước." >&2
  exit 1
fi

PORT="${PORT:-8080}"
echo "==> Mở http://127.0.0.1:${PORT} trên trình duyệt. Nhấn Ctrl+C để tắt."

exec llama-server \
  -m "$MODEL_PATH" \
  -c "$CTX_SIZE" \
  -ngl 99 \
  --jinja \
  --host 127.0.0.1 \
  --port "$PORT" \
  "${SAMPLING_ARGS[@]}" \
  "$@"
