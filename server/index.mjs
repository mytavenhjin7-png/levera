// LEVERA — store server: website + JSON API + admin, MySQL (Laragon) or SQLite database, HiCargo cargo pricing,
// QPay invoices, Telegram order alerts, customer reviews and the Gemini AI concierge.
//   npm start            → http://localhost:8787   (admin: /admin.html)
import './env.mjs';
import http from 'node:http';
import { gzipSync, createGzip } from 'node:zlib';
import { readFileSync, existsSync, writeFileSync, mkdirSync, createReadStream, statSync, unlinkSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize, sep } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

const dbm = await import('./db.mjs');
const { seed, getSettings, setSettings, repriceAll, repriceOne, listProducts, getProduct, listBrands, upsert, DB_LABEL } = dbm;
try { await dbm.ready; } catch (e) { console.error('\n' + e.message + '\n'); process.exit(1); }
const db = dbm.db;
const { priceProduct, hicargoFee, toM3, fetchHicargoRates } = await import('./cargo.mjs');
const qpay = await import('./qpay.mjs');
const files = await import('./files.mjs');
const { TYPES } = await import('./catalog/dict.mjs');
const TYPE_LABELS = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, { en: v.en, mn: v.mn, cat: v.cat }]));

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '', TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const UPLOADS = join(ROOT, 'uploads', 'products');
// photos added in admin after deploying: uploads/live/products/… (Storage bucket on Firebase, this folder locally)
const LIVE = 'uploads/live/products';
try { mkdirSync(UPLOADS, { recursive: true }); } catch {}

// admin token: ADMIN_TOKEN in server/.env, otherwise generated once into data/admin-token.txt
const tokenFile = join(ROOT, 'data', 'admin-token.txt');
mkdirSync(dirname(tokenFile), { recursive: true });
let ADMIN_TOKEN = process.env.ADMIN_TOKEN || (existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '');
if (!ADMIN_TOKEN) { ADMIN_TOKEN = randomBytes(18).toString('base64url'); writeFileSync(tokenFile, ADMIN_TOKEN + '\n'); }

const seeded = await seed();
if (seeded.seeded) console.log(`Seeded ${seeded.products} products.`);

/* ---------- catalogue cache ---------- */
let catalogCache = null, catalogGz = null, catalogEtag = '', catalogList = [], brandList = [];
function invalidate() { catalogCache = null; }
const PUBLIC_SETTINGS = ['cargo_yuan', 'cargo_kg', 'cargo_m3', 'goods_cny_rate', 'service_fee_pct', 'china_shipping_cny', 'local_delivery_mnt', 'usd_mnt_rate', 'customs_duty_pct', 'vat_pct', 'rates_synced_at', 'hicargo_branch'];
async function publicSettings() { const s = await getSettings(); return Object.fromEntries(PUBLIC_SETTINGS.map(k => [k, s[k]])); }
// gallery: the photo set from tools/fetch-photos.mjs, else the single photo / render
const gallery = p => { try { const g = JSON.parse(p.photos || '[]'); if (g.length) return g; } catch {} return [p.photo || p.img]; };
// The shop-wide catalogue carries only what cards, filters and search need (it is parsed on every page load, so
// it is kept small); one product's full record (gallery, weight, box) comes from /api/products/:id.
function compact(p, rv, full = false) {
  const out = { id: p.id, b: p.brand_slug, line: p.line, type: p.type, cat: p.cat, en: p.name_en, mn: p.name_mn,
    sizes: JSON.parse(p.sizes || '[]'), img: p.photo || p.img, price: p.price_mnt, feat: p.featured, sort: p.sort };
  if (full) Object.assign(out, { ck: p.color_key, w: p.weight_kg, dims: [p.len_cm, p.wid_cm, p.hei_cm], imgs: gallery(p) });
  if (rv) out.rv = rv;
  // on sale: the real (lower) price is p.price_mnt; was = the normal price it came down from
  if (p.discount_pct > 0 && p.list_mnt > p.price_mnt) { out.off = p.discount_pct; out.was = p.list_mnt; }
  if (p.stock_left > 0 && p.stock_left <= 5) out.left = p.stock_left;
  return out;
}
async function ratingMap() {
  const m = new Map();
  for (const r of await db.all("SELECT product_id, COUNT(*) n, AVG(rating) a FROM reviews WHERE status='published' GROUP BY product_id")) m.set(r.product_id, [Math.round(Number(r.a) * 10) / 10, Number(r.n)]);
  return m;
}
async function catalog() {
  if (!catalogCache) {
    const rv = await ratingMap();
    brandList = (await listBrands()).filter(b => b.count > 0);   // a house shows once it has a piece on sale
    catalogList = (await listProducts()).map(p => compact(p, rv.get(p.id)));
    // real sales: pieces sold in paid, not-cancelled orders (feeds the Best sellers rail and the "Popular" sort)
    const sold = new Map();
    for (const o of await db.all("SELECT items FROM orders WHERE payment='paid' AND status<>'cancelled'")) {
      try { for (const i of JSON.parse(o.items)) sold.set(i.id, (sold.get(i.id) || 0) + (i.qty || 1)); } catch {}
    }
    for (const p of catalogList) if (sold.has(p.id)) p.sold = sold.get(p.id);
    const body = JSON.stringify({ brands: brandList, products: catalogList, settings: await publicSettings(), types: TYPE_LABELS, generated: new Date().toISOString() });
    // static copy for hosting the shop without this server (browse-only; orders need the API)
    import('node:fs/promises').then(fs => fs.writeFile(join(ROOT, 'assets', 'catalog.json'), body)).catch(() => {});
    catalogCache = body; catalogGz = gzipSync(body); catalogEtag = '"' + Buffer.from(String(body.length) + ':' + Date.now()).toString('base64url') + '"';
  }
  return catalogCache;
}

/* ---------- HiCargo live rates ---------- */
async function syncRates() {
  const s = await getSettings();
  const r = await fetchHicargoRates(s.hicargo_branch_id || 1);
  const changed = r.yuan !== s.cargo_yuan || r.kg !== s.cargo_kg || r.m3 !== s.cargo_m3;
  await setSettings({ cargo_yuan: r.yuan, cargo_kg: r.kg, cargo_m3: r.m3, hicargo_branch: r.branch, rates_synced_at: new Date().toISOString() });
  if (changed) await repriceAll();
  invalidate();
  return { ...r, changed };
}
if (process.env.HICARGO_SYNC !== 'off') {
  const run = () => syncRates().then(r => console.log(`HiCargo rates: ${r.kg}₮/kg · ¥${r.m3}/m³ · ¥1=${r.yuan}₮${r.changed ? ' (prices updated)' : ''}`)).catch(e => console.warn('HiCargo sync failed, keeping saved rates:', e.message));
  run(); setInterval(run, 6 * 3600 * 1000).unref();
}

/* ---------- helpers ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.glb': 'model/gltf-binary' };
const STATIC_DIRS = ['css', 'js', 'assets', 'uploads'];
const cors = { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
function corsFor(req) {
  const origin = req.headers.origin;
  if (!origin) return cors;
  // credentials (the sign-in cookie) only for the configured site(s); with "*" only for localhost during development,
  // never for an arbitrary other website
  const ok = ALLOWED_ORIGIN === '*' ? /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) : ALLOWED_ORIGIN.split(',').map(x => x.trim()).includes(origin);
  return ok ? { ...cors, 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : cors;
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(res.req ? corsFor(res.req) : cors), ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function readBody(req, limit = 200000) {
  if (req.rawBody) return req.rawBody.length > limit ? Promise.reject(new HttpError(413, 'too large')) : Promise.resolve(Buffer.from(req.rawBody));
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new HttpError(413, 'too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJSON(req) { const b = await readBody(req); try { return JSON.parse(b.toString('utf8') || '{}'); } catch { throw new HttpError(400, 'bad json'); } }
function isAdmin(req) {
  const h = req.headers.authorization || ''; const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const a = Buffer.from(t), b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}
const hits = new Map();
function limited(req, key, max, perMs) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const k = key + ip, now = Date.now(), arr = (hits.get(k) || []).filter(t => now - t < perMs);
  arr.push(now); hits.set(k, arr); return arr.length > max;
}
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const orderByNo = no => db.get('SELECT * FROM orders WHERE no=?', [no]);

async function notifyTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return false;
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, disable_web_page_preview: true })
  });
  if (!r.ok) throw new Error('Telegram ' + r.status);
  return true;
}
const money = n => '₮' + Math.round(n).toLocaleString('en-US');
function orderMessage(o, title = '🛍 Шинэ захиалга') {
  const items = JSON.parse(o.items);
  return `${title} ${o.no}\n${items.map(i => `• ${i.brand} — ${i.name}${i.size ? ' (' + i.size + ')' : ''} × ${i.qty} · ¥${i.cny}`).join('\n')}\nНийт: ${money(o.total)}\nУтас: ${o.phone}\nХаяг: ${o.district ? o.district + ', ' : ''}${o.address}${o.note ? '\nТэмдэглэл: ' + o.note : ''}`;
}

/* ---------- orders ---------- */
export const STATUSES = ['pending', 'paid', 'ordered', 'ereen', 'ub', 'delivered', 'cancelled'];
async function newOrderNo() {
  const yy = String(new Date().getFullYear()).slice(2);
  for (;;) { const no = `LV-${yy}-${String(Math.floor(1000 + Math.random() * 9000))}`; if (!(await orderByNo(no))) return no; }
}
function addHistory(o, status, note = '') {
  const h = JSON.parse(o.history || '[]'); h.push({ status, at: new Date().toISOString(), note });
  return JSON.stringify(h);
}
async function markPaid(o, source) {
  if (o.payment === 'paid') return o;
  await db.run("UPDATE orders SET payment='paid', status=CASE WHEN status='pending' THEN 'paid' ELSE status END, history=? WHERE no=?", [addHistory(o, 'paid', source), o.no]);
  const fresh = await orderByNo(o.no);
  if (o.kind === 'gift') await rw.activate(o.no);
  invalidate();   // a paid order changes the best sellers
  notifyTelegram(orderMessage(fresh, '✅ Төлбөр орлоо')).catch(e => console.warn(e.message));
  return fresh;
}
function publicOrder(o) {
  const items = JSON.parse(o.items);
  return { no: o.no, status: o.status, payment: o.payment, created_at: o.created_at, history: JSON.parse(o.history || '[]').map(h => ({ status: h.status, at: h.at })),
    items: items.map(i => ({ id: i.id, brand: i.brand, name: i.name, name_mn: i.name_mn, size: i.size, qty: i.qty, price: i.price, img: i.img })), subtotal: o.subtotal, rank_off: o.rank_off || 0, gift_used: o.gift_used || 0, kind: o.kind || 'goods', total: o.total };
}

/* ---------- reviews ---------- */
const FITS = ['small', 'true', 'large'];
async function reviewSummary(productId) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, fit = { small: 0, true: 0, large: 0 };
  for (const r of await db.all("SELECT rating, COUNT(*) n FROM reviews WHERE product_id=? AND status='published' GROUP BY rating", [productId])) dist[r.rating] = Number(r.n);
  for (const r of await db.all("SELECT fit, COUNT(*) n FROM reviews WHERE product_id=? AND status='published' AND fit IS NOT NULL GROUP BY fit", [productId])) if (r.fit in fit) fit[r.fit] = Number(r.n);
  const count = Object.values(dist).reduce((a, b) => a + b, 0);
  const avg = count ? Math.round(Object.entries(dist).reduce((a, [k, n]) => a + k * n, 0) / count * 10) / 10 : 0;
  return { count, avg, dist, fit };
}
const publicReview = r => ({ id: r.id, name: r.name, rating: r.rating, title: r.title, body: r.body, size: r.size, fit: r.fit, verified: !!r.verified, created_at: r.created_at });

/* ---------- AI concierge (Gemini) ---------- */
// The system prompt is built here from the database, never taken from the browser, so the endpoint
// can only ever act as the LEVERA concierge.
const STOP = new Set(['the', 'and', 'for', 'with', 'you', 'have', 'what', 'how', 'much', 'price', 'is', 'do', 'any', 'are', 'can', 'i', 'a', 'an', 'of', 'in', 'to', 'me', 'my', 'гэж', 'байна', 'вэ', 'бэ', 'үнэ', 'хэд', 'юу', 'энэ', 'тэр', 'байгаа', 'уу', 'үү']);
function searchCatalog(text, limit = 12) {
  const words = text.toLowerCase().replace(/[’']/g, '').split(/[^\p{L}\p{N}]+/u).filter(w => w && !STOP.has(w));
  if (!words.some(w => w.length > 1)) return [];
  const brandName = new Map(brandList.map(b => [b.slug, b.name]));
  const scored = [];
  for (const p of catalogList) {
    const hay = ((brandName.get(p.b) || '') + ' ' + p.en + ' ' + p.mn + ' ' + p.type + ' ' + p.cat + ' ' + (TYPE_LABELS[p.type]?.mn || '')).toLowerCase().replace(/[’']/g, '');
    // whole words count most (so "YSL Y" finds Y, not every YSL bottle); parts of words only from 2 letters up
    const toks = new Set(hay.split(/[^\p{L}\p{N}]+/u));
    let s = 0; for (const w of words) if (toks.has(w)) s += 3; else if (w.length > 1 && hay.includes(w)) s += w.length > 3 ? 2 : 1;
    if (s) scored.push([s, p]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1]);
}
async function conciergeSystem(lastUser, productId) {
  await catalog();
  const s = await getSettings();
  const brandName = new Map(brandList.map(b => [b.slug, b.name]));
  const line = p => `${brandName.get(p.b)} — ${p.en} (${p.mn}) · ₮${p.price.toLocaleString('en-US')}${p.sizes.length > 1 ? ' · sizes ' + p.sizes.join('/') : ''}${p.rv ? ` · rated ${p.rv[0]}/5 by ${p.rv[1]}` : ''} · /product.html?id=${p.id}`;
  const range = c => { const xs = catalogList.filter(p => p.cat === c).map(p => p.price); return xs.length ? `₮${Math.min(...xs).toLocaleString('en-US')}–₮${Math.max(...xs).toLocaleString('en-US')}` : ''; };
  const current = productId ? catalogList.find(p => p.id === productId) : null;
  const hits = searchCatalog(lastUser);
  return [
    'You are "LEVERA AI", the customer assistant of LEVERA, a multi-brand online store based in Ulaanbaatar, Mongolia.',
    'Always reply in the language the customer writes in (Mongolian in Cyrillic, or English). Be warm, polished and brief: at most about 90 words, plain text, no markdown headings or tables.',
    'Use ONLY these facts. If something is not covered, say you are not sure and give the phone numbers.',
    '- Delivery: 7–14 days from order to the customer\'s door in Ulaanbaatar, Delivery is already included in every listed price; nothing is added at checkout.',
    '- Payment: QPay with any Mongolian bank app (Khan Bank, Golomt, TDB, State Bank, XacBank and others). No card needed.',
    '- Returns: every purchase is final. No returns or exchanges once an order is confirmed, because each piece is sourced to order. Invite customers to ask about size, fit or colour before ordering.',
    '- Authenticity: pieces are authenticated and inspected at the warehouse before they ship.',
    '- Contact: phone 9993 5918 or 9022 060, email leverastore6@gmail.com. Showroom hours Mon–Sun 10:00–20:00 Ulaanbaatar time.',
    '- Order tracking: order numbers look like LV-26-0000; the tracker is in the site footer. You cannot see real orders.',
    '- Reviews: customers can read and write reviews at the bottom of each product page.',
    `- Houses: ${brandList.map(b => b.name).join(', ')}.`,
    `- Catalogue: ${catalogList.length} pieces. Price ranges: ${['apparel', 'footwear', 'bags', 'accessories', 'fragrance'].map(c => c + ' ' + range(c)).join('; ')}. The shop is /shop.html.`,
    '- Pricing: all prices are in MNT and final, with LEVERA service and delivery included. Fragrance and beauty prices also include Mongolian customs duty (5%) and VAT (10%), like an official perfumery in Ulaanbaatar. Do not talk about cargo, weights or shipping rates; just say delivery is included.',
    current ? `- The customer is looking at: ${line(current)}.` : '',
    hits.length ? '- Pieces matching the question (use these exact names and prices; you may suggest the link):\n' + hits.map(p => '  • ' + line(p)).join('\n') : '',
    'Never say you placed an order, took a payment, reserved stock or checked a real order. Never invent prices, stock, discounts or pieces that are not listed above.'
  ].filter(Boolean).join('\n');
}
async function geminiReply(system, messages) {
  if (!GEMINI_API_KEY) throw new HttpError(503, 'chat not configured');
  const contents = messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && str(m.content, 4000))
    .slice(-12).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: str(m.content, 4000) }] }));
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length) throw new HttpError(400, 'message required');
  const body = JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents,
    // 2.5 Flash can skip thinking. Newer models (gemini-flash-latest, 3.x) always think first; "low" keeps that short,
    // and the thinking counts toward the output limit, so they get more room. The prompt still asks for ~90 words.
    generationConfig: { temperature: 0.4, ...(/2\.5-flash/.test(GEMINI_MODEL)
      ? { maxOutputTokens: 500, thinkingConfig: { thinkingBudget: 0 } }
      : { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'low' } }) } });
  // Google's newer models can take a minute under load and sometimes answer 503 "high demand": wait up to 90 s,
  // and retry a 503 once. If it still fails, the browser falls back to the built-in answers.
  let r;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY }, signal: AbortSignal.timeout(90000), body
      });
    } catch (e) { console.warn('Gemini', e.name === 'TimeoutError' ? 'timed out after 90 s' : e.message); throw new HttpError(504, 'Gemini did not answer in time'); }
    if (r.status !== 503) break;
    await new Promise(res => setTimeout(res, 2000));
  }
  if (!r.ok) { const t = (await r.text()).slice(0, 300); console.warn('Gemini', r.status, t); throw new HttpError(502, 'Gemini ' + r.status); }
  const data = await r.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!text) throw new HttpError(502, 'empty reply');
  return text;
}

/* ---------- routes ---------- */
const routes = [];
const route = (method, pattern, handler, opts = {}) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, ...opts });

const { accounts } = await import('./accounts.mjs');
const acct = accounts({ route, db, readJSON, HttpError, str, limited, publicOrder });
const { rewards, RANKS, cleanCode } = await import('./rewards.mjs');
const rw = rewards({ db });

route('GET', '/api/health', async () => ({ ok: true, db: DB_LABEL.split(' ')[0], products: (await db.get('SELECT COUNT(*) n FROM products WHERE active=1')).n, qpay: qpay.configured(), telegram: !!(TG_TOKEN && TG_CHAT), chat: !!GEMINI_API_KEY }));
route('GET', '/api/catalog', async (req, res) => {
  const body = await catalog();
  if (req.headers['if-none-match'] === catalogEtag) { res.writeHead(304, { ETag: catalogEtag, ...cors }); res.end(); return null; }
  // ~1 MB of JSON: send it gzipped (about a tenth of the size) to browsers that accept it
  if (/gzip/.test(req.headers['accept-encoding'] || '')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding', ETag: catalogEtag, 'Cache-Control': 'no-cache', ...cors });
    res.end(catalogGz); return null;
  }
  send(res, 200, body, { ETag: catalogEtag, 'Cache-Control': 'no-cache' }); return null;
});
route('GET', '/api/products/:id', async (req, res, { id }) => {
  const p = await getProduct(decodeURIComponent(id));
  if (!p || !p.active) throw new HttpError(404, 'not found');
  const s = await getSettings();
  const b = await db.get('SELECT name, city_en, city_mn, tier FROM brands WHERE slug=?', [p.brand_slug]);
  // what the customer pays and what it includes; LEVERA's own cost and margin never leave the server
  const { cost, margin, ...breakdown } = priceProduct(p, s);
  return { product: { ...compact(p, null, true), brand: b }, breakdown, rates: await publicSettings(), reviews: await reviewSummary(p.id) };
});
route('GET', '/api/products/:id/reviews', async (req, res, { id }) => {
  id = decodeURIComponent(id);
  const q = new URL(req.url, 'http://x').searchParams;
  const order = { high: 'rating DESC, id DESC', low: 'rating ASC, id DESC', recent: 'id DESC' }[q.get('sort')] || 'id DESC';
  const per = 6, page = Math.max(1, Math.min(200, +q.get('page') || 1));
  const rows = await db.all(`SELECT * FROM reviews WHERE product_id=? AND status='published' ORDER BY ${order} LIMIT ? OFFSET ?`, [id, per, (page - 1) * per]);
  return { summary: await reviewSummary(id), page, per, reviews: rows.map(publicReview) };
});
// every review in the store (the Reviews page): published ones plus clearly-labelled samples.
// Ratings and the summary count only real, published reviews.
route('GET', '/api/reviews', async req => {
  const q = new URL(req.url, 'http://x').searchParams;
  const where = ["r.status IN ('published','sample')", 'p.active=1'], args = [];
  if (q.get('product')) { where.push('r.product_id=?'); args.push(q.get('product')); }
  if (q.get('brand')) { where.push('p.brand_slug=?'); args.push(q.get('brand')); }
  if (+q.get('rating') >= 1 && +q.get('rating') <= 5) { where.push('r.rating=?'); args.push(+q.get('rating')); }
  const order = { high: 'r.rating DESC, r.id DESC', low: 'r.rating ASC, r.id DESC' }[q.get('sort')] || "CASE WHEN r.status='published' THEN 0 ELSE 1 END, r.created_at DESC, r.id DESC";
  const per = 12, page = Math.max(1, Math.min(500, +q.get('page') || 1));
  const w = 'WHERE ' + where.join(' AND ');
  const from = 'FROM reviews r JOIN products p ON p.id=r.product_id JOIN brands b ON b.slug=p.brand_slug';
  const total = (await db.get(`SELECT COUNT(*) n ${from} ${w}`, args)).n;
  const rows = await db.all(`SELECT r.*, p.name_en, p.name_mn, p.photo, p.img, p.brand_slug, b.name brand ${from} ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, [...args, per, (page - 1) * per]);
  const real = await db.all(`SELECT r.rating, COUNT(*) n ${from} ${w.replace("r.status IN ('published','sample')", "r.status='published'")} GROUP BY r.rating`, args);
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }; for (const r of real) dist[r.rating] = Number(r.n);
  const count = Object.values(dist).reduce((a, b) => a + b, 0);
  const avg = count ? Math.round(Object.entries(dist).reduce((a, [k, n]) => a + k * n, 0) / count * 10) / 10 : 0;
  const samples = (await db.get(`SELECT COUNT(*) n ${from} ${w} AND r.status='sample'`, args)).n;
  return { total, page, per, summary: { count, avg, dist }, samples,
    reviews: rows.map(r => ({ ...publicReview(r), sample: r.status === 'sample', product: { id: r.product_id, en: r.name_en, mn: r.name_mn, brand: r.brand, b: r.brand_slug, img: r.photo || r.img } })) };
});
route('POST', '/api/products/:id/reviews', async (req, res, { id }) => {
  if (limited(req, 'review', 5, 60 * 60 * 1000)) throw new HttpError(429, 'too many reviews, try again later');
  id = decodeURIComponent(id);
  const p = await getProduct(id);
  if (!p || !p.active) throw new HttpError(404, 'not found');
  const b = await readJSON(req);
  const name = str(b.name, 60), title = str(b.title, 120), body = str(b.body, 2000), rating = parseInt(b.rating, 10);
  if (!name || !(rating >= 1 && rating <= 5) || body.length < 10) throw new HttpError(400, 'name, a 1–5 rating and a review of at least 10 characters are required');
  const sizes = JSON.parse(p.sizes || '[]'), size = sizes.includes(str(b.size, 20)) ? str(b.size, 20) : null;
  const fit = FITS.includes(b.fit) ? b.fit : null;
  // "Verified purchase": the order exists, is paid, contains this piece, and the phone on it matches
  let verified = 0, orderNo = null;
  const no = str(b.order_no, 20).toUpperCase();
  if (no) {
    const o = await orderByNo(no);
    const digits = v => String(v || '').replace(/\D/g, '').slice(-8);
    if (!o || o.payment !== 'paid' || digits(o.phone) !== digits(b.phone) || !JSON.parse(o.items).some(i => i.id === id)) throw new HttpError(400, 'order not found for this phone number and piece');
    if (await db.get('SELECT 1 FROM reviews WHERE order_no=? AND product_id=?', [no, id])) throw new HttpError(409, 'this order already has a review for this piece');
    verified = 1; orderNo = no;
  }
  const r = await db.run('INSERT INTO reviews(product_id,name,rating,title,body,size,fit,order_no,verified,lang) VALUES(?,?,?,?,?,?,?,?,?,?)',
    [id, name, rating, title || null, body, size, fit, orderNo, verified, str(b.lang, 4) || null]);
  invalidate();
  const row = await db.get('SELECT * FROM reviews WHERE id=?', [r.insertId]);
  return { review: publicReview(row), summary: await reviewSummary(id) };
});
route('POST', '/api/cargo/quote', async req => {
  const { weight_kg, dims, m3 } = await readJSON(req);
  const w = Number(weight_kg), v = m3 != null ? Number(m3) : toM3((dims || []).map(Number));
  if (!(w > 0 && w < 500) || !(v >= 0 && v < 20)) throw new HttpError(400, 'weight_kg (0–500) and dims [l,w,h] cm or m3 required');
  const s = await getSettings();
  return hicargoFee(w, v, { yuan: s.cargo_yuan, kg: s.cargo_kg, m3: s.cargo_m3 });
});

route('POST', '/api/orders', async (req) => {
  if (limited(req, 'order', 8, 10 * 60 * 1000)) throw new HttpError(429, 'too many orders, try again later');
  const b = await readJSON(req);
  const name = str(b.name, 80), phone = str(b.phone, 20).replace(/[^\d+]/g, ''), address = str(b.address, 400), district = str(b.district, 60), note = str(b.note, 400);
  if (!name || !/^\+?\d{8,12}$/.test(phone) || address.length < 5) throw new HttpError(400, 'name, phone (8 digits) and address are required');
  if (!b.ack) throw new HttpError(400, 'final-sale acknowledgement required');
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) throw new HttpError(400, 'items required');
  const items = [];
  for (const it of b.items) {
    const p = await getProduct(str(it.id, 120));
    if (!p || !p.active) throw new HttpError(400, 'product unavailable: ' + str(it.id, 120));
    const sizes = JSON.parse(p.sizes || '[]'); const size = str(it.size, 20) || null;
    if (sizes.length > 1 && !sizes.includes(size)) throw new HttpError(400, 'size required for ' + p.name_en);
    const qty = Math.max(1, Math.min(9, parseInt(it.qty, 10) || 1));
    const brand = (await db.get('SELECT name FROM brands WHERE slug=?', [p.brand_slug])).name;
    items.push({ id: p.id, brand, name: p.name_en, name_mn: p.name_mn, size, qty, cny: p.cny, price: p.price_mnt, cargo: p.cargo_mnt, img: p.photo || p.img, dewu_url: p.dewu_url || null });
  }
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const no = await newOrderNo();
  const me = await acct.customer(req);
  const code = cleanCode(b.gift_code);
  const q = await rw.quote(subtotal, me ? me.id : null, code);
  if (code && q.gift_balance === null) throw new HttpError(400, 'gift card not valid');
  if (q.gift_used && !(await rw.spend(code, q.gift_used))) throw new HttpError(409, 'gift card balance changed, please try again');
  const total = q.total;
  await db.run('INSERT INTO orders(no,name,phone,address,district,note,items,subtotal,total,history,customer_id,rank_off,gift_code,gift_used) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [no, name, phone, address, district, note, JSON.stringify(items), subtotal, total, JSON.stringify([{ status: 'pending', at: new Date().toISOString() }]), me ? me.id : null, q.rank_off, q.gift_used ? code : null, q.gift_used]);
  // a signed-in customer's delivery address becomes their default for next time
  if (me) await db.run('UPDATE customers SET address=?, district=? WHERE id=?', [address, district || null, me.id]);
  let order = await orderByNo(no);
  notifyTelegram(orderMessage(order, '🕒 Шинэ захиалга (төлбөр хүлээгдэж байна)')).catch(e => console.warn(e.message));
  // a gift card covered everything: nothing left to pay
  if (total === 0) { order = await markPaid(order, 'gift card'); return { order: publicOrder(order), qpay: null, demo: false }; }
  let invoice = null;
  if (qpay.configured()) {
    invoice = await qpay.createInvoice({ no, amount: total, description: `LEVERA ${no}`, callbackUrl: `${process.env.PUBLIC_URL || ''}/api/qpay/callback?no=${encodeURIComponent(no)}` });
    await db.run('UPDATE orders SET qpay_invoice=? WHERE no=?', [invoice.invoice_id, no]);
  }
  return { order: publicOrder(order), qpay: invoice ? { qr_image: invoice.qr_image, qr_text: invoice.qr_text, short_url: invoice.qPay_shortUrl, urls: invoice.urls } : null, demo: !invoice };
});
// checkout preview: same sums as the order itself, nothing is taken
route('POST', '/api/checkout/quote', async req => {
  if (limited(req, 'quote', 60, 60 * 1000)) throw new HttpError(429, 'slow down');
  const b = await readJSON(req); let subtotal = 0;
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 30)) { const p = await getProduct(str(it.id, 120)); if (p && p.active) subtotal += p.price_mnt * Math.max(1, Math.min(9, parseInt(it.qty, 10) || 1)); }
  const me = await acct.customer(req), code = cleanCode(b.gift_code);
  if (code && limited(req, 'giftcheck', 15, 10 * 60 * 1000)) throw new HttpError(429, 'too many tries, try again later');
  const q = await rw.quote(subtotal, me ? me.id : null, code);
  return { ...q, gift_ok: !code || q.gift_balance !== null };
});
route('GET', '/api/account/rank', async req => {
  const me = await acct.customer(req); if (!me) throw new HttpError(401, 'sign in');
  return { ...(await rw.rankOf(me.id)), ranks: RANKS };
});
// buying a gift card is an order of its own; the code works once it is paid
route('POST', '/api/giftcards', async req => {
  if (limited(req, 'order', 8, 10 * 60 * 1000)) throw new HttpError(429, 'too many orders, try again later');
  const b = await readJSON(req), amount = parseInt(b.amount, 10), name = str(b.name, 80), phone = str(b.phone, 20).replace(/[^\d+]/g, '');
  if (!(amount >= 10000 && amount <= 200000 && amount % 10000 === 0)) throw new HttpError(400, 'amount must be ₮10,000–200,000');
  if (!name || !/^\+?\d{8,12}$/.test(phone)) throw new HttpError(400, 'name and phone (8 digits) are required');
  const no = await newOrderNo(), me = await acct.customer(req);
  const items = [{ id: 'gift-card', brand: 'LEVERA', name: 'Gift card', name_mn: 'Бэлгийн карт', size: null, qty: 1, cny: 0, price: amount, cargo: 0, img: 'assets/favicon.svg', dewu_url: null }];
  await db.run("INSERT INTO orders(no,name,phone,address,district,note,items,subtotal,total,history,customer_id,kind) VALUES(?,?,?,?,?,?,?,?,?,?,?,'gift')",
    [no, name, phone, 'Бэлгийн карт (цахим)', null, null, JSON.stringify(items), amount, amount, JSON.stringify([{ status: 'pending', at: new Date().toISOString() }]), me ? me.id : null]);
  await rw.create(amount, phone, no);
  const order = await orderByNo(no);
  notifyTelegram(orderMessage(order, '🎁 Бэлгийн карт (төлбөр хүлээгдэж байна)')).catch(e => console.warn(e.message));
  let invoice = null;
  if (qpay.configured()) {
    invoice = await qpay.createInvoice({ no, amount, description: `LEVERA gift card ${no}`, callbackUrl: `${process.env.PUBLIC_URL || ''}/api/qpay/callback?no=${encodeURIComponent(no)}` });
    await db.run('UPDATE orders SET qpay_invoice=? WHERE no=?', [invoice.invoice_id, no]);
  }
  return { order: publicOrder(order), qpay: invoice ? { qr_image: invoice.qr_image, qr_text: invoice.qr_text, short_url: invoice.qPay_shortUrl, urls: invoice.urls } : null, demo: !invoice };
});
// the code goes only to whoever has both the order number and the buyer's phone, and only once it is paid
route('POST', '/api/giftcards/code', async req => {
  if (limited(req, 'giftcode', 20, 10 * 60 * 1000)) throw new HttpError(429, 'too many tries, try again later');
  const b = await readJSON(req), no = str(b.no, 20).toUpperCase(), phone = str(b.phone, 20).replace(/[^\d+]/g, '');
  let o = await orderByNo(no);
  if (!o || o.kind !== 'gift' || o.phone !== phone) throw new HttpError(404, 'not found');
  if (o.payment !== 'paid' && o.qpay_invoice && qpay.configured() && await qpay.isPaid(o.qpay_invoice, o.total)) o = await markPaid(o, 'qpay check');
  if (o.payment !== 'paid') return { paid: false };
  const c = await rw.byOrder(no);
  return { paid: true, code: c.status === 'active' ? c.code : null, amount: c.amount, balance: c.balance };
});
route('GET', '/api/orders/:no', async (req, res, { no }) => {
  if (limited(req, 'track', 60, 60 * 1000)) throw new HttpError(429, 'slow down');
  const o = await orderByNo(decodeURIComponent(no).toUpperCase());
  if (!o) throw new HttpError(404, 'order not found');
  return publicOrder(o);
});
route('POST', '/api/orders/:no/check', async (req, res, { no }) => {
  let o = await orderByNo(decodeURIComponent(no).toUpperCase());
  if (!o) throw new HttpError(404, 'order not found');
  if (o.payment !== 'paid' && o.qpay_invoice && qpay.configured()) { if (await qpay.isPaid(o.qpay_invoice, o.total)) o = await markPaid(o, 'qpay check'); }
  return { payment: o.payment, status: o.status };
});
route('GET', '/api/qpay/callback', qpayCallback);
route('POST', '/api/qpay/callback', qpayCallback);
async function qpayCallback(req) {
  const no = new URL(req.url, 'http://x').searchParams.get('no') || '';
  const o = await orderByNo(no);
  if (o && o.qpay_invoice && o.payment !== 'paid' && await qpay.isPaid(o.qpay_invoice, o.total)) await markPaid(o, 'qpay callback');
  return { ok: true };
}
route('POST', '/api/newsletter', async req => {
  if (limited(req, 'nl', 10, 60 * 60 * 1000)) throw new HttpError(429, 'slow down');
  const b = await readJSON(req); const email = str(b.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'valid email required');
  await db.run(upsert('subscribers', ['email', 'interests', 'lang'], ['email'], ['interests', 'lang']),
    [email, JSON.stringify((b.interests || []).slice(0, 10).map(x => str(x, 30))), str(b.lang, 4)]);
  return { ok: true };
});
route('POST', '/api/chat', async req => {
  if (limited(req, 'chat', 30, 10 * 60 * 1000)) throw new HttpError(429, 'busy');
  const { messages, product } = await readJSON(req);
  const list = Array.isArray(messages) ? messages : [];
  const lastUser = [...list].reverse().find(m => m && m.role === 'user');
  return { reply: await geminiReply(await conciergeSystem(str(lastUser?.content, 500), str(product, 160)), list) };
});

/* ---------- admin ---------- */
const PRODUCT_EDITABLE = { stock_left: 'num', discount_pct: 'pct', cny: 'num', retail_usd: 'usd', weight_kg: 'num', len_cm: 'num', wid_cm: 'num', hei_cm: 'num', name_en: 'str', name_mn: 'str', active: 'bool', featured: 'num', dewu_url: 'str', dewu_spu: 'str', price_source: 'str', sizes: 'json' };
route('GET', '/api/admin/me', () => ({ ok: true }), { admin: true });
route('GET', '/api/admin/stats', async () => ({
  products: await db.get('SELECT COUNT(*) n, SUM(active) active, SUM(price_source<>\'estimate\') live, SUM(photo IS NOT NULL) photos FROM products'),
  orders: await db.get("SELECT COUNT(*) n, SUM(payment='paid') paid, SUM(CASE WHEN payment='paid' THEN total ELSE 0 END) revenue FROM orders"),
  subscribers: (await db.get('SELECT COUNT(*) n FROM subscribers')).n,
  reviews: await db.get("SELECT COUNT(*) n, SUM(status='published') published, AVG(rating) avg FROM reviews"),
  byStatus: await db.all('SELECT status, COUNT(*) n FROM orders GROUP BY status'),
  settings: await getSettings(), qpay: qpay.configured(), telegram: !!(TG_TOKEN && TG_CHAT), chat: !!GEMINI_API_KEY, chatModel: GEMINI_MODEL, db: DB_LABEL
}), { admin: true });
route('GET', '/api/admin/products', async req => {
  const q = new URL(req.url, 'http://x').searchParams;
  const where = [], args = [];
  if (q.get('brand')) { where.push('brand_slug=?'); args.push(q.get('brand')); }
  if (q.get('cat')) { where.push('cat=?'); args.push(q.get('cat')); }
  if (q.get('q')) { where.push('(name_en LIKE ? OR name_mn LIKE ? OR id LIKE ?)'); const l = '%' + q.get('q') + '%'; args.push(l, l, l); }
  if (q.get('source')) { where.push('price_source=?'); args.push(q.get('source')); }
  const page = Math.max(1, +q.get('page') || 1), per = Math.min(200, +q.get('per') || 50);
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (await db.get(`SELECT COUNT(*) n FROM products ${w}`, args)).n;
  const rows = await db.all(`SELECT * FROM products ${w} ORDER BY brand_slug, sort LIMIT ? OFFSET ?`, [...args, per, (page - 1) * per]);
  return { total, page, per, rows };
}, { admin: true });
route('PATCH', '/api/admin/products/:id', async (req, res, { id }) => {
  id = decodeURIComponent(id);
  if (!(await getProduct(id))) throw new HttpError(404, 'not found');
  const b = await readJSON(req), sets = [], args = [];
  for (const [k, t] of Object.entries(PRODUCT_EDITABLE)) if (k in b) {
    let v = b[k];
    if (t === 'num') { v = Number(v); if (!Number.isFinite(v) || v < 0) throw new HttpError(400, k + ' must be a number'); }
    if (t === 'usd') { v = v === '' || v == null || Number(v) === 0 ? null : Number(v); if (v != null && !(v > 0)) throw new HttpError(400, 'retail price must be a number'); }
    if (t === 'pct') { v = Math.round(Number(v)); if (!Number.isFinite(v) || v < 0 || v > 90) throw new HttpError(400, 'discount must be 0–90 %'); }
    if (t === 'bool') v = v ? 1 : 0;
    if (t === 'str') v = v == null || v === '' ? null : str(v, 500);
    if (t === 'json') v = JSON.stringify(Array.isArray(v) ? v.map(x => str(x, 20)) : []);
    sets.push(k + '=?'); args.push(v);
  }
  if ('cny' in b && !('price_source' in b)) { sets.push('price_source=?'); args.push('manual'); }
  if (!sets.length) throw new HttpError(400, 'nothing to update');
  await db.run(`UPDATE products SET ${sets.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...args, id]);
  await repriceOne(id); invalidate();
  return db.get('SELECT * FROM products WHERE id=?', [id]);
}, { admin: true });
const IMG_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
async function savePhoto(id, buf, type, source = null) {
  const ext = IMG_EXT[type]; if (!ext) throw new HttpError(415, 'jpeg, png, webp or avif only');
  for (const e of Object.values(IMG_EXT)) await files.remove(ROOT, `${LIVE}/${id}${e}`);
  await files.save(ROOT, `${LIVE}/${id}${ext}`, buf, type);
  const url = `${LIVE}/${id}${ext}?v=${Date.now().toString(36)}`;
  const cur = await db.get('SELECT photos FROM products WHERE id=?', [id]);
  let g = []; try { g = JSON.parse(cur?.photos || '[]').filter(u => !u.startsWith('uploads/products/' + id + '.') && !u.startsWith(LIVE + '/' + id + '.')); } catch {}
  await db.run('UPDATE products SET photo=?, photos=?, photo_src=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [url, JSON.stringify([url, ...g].slice(0, 6)), source, id]);
  invalidate(); return url;
}
// gallery photos added in admin: uploads/products/<id>/a-<time>.<ext>, appended after the existing ones
async function addGalleryPhoto(id, buf, type) {
  const ext = IMG_EXT[type]; if (!ext) throw new HttpError(415, 'jpeg, png, webp or avif only');
  const name = 'a-' + Date.now().toString(36) + ext;
  await files.save(ROOT, `${LIVE}/${id}/${name}`, buf, type);
  const url = `${LIVE}/${id}/${name}`;
  const cur = await db.get('SELECT photo, photos FROM products WHERE id=?', [id]);
  let g = []; try { g = JSON.parse(cur?.photos || '[]'); } catch {}
  if (!g.length && cur?.photo) g = [cur.photo];
  if (g.length >= 8) throw new HttpError(400, 'a piece can have at most 8 photos');
  g.push(url);
  await db.run('UPDATE products SET photo=COALESCE(photo, ?), photos=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [url, JSON.stringify(g), id]);
  invalidate(); return url;
}
// remove one photo from a gallery (the file stays on disk until the folder is cleaned)
route('DELETE', '/api/admin/products/:id/gallery', async (req, res, { id }) => {
  id = decodeURIComponent(id);
  const url = str(new URL(req.url, 'http://x').searchParams.get('url'), 300);
  const cur = await db.get('SELECT photo, photos FROM products WHERE id=?', [id]); if (!cur) throw new HttpError(404, 'not found');
  let g = []; try { g = JSON.parse(cur.photos || '[]'); } catch {}
  g = g.filter(u => u !== url);
  await db.run('UPDATE products SET photo=?, photos=? WHERE id=?', [g[0] || null, JSON.stringify(g), id]);
  invalidate(); return { photos: g };
}, { admin: true });

// a new piece from the admin form: { brand_slug | new_brand: { name, city_en, city_mn, tier }, model, colour, type, cny, sizes?, name_mn? }
const { SIZE_RUNS } = await import('./catalog/dict.mjs');
const slugify = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
route('POST', '/api/admin/products', async req => {
  const b = await readJSON(req);
  let brand = str(b.brand_slug, 80);
  if (b.new_brand && str(b.new_brand.name, 120)) {
    const nb = b.new_brand, name = str(nb.name, 120);
    brand = slugify(name); if (!brand) throw new HttpError(400, 'brand name needs letters or digits');
    if (!(await db.get('SELECT 1 FROM brands WHERE slug=?', [brand]))) {
      const sort = ((await db.get('SELECT MAX(sort) m FROM brands')).m || 0) + 1;
      await db.run('INSERT INTO brands(slug,name,city_en,city_mn,blurb_en,blurb_mn,tier,sort) VALUES(?,?,?,?,?,?,?,?)',
        [brand, name, str(nb.city_en, 80) || null, str(nb.city_mn, 80) || null, str(nb.blurb_en, 300) || null, str(nb.blurb_mn, 300) || null, nb.tier === 'luxury' ? 'luxury' : 'street', sort]);
    }
  }
  const br = await db.get('SELECT slug FROM brands WHERE slug=?', [brand]); if (!br) throw new HttpError(400, 'choose a brand');
  const model = str(b.model, 160), colour = str(b.colour, 80), type = str(b.type, 40), T = TYPES[type];
  if (!model) throw new HttpError(400, 'model name required');
  if (!T) throw new HttpError(400, 'choose a product type');
  const cny = Number(b.cny); if (!(cny > 0)) throw new HttpError(400, 'item price in ¥ required');
  let id = slugify(brand + '-' + model + (colour ? '-' + colour : '')); const base = id;
  for (let k = 2; await db.get('SELECT 1 FROM products WHERE id=?', [id]); k++) id = base + '-' + k;
  const sep = T.cat === 'fragrance' ? ', ' : ' — ';
  const sizes = Array.isArray(b.sizes) && b.sizes.length ? b.sizes.map(x => str(x, 20)).filter(Boolean).slice(0, 30) : SIZE_RUNS[T.sizes] || [];
  const sort = ((await db.get('SELECT MAX(sort) m FROM products WHERE brand_slug=?', [brand])).m || 0) + 1;
  const usd = Number(b.retail_usd) > 0 ? Number(b.retail_usd) : null;
  await db.run(`INSERT INTO products(id,brand_slug,line,type,cat,name_en,name_mn,color_key,variant,cny,retail_usd,weight_kg,len_cm,wid_cm,hei_cm,sizes,img,price_source,featured,active,sort)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, brand, model, type, T.cat, colour ? model + sep + colour : model, colour ? model + sep + (str(b.colour_mn, 80) || colour) : model, null, colour || null,
     cny, usd, Number(b.weight_kg) > 0 ? Number(b.weight_kg) : T.w, T.box[0], T.box[1], T.box[2], JSON.stringify(sizes), '', 'manual', b.featured ? 1 : 0, 1, sort]);
  await repriceOne(id); invalidate();
  return db.get('SELECT * FROM products WHERE id=?', [id]);
}, { admin: true });
route('POST', '/api/admin/products/:id/photo', async (req, res, { id }) => {
  id = decodeURIComponent(id); if (!(await getProduct(id))) throw new HttpError(404, 'not found');
  const buf = await readBody(req, 10 * 1024 * 1024), type = (req.headers['content-type'] || '').split(';')[0];
  // ?append=1 adds the photo to the gallery; otherwise it becomes the main photo
  if (new URL(req.url, 'http://x').searchParams.get('append')) return { photo: await addGalleryPhoto(id, buf, type) };
  return { photo: await savePhoto(id, buf, type) };
}, { admin: true });
route('DELETE', '/api/admin/products/:id/photo', async (req, res, { id }) => {
  id = decodeURIComponent(id);
  for (const e of Object.values(IMG_EXT)) await files.remove(ROOT, `${LIVE}/${id}${e}`);
  await files.removeDir(ROOT, `${LIVE}/${id}`);
  try { for (const e of Object.values(IMG_EXT)) { const f = join(UPLOADS, id + e); if (existsSync(f)) unlinkSync(f); } const dir = join(UPLOADS, id); if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); } catch {}
  await db.run('UPDATE products SET photo=NULL, photos=NULL, photo_src=NULL WHERE id=?', [id]); invalidate(); return { ok: true };
}, { admin: true });
// bulk import from a Dewu export / spreadsheet: [{ id, cny, dewu_url, dewu_spu, photo_url, name_en, name_mn, weight_kg }]
route('POST', '/api/admin/import', async req => {
  const rows = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString('utf8'));
  if (!Array.isArray(rows)) throw new HttpError(400, 'array expected');
  const out = { updated: 0, photos: 0, errors: [] };
  for (const r of rows) {
    const id = str(r.id, 120); if (!(await getProduct(id))) { out.errors.push(id + ': unknown id'); continue; }
    const sets = [], args = [];
    if (r.cny > 0) { sets.push('cny=?', "price_source='dewu'"); args.push(Number(r.cny)); }
    for (const k of ['dewu_url', 'dewu_spu', 'name_en', 'name_mn']) if (r[k]) { sets.push(k + '=?'); args.push(str(r[k], 500)); }
    if (r.weight_kg > 0) { sets.push('weight_kg=?'); args.push(Number(r.weight_kg)); }
    if (sets.length) { await db.run(`UPDATE products SET ${sets.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...args, id]); await repriceOne(id); out.updated++; }
    if (r.photo_url && /^https:\/\//.test(r.photo_url)) {
      try { const pr = await fetch(r.photo_url, { signal: AbortSignal.timeout(15000) }); if (pr.ok) { await savePhoto(id, Buffer.from(await pr.arrayBuffer()), (pr.headers.get('content-type') || '').split(';')[0], r.photo_url); out.photos++; } else out.errors.push(id + ': photo ' + pr.status); }
      catch (e) { out.errors.push(id + ': photo ' + e.message); }
    }
  }
  invalidate(); return out;
}, { admin: true });
// a sale on many pieces at once: { pct, brand?, cat?, ids? } — pct 0 ends the sale for them
route('POST', '/api/admin/discounts', async req => {
  const b = await readJSON(req), pct = Math.round(Number(b.pct));
  if (!Number.isFinite(pct) || pct < 0 || pct > 90) throw new HttpError(400, 'pct must be 0–90');
  const where = ['active=1'], args = [];
  if (b.brand) { where.push('brand_slug=?'); args.push(str(b.brand, 80)); }
  if (b.cat) { where.push('cat=?'); args.push(str(b.cat, 40)); }
  if (Array.isArray(b.ids) && b.ids.length) { where.push('id IN (' + b.ids.map(() => '?').join(',') + ')'); args.push(...b.ids.slice(0, 2000).map(x => str(x, 160))); }
  if (where.length === 1) throw new HttpError(400, 'choose a brand, a category or products');
  const r = await db.run(`UPDATE products SET discount_pct=?, updated_at=CURRENT_TIMESTAMP WHERE ${where.join(' AND ')}`, [pct, ...args]);
  await repriceAll(); invalidate();
  return { updated: r.changes, pct };
}, { admin: true });
// after tools/fetch-photos.mjs has written photos straight into the database
route('POST', '/api/admin/reload', () => { invalidate(); return { ok: true }; }, { admin: true });
route('GET', '/api/admin/orders', async req => {
  const q = new URL(req.url, 'http://x').searchParams;
  const rows = q.get('status') ? await db.all('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 500', [q.get('status')]) : await db.all('SELECT * FROM orders ORDER BY id DESC LIMIT 500');
  return rows.map(o => ({ ...o, items: JSON.parse(o.items), history: JSON.parse(o.history || '[]') }));
}, { admin: true });
route('PATCH', '/api/admin/orders/:no', async (req, res, { no }) => {
  const o = await orderByNo(decodeURIComponent(no));
  if (!o) throw new HttpError(404, 'not found');
  const b = await readJSON(req);
  if (b.payment === 'paid' && o.payment !== 'paid') await markPaid(o, 'admin');
  if (b.status) {
    if (!STATUSES.includes(b.status)) throw new HttpError(400, 'status must be one of ' + STATUSES.join(', '));
    const cur = await orderByNo(o.no);
    await db.run('UPDATE orders SET status=?, history=? WHERE no=?', [b.status, addHistory(cur, b.status, str(b.note, 200)), o.no]);
    // cancelling gives back what the order took from a gift card, and voids a card that was bought
    if (b.status === 'cancelled' && cur.status !== 'cancelled') {
      if (cur.gift_code && cur.gift_used) await rw.refund(cur.gift_code, cur.gift_used);
      if (cur.kind === 'gift') await rw.voidCard(cur.no);
    }
    invalidate();
  }
  const fresh = await orderByNo(o.no);
  return { ...fresh, items: JSON.parse(fresh.items), history: JSON.parse(fresh.history || '[]') };
}, { admin: true });
route('GET', '/api/admin/giftcards', () => db.all('SELECT * FROM gift_cards ORDER BY created_at DESC LIMIT 500'), { admin: true });
route('GET', '/api/admin/reviews', async req => {
  const q = new URL(req.url, 'http://x').searchParams;
  const st = q.get('status');
  const rows = await db.all(`SELECT r.*, p.name_en, p.brand_slug, p.photo, p.img FROM reviews r LEFT JOIN products p ON p.id=r.product_id ${st ? 'WHERE r.status=?' : ''} ORDER BY r.id DESC LIMIT 500`, st ? [st] : []);
  return rows;
}, { admin: true });
route('PATCH', '/api/admin/reviews/:id', async (req, res, { id }) => {
  const b = await readJSON(req);
  if (!['published', 'hidden'].includes(b.status)) throw new HttpError(400, 'status must be published or hidden');
  const r = await db.run('UPDATE reviews SET status=? WHERE id=?', [b.status, Number(id)]);
  if (!r.changes) throw new HttpError(404, 'not found');
  invalidate(); return { ok: true };
}, { admin: true });
route('DELETE', '/api/admin/reviews/:id', async (req, res, { id }) => {
  await db.run('DELETE FROM reviews WHERE id=?', [Number(id)]); invalidate(); return { ok: true };
}, { admin: true });
route('GET', '/api/admin/settings', () => getSettings(), { admin: true });
route('PUT', '/api/admin/settings', async req => {
  const b = await readJSON(req), clean = {};
  for (const k of [...dbm.PRICE_KEYS, 'cargo_yuan', 'cargo_kg', 'cargo_m3', 'hicargo_branch_id'])
    if (k in b) { const v = Number(b[k]); if (!Number.isFinite(v) || v < 0) throw new HttpError(400, k + ' must be a number'); clean[k] = v; }
  await setSettings(clean); await repriceAll(); invalidate(); return getSettings();
}, { admin: true });
route('POST', '/api/admin/rates/sync', () => syncRates(), { admin: true });
route('POST', '/api/admin/seed-sync', async () => { const r = await dbm.applySeed(); invalidate(); return r; }, { admin: true });
route('GET', '/api/admin/subscribers', () => db.all('SELECT * FROM subscribers ORDER BY created_at DESC'), { admin: true });
route('POST', '/api/admin/test-notify', async () => ({ sent: await notifyTelegram('✅ LEVERA: Telegram мэдэгдэл ажиллаж байна.') }), { admin: true });

/* ---------- static files ---------- */
async function serveLive(path, req, res) {
  const rel = path.slice(1);
  if (rel.includes('..')) { res.writeHead(404); return res.end(); }
  const st = await files.open(ROOT, rel).catch(() => null);
  if (!st) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': MIME[extname(rel).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'public, max-age=604800', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') return res.end();
  st.on('error', () => res.end()).pipe(res);
}
function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.startsWith('/' + LIVE + '/')) return serveLive(path, req, res);
  if (path === '/') path = '/index.html';
  const top = path.split('/')[1] || '';
  const ok = (/^[\w-]+\.html$/.test(top) && path.split('/').length === 2) || STATIC_DIRS.includes(top) || ['/favicon.ico', '/robots.txt'].includes(path);
  const file = normalize(join(ROOT, path));
  if (!ok || !file.startsWith(ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) {
    if (req.method === 'GET' && !extname(path)) { res.writeHead(302, { Location: '/' }); return res.end(); }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found');
  }
  const ext = extname(file).toLowerCase();
  const cache = ['.html'].includes(ext) ? 'no-cache' : /\/(assets|uploads)\//.test(file.replace(/\\/g, '/')) ? 'public, max-age=604800' : 'public, max-age=300';
  // text files (pages, styles, scripts, data) go out gzipped when the browser accepts it
  const zip = ['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt'].includes(ext) && /gzip/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', ...(zip && { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' }) });
  if (req.method === 'HEAD') return res.end();
  zip ? createReadStream(file).pipe(createGzip()).pipe(res) : createReadStream(file).pipe(res);
}

/* ---------- server ---------- */
// the request handler: run by the local server below, or by the Cloud Function on Firebase (functions/index.js)
export async function handle(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, corsFor(req)); return res.end(); }
  const path = new URL(req.url, 'http://x').pathname;
  if (!path.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    // sitemap for search engines: the pages plus every product on sale
    if (path === '/sitemap.xml') {
      await catalog();
      const base = (process.env.PUBLIC_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
      const urls = ['/', '/shop.html', '/shop.html?sale=1', '/reviews.html', ...brandList.map(b => '/shop.html?brand=' + b.slug), ...catalogList.map(p => '/product.html?id=' + encodeURIComponent(p.id))];
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(u => '<url><loc>' + base + u.replace(/&/g, '&amp;') + '</loc></url>').join('') + '</urlset>');
    }
    return serveStatic(req, res);
  }
  try {
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = path.match(r.re); if (!m) continue;
      if (r.admin && !isAdmin(req)) throw new HttpError(401, 'admin token required');
      const out = await r.handler(req, res, m.groups || {});
      if (out !== null && !res.headersSent) send(res, 200, out);
      return;
    }
    throw new HttpError(404, 'no such endpoint');
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'server error' });
  }
}
const server = http.createServer(handle);
if (!process.env.LEVERA_FUNCTION) server.listen(PORT, () => {
  console.log(`LEVERA on http://localhost:${PORT}  ·  admin: http://localhost:${PORT}/admin.html`);
  console.log(`Database: ${DB_LABEL}`);
  console.log(`Admin token: ${process.env.ADMIN_TOKEN ? '(from ADMIN_TOKEN in .env)' : ADMIN_TOKEN + '  (saved in data/admin-token.txt)'}`);
  console.log(`QPay: ${qpay.configured() ? 'live' : 'demo mode (set QPAY_* in server/.env)'} · Telegram: ${TG_TOKEN && TG_CHAT ? 'on' : 'off'} · AI chat: ${GEMINI_API_KEY ? 'Gemini ' + GEMINI_MODEL : 'built-in answers (set GEMINI_API_KEY in server/.env)'}`);
});
