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
// - POST /status  kiểm tra mô hình NVIDIA nào đang trả lời được (để menu chọn mô hình hiện trạng thái).

const UPSTREAM = "https://api.z.ai/api/paas/v4/chat/completions";
const FREE_MODELS = ["glm-4.7-flash", "glm-4.5-flash", "glm-4.6v-flash"];
const VISION_MODEL = "glm-4.6v-flash"; // mô hình miễn phí duy nhất của Z.ai đọc được ảnh
// Các mô hình miễn phí trên NVIDIA (build.nvidia.com, khoảng 40 lượt mỗi phút cho cả tài khoản), cần biến bí mật NVIDIA_API_KEY.
// Bản miễn phí của NVIDIA hay quá tải (xếp hàng nhiều phút, hoặc trả 200 mà không gửi gì): chỉ chờ chữ đầu tiên tối đa
// NVIDIA_WAIT, không được thì dùng GLM của Z.ai và tạm bỏ qua mô hình đó một lúc để các câu sau khỏi phải chờ lại.
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
// think: cách bật suy nghĩ của từng loại mô hình ("effort" = reasoning_effort, "kwargs" = chat_template_kwargs).
// trial: chỉ để kiểm tra xem có dùng được không (POST /status với {"all": true}), trang chưa hiện trong menu.
const NVIDIA_MODELS = {
  "glm-5.3-flash": { id: "z-ai/glm-5.3-flash", title: "GLM-5.3 Flash", vision: true, think: "effort" },
  "nemotron-3-ultra": { id: "nvidia/nemotron-3-ultra-550b-a55b", title: "Nemotron 3 Ultra", think: "kwargs" },
  "nemotron-3.5-super-vl": { id: "nvidia/nemotron-3.5-super-vl-120b-a12b", title: "Nemotron 3.5 Super VL", vision: true, think: "kwargs" },
  "nemotron-3.5-lightning": { id: "nvidia/nemotron-3.5-lightning-30b-a3b", title: "Nemotron 3.5 Lightning", think: "kwargs" },
  "mistral-large-4": { id: "mistralai/mistral-large-4-1t-a52b", title: "Mistral Large 4" },
  "deepseek-v4.1-flash": { id: "deepseek-ai/deepseek-v4.1-flash", title: "DeepSeek V4.1 Flash", think: "kwargs" },
  "minimax-m3.1-flash": { id: "minimaxai/minimax-m3.1-flash", title: "MiniMax M3.1 Flash" },
  "step-5": { id: "stepfun-ai/step-5-preview", title: "Step 5" },
  "nemotron-3-super": { id: "nvidia/nemotron-3-super-120b-a12b", title: "Nemotron 3 Super", think: "kwargs", trial: true },
  "nemotron-nano-3": { id: "nvidia/nemotron-nano-3-30b-a3b", title: "Nemotron Nano 3", think: "kwargs", trial: true },
  "llama-nemotron-ultra": { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1", title: "Llama Nemotron Ultra", trial: true },
  "llama-3.2-90b-vision": { id: "meta/llama-3.2-90b-vision-instruct", title: "Llama 3.2 90B Vision", vision: true, trial: true },
  "kimi-k2.6": { id: "moonshotai/kimi-k2.6", title: "Kimi K2.6", trial: true },
  "gemma-4-31b": { id: "google/gemma-4-31b-it", title: "Gemma 4 31B", trial: true },
  "gemma-3-12b": { id: "google/gemma-3-12b-it", title: "Gemma 3 12B", trial: true },
  "palmyra-creative": { id: "writer/palmyra-creative-122b", title: "Palmyra Creative", trial: true },
  "laguna-xs": { id: "poolside/laguna-xs-2.1", title: "Laguna XS" },
};
const NVIDIA_WAIT = 25_000; // chờ chữ đầu tiên tối đa 25 giây
const STALL = 90_000; // đang trả lời mà đứng yên quá 90 giây thì ngắt, để trang tự nối lại
const nvidiaDown = new Map(); // mô hình -> { until, note }: tạm bỏ qua sau khi lỗi
let statusCache = null; // kết quả kiểm tra các mô hình NVIDIA gần nhất
const MAX_IMAGES = 8;
const DEFAULT_ORIGINS = [
  "https://phuchello2811-web.github.io",
  "http://127.0.0.1:5500", // Live Server trong VS Code
  "http://localhost:5500",
];
const PER_MINUTE = 40; // số lượt gọi tối đa mỗi phút cho mỗi IP (một câu Nghĩ kỹ dùng nhiều lượt: 3 mô hình, mỗi lần chạy công cụ là một lượt)
const LIMITS = { chat: PER_MINUTE, image: 6, sync: 40, status: 10 }; // giới hạn mỗi phút theo từng loại yêu cầu
// Tạo ảnh: FLUX.2 [klein] 4B (đẹp, nhanh, sửa được ảnh có sẵn; khoảng 100 neuron mỗi ảnh 1024x1024,
// gói miễn phí 10.000 neuron mỗi ngày). Lỗi thì dùng FLUX.1 [schnell] (chỉ ảnh vuông, không sửa ảnh).
const IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const IMAGE_FALLBACK = "@cf/black-forest-labs/flux-1-schnell";
const MAX_REFS = 4; // số ảnh mẫu tối đa khi sửa ảnh (mỗi ảnh phải nhỏ hơn 512x512, trang tự thu nhỏ)
const SYNC_ROW_MAX = 1_900_000; // D1 giới hạn mỗi dòng khoảng 2MB
const MAX_BODY = 8 * 1024 * 1024; // đoạn chat (kể cả ảnh) nặng quá 8MB thì từ chối
// Độ dài trả lời tối đa: trang xin mức cao nhất, máy chủ hạ xuống mức mỗi mô hình cho phép (Z.ai báo đúng các mức này).
// Câu trả lời vẫn chạm giới hạn thì trang tự yêu cầu viết tiếp.
const MAX_TOKENS = 131072;
const MODEL_MAX_TOKENS = { "glm-4.7-flash": 131072, "glm-4.5-flash": 98304, "glm-4.6v-flash": 32768 };
const NVIDIA_MAX_TOKENS = 32768; // NVIDIA chê lớn quá thì thử lại với 16384
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
    const kind = { "/image": "image", "/sync": "sync", "/status": "status" }[route] || "chat";
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
    if (kind === "status") return json(await nvidiaStatus(env, body.all === true));

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
      max_tokens: Math.round(clamp(body.max_tokens, 1, MAX_TOKENS, 16384)),
      thinking: { type: body.thinking?.type === "disabled" ? "disabled" : "enabled" },
      effort: body.effort === "max" ? "max" : "high", // chế độ Nghĩ kỹ: GLM-5.3 suy nghĩ ở mức tối đa
    };

    // Mô hình trên NVIDIA: thử NVIDIA trước. Câu hỏi có ảnh mà mô hình đã chọn không đọc được ảnh thì dùng GLM-5.3 Flash.
    // Không dùng được thì trả lời bằng GLM của Z.ai và ghi lý do vào X-GLM-Note để trang hiện cho người dùng.
    let upstream, used, note = "", stream = null;
    let nv = NVIDIA_MODELS[body.model] ? body.model : null;
    if (nv && images && !NVIDIA_MODELS[nv].vision) nv = "glm-5.3-flash";
    if (nv) {
      const title = NVIDIA_MODELS[nv].title, down = nvidiaDown.get(nv);
      if (!env.NVIDIA_API_KEY) note = `${title} chưa được bật trên máy chủ (thiếu NVIDIA_API_KEY)`;
      else if (!clean.stream) note = `${title} chỉ dùng khi trả lời dạng luồng`;
      else if (down && down.until > Date.now()) note = `${title} ${down.note}; máy chủ sẽ thử lại sau ${Math.ceil((down.until - Date.now()) / 60_000)} phút`;
      else {
        const r = await callNvidia(nv, clean, env, NVIDIA_WAIT);
        if (r.body) { nvidiaDown.delete(nv); used = nv; stream = r.body; }
        else { nvidiaDown.set(nv, { until: Date.now() + r.cool, note: r.note }); note = `${title} ${r.note}`; }
      }
    }

    // Bản miễn phí hay bị quá tải (429) hoặc treo (502/503/504/524): thử lần lượt các mô hình miễn phí còn lại.
    // Z.ai từ chối ngẫu nhiên khoảng một nửa số lần khi đông (429, lỗi 1305) và trả lời lỗi rất nhanh, nên mô hình đầu tiên
    // được thử lại 2 lần (sau 1 rồi 2 giây) trước khi đổi sang mô hình khác. Lỗi treo (502/504/524) thì đổi mô hình ngay.
    const order = used ? [] : images ? [model] : [model, ...FREE_MODELS.filter((x) => x !== model)];
    for (const m of order) {
      for (let attempt = 0; attempt < (m === order[0] ? 3 : 1); attempt++) {
        if (upstream) await upstream.body?.cancel();
        if (attempt) await new Promise((ok) => setTimeout(ok, 1000 * attempt));
        used = m;
        upstream = await fetch(UPSTREAM, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ZAI_API_KEY}` },
          body: JSON.stringify({ ...clean, effort: undefined, model: m, max_tokens: Math.min(clean.max_tokens, MODEL_MAX_TOKENS[m] || 32768) }),
        });
        if (upstream.status !== 429 && upstream.status !== 503) break;
      }
      if (!BUSY.includes(upstream.status)) break;
    }
    if (!stream && BUSY.includes(upstream.status)) return fail(429, "Máy chủ GLM miễn phí đang quá tải. Đợi một lúc rồi thử lại.");
    // Không trả nguyên lỗi xác thực của Z.ai về trình duyệt để khỏi lộ chi tiết về key.
    if (!stream && (upstream.status === 401 || upstream.status === 403)) return fail(502, "API key trên máy chủ chung bị sai hoặc đã bị thu hồi.");
    const headers = new Headers(cors);
    headers.set("Content-Type", stream ? "text/event-stream" : upstream.headers.get("Content-Type") || "application/json");
    headers.set("Cache-Control", "no-store");
    headers.set("X-GLM-Model", used); // mô hình thật đã trả lời, để trang ghi chú khi máy chủ tự đổi mô hình
    if (note) headers.set("X-GLM-Note", encodeURIComponent(note)); // header chỉ nhận chữ không dấu nên phải mã hoá
    return new Response(stream || upstream.body, { status: stream ? 200 : upstream.status, headers });
  },
};

// Gọi một mô hình trên NVIDIA. Thành công: { body } là luồng trả lời; thất bại: { note, cool } (lý do, thời gian tạm bỏ qua).
async function callNvidia(name, clean, env, wait) {
  const spec = NVIDIA_MODELS[name];
  const { thinking, effort, ...rest } = clean;
  const on = thinking.type !== "disabled";
  const think = spec.think === "effort" ? { reasoning_effort: on ? effort : "low" }
    : spec.think === "kwargs" ? { chat_template_kwargs: { enable_thinking: on, thinking: on } } : {};
  const timer = new AbortController(), t = setTimeout(() => timer.abort(), wait);
  const timeout = new Promise((_, no) => timer.signal.addEventListener("abort", () => no(new Error("timeout"))));
  timeout.catch(() => {});
  let reader;
  try {
    const send = (max_tokens) => Promise.race([fetch(NVIDIA_URL, {
      method: "POST",
      signal: timer.signal,
      // Thiếu Accept: text/event-stream thì NVIDIA giữ lại cả câu trả lời tới khi viết xong mới gửi (giống mã mẫu của NVIDIA).
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${env.NVIDIA_API_KEY}` },
      body: JSON.stringify({ ...rest, stream: true, model: spec.id, ...think, max_tokens }),
    }), timeout]);
    let res = await send(Math.min(rest.max_tokens, NVIDIA_MAX_TOKENS));
    // Một số mô hình có ngữ cảnh ngắn hơn: chê max_tokens quá lớn thì thử lại một lần với mức nhỏ hơn.
    if (res.status === 400) {
      const text = await res.text().catch(() => "");
      res = /max_tokens|context|too large|maximum/i.test(text) ? await send(16384) : new Response(text, { status: 400 });
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).replace(/nvapi-[\w-]+/g, "nvapi-…").replace(/\s+/g, " ").slice(0, 160);
      clearTimeout(t);
      if (res.status === 401 || res.status === 403) return { note: `bị từ chối (${res.status}): kiểm tra lại NVIDIA_API_KEY`, cool: 600_000 };
      if (res.status === 429) return { note: "hết lượt miễn phí trong phút này (429)", cool: 60_000 };
      if (res.status === 404 || res.status === 410) return { note: `không còn trên NVIDIA (${res.status})`, cool: 3_600_000, gone: true };
      return { note: `báo lỗi ${res.status}: ${detail}`, cool: 300_000 };
    }
    // NVIDIA đôi khi trả 200 rồi không gửi gì: đọc tới khi có dòng dữ liệu đầu tiên.
    reader = res.body.getReader();
    const chunks = [], dec = new TextDecoder();
    let text = "";
    while (!/data:\s*\{/.test(text)) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      chunks.push(value); text += dec.decode(value, { stream: true });
    }
    clearTimeout(t);
    if (!/data:\s*\{/.test(text)) return { note: "không trả về nội dung", cool: 300_000 };
    const body = new ReadableStream({
      start(c) { for (const ch of chunks) c.enqueue(ch); },
      async pull(c) {
        let stall;
        const r = await Promise.race([reader.read(), new Promise((ok) => { stall = setTimeout(() => ok(null), STALL); })]);
        clearTimeout(stall);
        if (!r) { reader.cancel().catch(() => {}); c.error(new Error("NVIDIA ngừng gửi dữ liệu")); }
        else if (r.done) c.close();
        else c.enqueue(r.value);
      },
      cancel() { reader.cancel().catch(() => {}); },
    });
    return { body };
  } catch {
    clearTimeout(t);
    reader?.cancel().catch(() => {});
    return timer.signal.aborted
      ? { note: `không trả lời sau ${wait / 1000} giây (đang quá đông)`, cool: 300_000 }
      : { note: "không kết nối được", cool: 120_000 };
  }
}

// Kiểm tra nhanh từng mô hình NVIDIA (lưu kết quả 2 phút), gửi đúng tham số suy nghĩ như khi chat thật.
// Mô hình đang bị tạm bỏ qua thì báo luôn, không gọi lại. all = kiểm tra cả các mô hình thử (trial).
async function nvidiaStatus(env, all) {
  if (!env.NVIDIA_API_KEY) return { enabled: false, models: {} };
  const cache = statusCache?.[all ? "all" : "menu"];
  if (cache && Date.now() - cache.at < 120_000) return cache.data;
  const probe = { messages: [{ role: "user", content: "Hi" }], stream: true, temperature: 0.6, top_p: 0.95, max_tokens: 16, thinking: { type: "enabled" }, effort: "high" };
  const models = {};
  await Promise.all(Object.keys(NVIDIA_MODELS).filter((n) => all || !NVIDIA_MODELS[n].trial).map(async (name) => {
    const down = nvidiaDown.get(name);
    if (down && down.until > Date.now()) { models[name] = { ok: false, note: down.note, gone: down.gone }; return; }
    const start = Date.now();
    const r = await callNvidia(name, probe, env, 20_000);
    if (r.body) { r.body.cancel().catch(() => {}); nvidiaDown.delete(name); models[name] = { ok: true, ms: Date.now() - start }; }
    else { nvidiaDown.set(name, { until: Date.now() + r.cool, note: r.note, gone: r.gone }); models[name] = { ok: false, note: r.note, gone: r.gone }; }
  }));
  statusCache = { ...statusCache, [all ? "all" : "menu"]: { at: Date.now(), data: { enabled: true, models } } };
  return statusCache[all ? "all" : "menu"].data;
}

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
