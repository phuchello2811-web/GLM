// Máy chủ trung gian cho trang GLM: giữ API key Z.ai để mọi người dùng chung mà không thấy key.
//
// An toàn:
// - Key nằm trong biến bí mật ZAI_API_KEY của Cloudflare, không có trong code.
// - Chỉ cho dùng mô hình miễn phí, nên kể cả bị lạm dụng cũng không mất tiền.
// - Chỉ trình duyệt mở từ các trang trong ALLOWED_ORIGINS mới gọi được (chặn trang web khác dùng ké).
// - Giới hạn số lượt hỏi mỗi phút cho mỗi địa chỉ IP.

const UPSTREAM = "https://api.z.ai/api/paas/v4/chat/completions";
const FREE_MODELS = ["glm-4.7-flash", "glm-4.5-flash", "glm-4.6v-flash"];
const VISION_MODEL = "glm-4.6v-flash"; // mô hình miễn phí duy nhất đọc được ảnh
const MAX_IMAGES = 8;
const DEFAULT_ORIGINS = [
  "https://phuchello2811-web.github.io",
  "http://127.0.0.1:5500", // Live Server trong VS Code
  "http://localhost:5500",
];
const PER_MINUTE = 20; // số lượt hỏi tối đa mỗi phút cho mỗi IP
const MAX_BODY = 8 * 1024 * 1024; // đoạn chat (kể cả ảnh) nặng quá 8MB thì từ chối
const MAX_TOKENS = 8192;
const BUSY = [429, 502, 503, 504, 524]; // mã lỗi khi Z.ai quá tải hoặc treo

// Đếm lượt trong bộ nhớ: mỗi máy chủ Cloudflare đếm riêng nên chỉ là chặn tương đối.
// Nếu có gắn binding Rate Limiting tên LIMITER (xem README) thì dùng cái đó, chính xác hơn.
const hits = new Map();
function overLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_MINUTE;
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
    if (!env.ZAI_API_KEY) return fail(500, "Máy chủ chưa được cài API key (biến bí mật ZAI_API_KEY).");

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const limited = env.LIMITER ? !(await env.LIMITER.limit({ key: ip })).success : overLimit(ip);
    if (limited) return fail(429, `Bạn hỏi quá ${PER_MINUTE} lần mỗi phút trên máy chủ chung. Đợi một lúc rồi thử lại.`);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return fail(413, "Đoạn chat quá dài. Hãy mở đoạn chat mới.");
    let body;
    try { body = JSON.parse(raw); } catch { return fail(400, "Dữ liệu gửi lên không hợp lệ."); }
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
      model,
      messages,
      stream: body.stream !== false,
      temperature: clamp(body.temperature, 0, 1, 0.6),
      top_p: clamp(body.top_p, 0.01, 1, 0.95),
      max_tokens: Math.round(clamp(body.max_tokens, 1, MAX_TOKENS, 4096)),
      thinking: { type: body.thinking?.type === "disabled" ? "disabled" : "enabled" },
    };

    // Bản miễn phí hay bị quá tải (429) hoặc treo (502/503/504/524): thử lần lượt các mô hình miễn phí còn lại.
    let upstream;
    for (const m of images ? [model] : [model, ...FREE_MODELS.filter((x) => x !== model)]) {
      if (upstream) await upstream.body?.cancel();
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
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

function clamp(v, lo, hi, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}
