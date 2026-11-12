// Máy chủ trung gian cho trang GLM: giữ API key Z.ai để mọi người dùng chung mà không thấy key.
//
// An toàn:
// - Key nằm trong biến bí mật ZAI_API_KEY (và NVIDIA_API_KEY nếu có) của Cloudflare, không có trong code.
// - Chỉ cho dùng mô hình miễn phí, nên kể cả bị lạm dụng cũng không mất tiền.
// - Chỉ trình duyệt mở từ các trang trong ALLOWED_ORIGINS mới gọi được (chặn trang web khác dùng ké).
// - Giới hạn số lượt hỏi mỗi phút cho mỗi địa chỉ IP.
//
// Các đường dẫn:
// - POST /        chat với GLM (Z.ai).
// - POST /image   tạo ảnh bằng Cloudflare Workers AI (cần binding AI, xem README).
// - POST /sync    đồng bộ lịch sử chat giữa các máy (cần binding D1 tên DB, xem README).

const UPSTREAM = "https://api.z.ai/api/paas/v4/chat/completions";
const FREE_MODELS = ["glm-4.7-flash", "glm-4.5-flash", "glm-4.6v-flash"];
const VISION_MODEL = "glm-4.6v-flash"; // mô hình miễn phí duy nhất của Z.ai đọc được ảnh
// GLM-5.3 Flash chạy miễn phí trên NVIDIA (build.nvidia.com, khoảng 40 lượt mỗi phút cho cả tài khoản), cần biến bí mật NVIDIA_API_KEY.
// Đọc được cả ảnh. Chưa có key, NVIDIA bận hoặc lỗi thì tự dùng mô hình miễn phí của Z.ai.
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODELS = { "glm-5.3-flash": "z-ai/glm-5.3-flash" };
const MAX_IMAGES = 8;
const DEFAULT_ORIGINS = [
  "https://phuchello2811-web.github.io",
  "http://127.0.0.1:5500", // Live Server trong VS Code
  "http://localhost:5500",
];
const PER_MINUTE = 20; // số lượt hỏi tối đa mỗi phút cho mỗi IP
const LIMITS = { chat: PER_MINUTE, image: 6, sync: 40 }; // giới hạn mỗi phút theo từng loại yêu cầu
// Tạo ảnh: FLUX.2 [klein] 4B (đẹp, nhanh, sửa được ảnh có sẵn; khoảng 100 neuron mỗi ảnh 1024x1024,
// gói miễn phí 10.000 neuron mỗi ngày). Lỗi thì dùng FLUX.1 [schnell] (chỉ ảnh vuông, không sửa ảnh).
const IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const IMAGE_FALLBACK = "@cf/black-forest-labs/flux-1-schnell";
const MAX_REFS = 4; // số ảnh mẫu tối đa khi sửa ảnh (mỗi ảnh phải nhỏ hơn 512x512, trang tự thu nhỏ)
const SYNC_ROW_MAX = 1_900_000; // D1 giới hạn mỗi dòng khoảng 2MB
const MAX_BODY = 8 * 1024 * 1024; // đoạn chat (kể cả ảnh) nặng quá 8MB thì từ chối
const MAX_TOKENS = 8192;
const BUSY = [429, 502, 503, 504, 524]; // mã lỗi khi Z.ai quá tải hoặc treo

// Đếm lượt trong bộ nhớ: mỗi máy chủ Cloudflare đếm riêng nên chỉ là chặn tương đối.
// Nếu có gắn binding Rate Limiting tên LIMITER (xem README) thì dùng cái đó, chính xác hơn.
const hits = new Map();
function overLimit(key, max) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export default {
  async fetch(request, env) {
    const origins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()) : DEFAULT_ORIGINS;
    const origin = request.headers.get("Origin") || "";
    const allowed = origins.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : origins[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Expose-Headers": "X-GLM-Model, X-GLM-Note",
      Vary: "Origin",
    };
    const fail = (status, message) =>
      new Response(JSON.stringify({ error: { message } }), {
        status,
        headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
      });

    if (request.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    if (request.method === "GET") return fail(200, "Máy chủ GLM đang chạy. Hãy dùng từ trang chat.");
    if (request.method !== "POST") return fail(405, "Chỉ nhận POST.");
    if (!allowed) return fail(403, "Trang này không được phép dùng máy chủ chung.");
    const route = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const kind = route === "/image" ? "image" : route === "/sync" ? "sync" : "chat";
    if (kind === "chat" && route !== "/") return fail(404, "Không có đường dẫn này.");
    if (kind === "chat" && !env.ZAI_API_KEY) return fail(500, "Máy chủ chưa được cài API key (biến bí mật ZAI_API_KEY).");

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const limited = env.LIMITER && kind === "chat" ? !(await env.LIMITER.limit({ key: ip })).success : overLimit(`${kind}:${ip}`, LIMITS[kind]);
    if (limited) return fail(429, kind === "chat"
      ? `Bạn hỏi quá ${PER_MINUTE} lần mỗi phút trên máy chủ chung. Đợi một lúc rồi thử lại.`
      : "Bạn gửi quá nhiều yêu cầu trong một phút. Đợi một lúc rồi thử lại.");

    const raw = await request.text();
    if (raw.length > MAX_BODY) return fail(413, "Dữ liệu gửi lên quá lớn.");
    let body;
    try { body = JSON.parse(raw); } catch { return fail(400, "Dữ liệu gửi lên không hợp lệ."); }
    const json = (data) => new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

    if (kind === "image") return makeImage(body, env, json, fail);
    if (kind === "sync") return sync(body, env, json, fail);

    if (!Array.isArray(body.messages) || !body.messages.length) return fail(400, "Thiếu tin nhắn.");

    // Chỉ chuyển tiếp các trường cần thiết, và ép về mô hình miễn phí.
    // Tin nhắn của người dùng có thể kèm ảnh (chỉ nhận ảnh dạng data:image/...;base64, không nhận đường dẫn tới web khác).
    const part = (p) =>
      p?.type === "text" && typeof p.text === "string" ? { type: "text", text: p.text }
      : p?.type === "image_url" && /^data:image\/(png|jpeg|webp|gif);base64,/.test(p.image_url?.url || "") ? { type: "image_url", image_url: { url: p.image_url.url } }
      : null;
    const messages = body.messages
      .filter((m) => m && ["system", "user", "assistant"].includes(m.role) && (typeof m.content === "string" || (m.role === "user" && Array.isArray(m.content))))
      .map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.map(part).filter(Boolean) }));
    const images = messages.reduce((n, m) => n + (Array.isArray(m.content) ? m.content.filter((p) => p.type === "image_url").length : 0), 0);
    if (images > MAX_IMAGES) return fail(413, `Đoạn chat có quá ${MAX_IMAGES} ảnh. Hãy mở đoạn chat mới.`);
    const model = images ? VISION_MODEL : FREE_MODELS.includes(body.model) ? body.model : FREE_MODELS[0];
    const clean = {
      messages,
      stream: body.stream !== false,
      temperature: clamp(body.temperature, 0, 1, 0.6),
      top_p: clamp(body.top_p, 0.01, 1, 0.95),
      max_tokens: Math.round(clamp(body.max_tokens, 1, MAX_TOKENS, 4096)),
      thinking: { type: body.thinking?.type === "disabled" ? "disabled" : "enabled" },
    };

    // Thử NVIDIA trước nếu trang chọn GLM-5.3 Flash. Chờ tối đa 60 giây để máy chủ bắt đầu trả lời.
    // Không dùng được thì ghi lý do vào X-GLM-Note để trang hiện cho người dùng.
    let upstream, used, note = "";
    if (env.NVIDIA_API_KEY && NVIDIA_MODELS[body.model]) {
      const { thinking, ...rest } = clean;
      const timer = new AbortController(), t = setTimeout(() => timer.abort(), 60_000);
      try {
        upstream = await fetch(NVIDIA_URL, {
          method: "POST",
          signal: timer.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NVIDIA_API_KEY}` },
          body: JSON.stringify({ ...rest, model: NVIDIA_MODELS[body.model], reasoning_effort: thinking.type === "disabled" ? "low" : "high" }),
        });
      } catch {
        upstream = null;
        note = timer.signal.aborted ? "NVIDIA không trả lời sau 60 giây (đang quá đông)" : "không kết nối được tới NVIDIA";
      }
      clearTimeout(t);
      if (upstream?.ok) used = body.model;
      else if (upstream) {
        const detail = (await upstream.text().catch(() => "")).replace(/nvapi-[\w-]+/g, "nvapi-…").replace(/\s+/g, " ").slice(0, 160);
        note = upstream.status === 401 || upstream.status === 403 ? `key NVIDIA bị từ chối (${upstream.status}), kiểm tra lại NVIDIA_API_KEY`
          : upstream.status === 429 ? "NVIDIA hết lượt miễn phí trong phút này (429)"
          : upstream.status === 404 ? "tài khoản NVIDIA chưa dùng được GLM-5.3 Flash (404)"
          : `NVIDIA báo lỗi ${upstream.status}: ${detail}`;
        upstream = null;
      }
    }

    // Bản miễn phí hay bị quá tải (429) hoặc treo (502/503/504/524): thử lần lượt các mô hình miễn phí còn lại.
    for (const m of used ? [] : images ? [model] : [model, ...FREE_MODELS.filter((x) => x !== model)]) {
      if (upstream) await upstream.body?.cancel();
      used = m;
      upstream = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ZAI_API_KEY}` },
        body: JSON.stringify({ ...clean, model: m }),
      });
      if (!BUSY.includes(upstream.status)) break;
    }
    if (BUSY.includes(upstream.status)) return fail(429, "Máy chủ GLM miễn phí đang quá tải. Đợi một lúc rồi thử lại.");
    // Không trả nguyên lỗi xác thực của Z.ai về trình duyệt để khỏi lộ chi tiết về key.
    if (upstream.status === 401 || upstream.status === 403) return fail(502, "API key trên máy chủ chung bị sai hoặc đã bị thu hồi.");
    const headers = new Headers(cors);
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    headers.set("Cache-Control", "no-store");
    headers.set("X-GLM-Model", used); // mô hình thật đã trả lời, để trang ghi chú khi máy chủ tự đổi mô hình
    if (note) headers.set("X-GLM-Note", encodeURIComponent(note)); // header chỉ nhận chữ không dấu nên phải mã hoá
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

// Tạo ảnh hoặc sửa ảnh. Trang gửi: prompt, width/height (256–1920), seed, refs (ảnh mẫu dạng data:image/...;base64).
async function makeImage(body, env, json, fail) {
  if (!env.AI) return fail(501, "Máy chủ chưa bật tạo ảnh (binding AI).");
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return fail(400, "Thiếu mô tả ảnh.");
  // Kích thước làm tròn tới bội số của 16 cho mô hình dễ xử lý.
  const side = (v) => Math.round(clamp(v, 256, 1920, 1024) / 16) * 16;
  const width = side(body.width), height = side(body.height);
  const seed = Number.isInteger(body.seed) && body.seed >= 0 ? body.seed : Math.floor(Math.random() * 2 ** 31);
  const refs = (Array.isArray(body.refs) ? body.refs : [])
    .filter((u) => typeof u === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(u) && u.length < 1_500_000)
    .slice(0, MAX_REFS);
  const done = (out, model) => {
    const b64 = out?.image;
    if (!b64) return null;
    // FLUX trả PNG hoặc JPEG tuỳ mô hình: nhận dạng theo mấy byte đầu.
    const mime = b64.startsWith("/9j/") ? "image/jpeg" : b64.startsWith("UklG") ? "image/webp" : "image/png";
    return json({ image: `data:${mime};base64,${b64}`, model, width, height, seed });
  };
  let err;
  try {
    // Mô hình FLUX.2 nhận dữ liệu dạng multipart, kể cả khi chỉ có prompt.
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", String(width));
    form.append("height", String(height));
    form.append("seed", String(seed));
    refs.forEach((u, i) => {
      const [head, data] = u.split(",");
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      form.append(`input_image_${i}`, new Blob([bytes], { type: head.slice(5, head.indexOf(";")) }), `image${i}`);
    });
    const packed = new Response(form);
    const out = await env.AI.run(IMAGE_MODEL, { multipart: { body: packed.body, contentType: packed.headers.get("content-type") } });
    const res = done(out, "FLUX.2 klein");
    if (res) return res;
  } catch (e) { err = e; }
  if (refs.length) return imageFail(err, fail); // FLUX.1 không sửa được ảnh, nên không dùng làm dự phòng
  try {
    const res = done(await env.AI.run(IMAGE_FALLBACK, { prompt, steps: 8 }), "FLUX.1 schnell");
    if (res) return res;
  } catch (e) { err = e; }
  return imageFail(err, fail);
}
function imageFail(e, fail) {
  const msg = String(e?.message || e || "không có ảnh trả về");
  if (/limit|quota|neuron|exceeded|4006/i.test(msg)) return fail(429, "Hôm nay máy chủ đã hết lượt tạo ảnh miễn phí. Thử lại vào ngày mai.");
  if (/nsfw|safety|flagged|moderat/i.test(msg)) return fail(400, "Mô tả ảnh bị bộ lọc an toàn chặn. Hãy đổi mô tả khác.");
  return fail(502, "Không tạo được ảnh: " + msg.slice(0, 200));
}

// Đồng bộ: mỗi người có một mã bí mật; máy chủ chỉ lưu mã đã băm (SHA-256), không lưu mã thật.
// Mỗi mục (một đoạn chat, bộ nhớ, nhân vật…) là một dòng có thời điểm cập nhật; bản mới hơn thắng.
// Máy gửi lên các mục đã đổi kèm mốc lần đồng bộ trước, máy chủ trả về các mục đã đổi kể từ mốc đó.
async function sync(body, env, json, fail) {
  if (!env.DB) return fail(501, "Máy chủ chưa bật đồng bộ (binding D1 tên DB).");
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[A-Za-z0-9-]{16,64}$/.test(code)) return fail(400, "Mã đồng bộ không hợp lệ.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("glm-sync:" + code));
  const user = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS items (user TEXT NOT NULL, id TEXT NOT NULL, updated INTEGER NOT NULL, data TEXT, seen INTEGER NOT NULL, PRIMARY KEY (user, id))").run();

  const now = Date.now();
  const changes = Array.isArray(body.changes) ? body.changes.slice(0, 200) : [];
  const writes = [];
  for (const c of changes) {
    if (typeof c?.id !== "string" || c.id.length > 100 || !Number.isFinite(c.updated)) continue;
    const data = c.data === null ? null : JSON.stringify(c.data);
    if (data && data.length > SYNC_ROW_MAX) continue;
    // Chỉ ghi đè khi bản gửi lên mới hơn bản đang lưu. "seen" là lúc máy chủ nhận, dùng để biết máy khác cần tải gì.
    writes.push(env.DB.prepare(
      "INSERT INTO items (user, id, updated, data, seen) VALUES (?1, ?2, ?3, ?4, ?5) " +
      "ON CONFLICT (user, id) DO UPDATE SET updated = excluded.updated, data = excluded.data, seen = excluded.seen WHERE excluded.updated > items.updated",
    ).bind(user, c.id, Math.round(c.updated), data, now));
  }
  if (writes.length) await env.DB.batch(writes);
  const since = Number.isFinite(body.since) ? body.since : 0;
  const { results } = await env.DB.prepare("SELECT id, updated, data FROM items WHERE user = ?1 AND seen > ?2").bind(user, since).all();
  return json({ now, items: results.map((r) => ({ id: r.id, updated: r.updated, data: r.data === null ? null : JSON.parse(r.data) })) });
}

function clamp(v, lo, hi, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}
