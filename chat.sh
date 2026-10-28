#!/usr/bin/env bash
# Trò chuyện với GLM-Z1-9B ngay trong Terminal, hoàn toàn offline.
set -euo pipefail

cd "$(dirname "$0")"
source ./config.sh

if [ ! -f "$MODEL_PATH" ]; then
  echo "Chưa có mô hình. Chạy ./setup.sh trước." >&2
  exit 1
fi

exec llama-cli \
  -m "$MODEL_PATH" \
  -c "$CTX_SIZE" \
  -ngl 99 \
  --jinja \
  "${SAMPLING_ARGS[@]}" \
  "$@"
