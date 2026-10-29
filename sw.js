// Lưu sẵn giao diện để web app mở được cả khi không có mạng.
// Đổi VERSION mỗi khi cập nhật index.html để máy người dùng nhận bản mới.
const VERSION = "glm-v18";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      // Chỉ xoá cache cũ của app này: các app khác cùng tên miền github.io dùng chung kho cache.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("glm-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Chỉ xử lý file của chính trang. Yêu cầu tới server mô hình (127.0.0.1) đi thẳng, không qua cache.
// Lấy bản mới từ mạng trước, mất mạng thì dùng bản đã lưu.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
