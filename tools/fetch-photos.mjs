// LEVERA — find real product photos (a gallery of up to 5 per piece) and save them as the product's photos.
//   npm run photos                      → every product without a photo gallery yet
//   npm run photos -- --all             → redo every product
//   npm run photos -- --brand nike      → one house          (add --all to redo ones that already have photos)
//   npm run photos -- --id <product-id> → one piece (always redone)
//   npm run photos -- --thin            → only products with fewer than 3 photos
//   npm run photos -- --ids data/photo-audit.json --replace   → re-do the products that failed the photo audit
//   npm run photos -- --cat footwear    → one category (--skip-cat footwear: everything else)
//   npm run photos -- --limit 20        → try it on a few first
// Where the photos come from, best first:
//   1. StockX — the clean white-background product shot (side profile for sneakers), plus the 360° turntable
//      angles StockX publishes for most sneakers (front, other side, back, three-quarter).
//   2. Web image search (Bing; Google Images can't be queried without a browser) — studio photos from official
//      sites and authorised retailers, matched on the model and colourway, near-duplicates removed.
//      Replica marketplaces and stock-photo sites are never used.
// Each photo is fitted onto an 800×1000 canvas (the 4:5 frame the shop uses) and written to
// uploads/products/<id>/1.webp … 5.webp. products.photo = the main photo, products.photos = the gallery (JSON),
// products.photo_src = the page the main photo came from (shown in admin so you can check it).
// Search results are a best match, not a guarantee: check them in admin → Бараа and replace any that are wrong.
import { analyse, render, toneGap, colourFit } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs');
await dbm.ready;
const db = dbm.db;

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const ALL = !!(opt('all') || opt('force')), LIMIT = Number(opt('limit')) || Infinity, ONLY_BRAND = opt('brand'), ONLY_ID = opt('id'), ONLY_CAT = opt('cat'), SKIP_CAT = opt('skip-cat');
// --ids <file>: only the products listed in a JSON file (e.g. data/photo-audit.json from the photo audit)
// --replace: those products get the new set even if it is smaller than what they have (their current photos failed the check)
const IDS_FILE = opt('ids'), REPLACE = !!opt('replace');
// --loose: for pieces that found nothing, accept photos of the right model whose title doesn't name the colour
const LOOSE = !!opt('loose');
// --verify-colour: reject photos whose colours don't fit the product's colour name
const VERIFY = !!opt('verify-colour');
const CONCURRENCY = Number(opt('concurrency')) || 5, MAX = 5;
const UPLOADS = join(ROOT, 'uploads', 'products');
mkdirSync(UPLOADS, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// replica / drop-shipping marketplaces and stock-photo sites: never use
const BLOCK = /aliexpress|alibaba|dhgate|temu\.|wish\.com|joom|shein|1688\.|yupoo|weidian|replica|\breps?\b|superclone|\baaa\b|kakobuy|pandabuy|cssbuy|shutterstock|alamy|gettyimages|istockphoto|dreamstime|123rf|depositphotos|vecteezy|freepik|youtube|ytimg|tiktok|reddit|redd\.it/i;
// official sites and authorised retailers with clean studio photos
const GOOD = /farfetch|ssense|mytheresa|net-a-porter|matchesfashion|nordstrom|saksfifthavenue|neimanmarcus|bergdorf|harrods|selfridges|harveynichols|luisaviaroma|24s\.com|fwrd|revolve|cettire|italist|mrporter|endclothing|sneakersnstuff|stockx|goat\.com|flightclub|stadiumgoods|footlocker|jdsports|size\.co|kith|zalando|asos|sephora|ulta|notino|douglas|fragrancenet|lookfantastic|cartier\.com|chanel\.com|dior\.com|louisvuitton\.com|celine\.com|burberry\.com|yslbeauty|versace\.com|valentino\.com|maisonmargiela|comme-des-garcons|moncler\.com|chromehearts|stoneisland|ralphlauren|arcteryx|supremenewyork|bape\.com|crtz|nocta|carhartt-wip|carhartt\.com|nike\.com|adidas\.|converse\.com|levi\.com|zara\.com|balenciaga\.com|acnestudios|static\.zara|static\.nike|assets\.adidas|media\.(gucci|dior)|creedfragrances|creedboutique|franciskurkdjian|tomford|parfums-de-marly|bykilian|xerjoff|lelabofragrances|byredo|luckyscent|bloomingdales|libertylondon|jomashop|perfumania/i;
// the brands' own sites and image servers: the official photos, preferred over any retailer
const OFFICIAL = /cartier.com|chanel.com|dior.com|louisvuitton.com|celine.com|burberry.com|yslbeauty|versace.com|valentino.com|maisonmargiela|comme-des-garcons|moncler.com|chromehearts|stoneisland|ralphlauren|arcteryx.com|supreme(newyork)?.com|bape.com|crtz|nocta.com|carhartt|nike.com|static.nike|adidas.|converse.com|levi.com|lsco|zara.(com|net)|balenciaga.com|acnestudios|li-?ning|thenorthface|columbia.com|newbalance|uniqlo|hm.com|image.hm.com|creedfragrances|creedboutique|franciskurkdjian|tomford|parfums-de-marly|bykilian|xerjoff|lelabofragrances|byredo/i;
const MEH = /pinimg|pinterest|ebay|poshmark|vestiaire|therealreal|grailed|depop|mercari|vinted|etsy|amazon|walmart|tradesy|fashionphile|rebag/i;

const decode = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const flatText = s => String(s || '').toLowerCase().replace(/%20|[-_+/.,’'()]/g, ' ').replace(/\s+/g, ' ');
const tokens = s => flatText(s).split(' ').filter(w => w && !['the', 'and', 'of', 'x', 'with', 'in', 'ml'].includes(w));
const { LUXURY, buildCatalog } = await import('../server/catalog/build.mjs');
// exact StockX listing names given in the catalogue source
const STOCKX_NAMES = new Map(buildCatalog().products.filter(p => p.stockx).map(p => [p.id, p.stockx]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// DuckDuckGo images first: Bing's image page started answering scripted requests with unrelated pictures
// (2026-11), so Bing is only the fallback — and rank() drops any result whose text doesn't name the model.
async function search(q) {
  try { const r = await searchDDG(q); if (r.length) return r; } catch {}
  return searchBing(q);
}
async function searchDDG(q) {
  const h = await (await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(q) + '&iax=images&ia=images', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })).text();
  const vqd = (h.match(/vqd=["']?([\d-]+)/) || [])[1];
  if (!vqd) throw new Error('ddg token');
  const r = await fetch('https://duckduckgo.com/i.js?l=us-en&o=json&f=,,,,,&p=1&q=' + encodeURIComponent(q) + '&vqd=' + vqd, { headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('ddg ' + r.status);
  return ((await r.json()).results || []).filter(x => x.image && x.width >= 500 && x.height >= 500).map(x => ({ url: x.image, page: x.url || '', title: x.title || '' }));
}
async function searchBing(q) {
  const url ='https://www.bing.com/images/search?q=' + encodeURIComponent(q) + '&qft=+filterui:imagesize-large&first=1&count=60&form=IRFLTR';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('search ' + r.status);
      const html = await r.text(), out = [];
      for (const m of html.matchAll(/class="iusc"[^>]*?\sm="([^"]+)"/g)) {
        try { const j = JSON.parse(decode(m[1])); if (j.murl) out.push({ url: j.murl, page: j.purl || '', title: j.t || '' }); } catch {}
      }
      return out;
    } catch (e) { if (attempt === 2) throw e; await sleep(1500 * (attempt + 1)); }
  }
}
async function download(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', Referer: (() => { try { return new URL(url).origin + '/'; } catch { return ''; } })() }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!r.ok) throw new Error('http ' + r.status);
  const type = r.headers.get('content-type') || '';
  if (!/image\//.test(type) && !/\.(jpe?g|png|webp|avif)(\?|$)/i.test(url)) throw new Error('not an image');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 8000) throw new Error('tiny');
  return buf;
}

const near = (a, b) => a.reduce((n, v, i) => n + (v !== b[i]), 0) <= 18;

/* ---------- 1. StockX ---------- */
// images.stockx.com/images/<Base>-Product.jpg  →  360 frames at images.stockx.com/360/<Base>/Images/<Base>/Lv2/imgNN.jpg
const SX = 'https://images.stockx.com';
const SX_PRODUCT = '?fit=fill&bg=FFFFFF&w=1200&h=857&fm=jpg&q=90&trim=color';
const NEUTRAL = /^(\d{4}|og|retro|low|v\d|triple|sp|qs|nike|jordan|air|adidas|originals|womens|wmns|w|mens|gs|ps|td|unisex|product)$/;
const SX_ANGLES = ['img10', 'img19', 'img28', 'img05'];   // front, other side, back, three-quarter
// StockX names rarely say "Black / White" (they say "Panda"), so a listing of the right model is accepted either
// when its name carries the colour words, or when its photo's colours fit the catalogue colour (colourFit).
const COLLAB = /^(travis|scott|off|offwhite|union|sacai|fragment|supreme|undefeated|stussy|kaws|dior|pe|sample|friends|family|pack|custom|ambush|patta|atmos|bape|corteiz|nocta)$/;
// a catalogue line that names its StockX listing (server/catalog/brands-2026.mjs): use it directly
async function fromStockXName(base) {
  const page = 'https://stockx.com/' + base.toLowerCase();
  let lead;
  try { lead = await download(`${SX}/images/${base}-Product.jpg${SX_PRODUCT}`); }
  catch { try { lead = await download(`${SX}/images/${base}.jpg${SX_PRODUCT}`); } catch { return null; } }
  const shots = [{ buf: lead, src: page, trusted: true, stockx: true }];
  for (const a of SX_ANGLES) {
    try { shots.push({ buf: await download(`${SX}/360/${base}/Images/${base}/Lv2/${a}.jpg?fm=jpg&w=1200&q=90`), src: page, trusted: true, stockx: true }); }
    catch { break; }
  }
  return shots;
}
async function fromStockX(brand, model, colour) {
  // Bing returns only a couple of StockX images per query and varies between runs: ask three ways and pool them
  const c2 = flatText(colour).trim(), res = [];
  for (const q of [`stockx ${brand} ${model} ${c2}`, `${brand} ${model} ${c2} stockx`, `${model} stockx product`]) {
    try { res.push(...(await search(q.replace(/\s+/g, ' ').trim()))); } catch {}
    if (res.filter(c => c.url.includes('images.stockx.com/images/')).length >= 8) break;
  }
  if (process.env.PHOTO_DEBUG) console.log('stockx candidates:', [...new Set(res.filter(c => c.url.includes('images.stockx.com/images/')).map(c => c.url.split('?')[0].split('/').pop()))]);
  const own = tokens(brand + ' ' + model);
  const need = tokens(model).filter(w => !tokens(brand).includes(w));
  const col = tokens(colour).filter(w => !/^\d+$/.test(w));
  const named = [], other = [], seen = new Set();
  for (const c of res) {
    const m = c.url.match(/^https:\/\/images\.stockx\.com\/images\/([^/?]+?)(?:-Product(?:_[^./?]*)?)?\.(?:jpg|png|webp)/i);
    if (!m) continue;
    const base = decodeURIComponent(m[1]), bt = tokens(base);
    if (seen.has(base)) continue; seen.add(base);
    if (!need.every(w => bt.includes(w))) continue;                      // must be the same model
    const extra = bt.filter(w => !need.includes(w) && !col.includes(w) && !tokens(brand).includes(w) && !NEUTRAL.test(w));
    if (extra.some(w => COLLAB.test(w) && !own.includes(w))) continue;   // collabs and player editions are other products
    const cand = { base, extra: extra.length, page: c.page || `https://stockx.com/${base.toLowerCase()}` };
    const text = bt.join(' ') + ' ' + flatText(c.title);
    // the name says the colour and nothing else: take it as it is
    if ((!col.length || col.every(w => text.includes(w))) && !extra.length) named.push(cand); else if (extra.length <= 4) other.push(cand);
  }
  const grab = async base => { try { return await download(`${SX}/images/${base}-Product.jpg${SX_PRODUCT}`); } catch { return await download(`${SX}/images/${base}.jpg${SX_PRODUCT}`); } };
  let best = null, lead = null;
  if (named.length) { best = named[0]; try { lead = await grab(best.base); } catch { best = null; } }
  if (!best) {
    // look at the photos: the listing whose colours best fit the catalogue colour wins
    let top = 0.42;
    for (const c of other.slice(0, 4)) {
      try {
        const buf = await grab(c.base), a = await analyse(buf);
        const fit = colourFit(a.tone, colour) - c.extra * 0.03;
        if (fit > top) { top = fit; best = c; lead = buf; }
      } catch {}
    }
  }
  if (process.env.PHOTO_DEBUG) console.log('stockx match:', best && best.base, { need, col, named: named.length, other: other.length });
  if (!best) return null;
  const shots = [{ buf: lead, src: best.page, trusted: true, stockx: true }];
  for (const a of SX_ANGLES) {
    try { shots.push({ buf: await download(`${SX}/360/${best.base}/Images/${best.base}/Lv2/${a}.jpg?fm=jpg&w=1200&q=90`), src: best.page, trusted: true, stockx: true }); }
    catch { break; }                                                     // no 360 set for this piece
  }
  return shots;
}

/* ---------- 2. web image search ---------- */
// words that don't tell one piece from another, so they don't count when checking a result names the model
const GENERIC = new Set(['eau', 'parfum', 'toilette', 'extrait', 'perfume', 'the', 'and', 'for', 'pour', 'homme', 'femme', 'intense', 'cologne']);
function rank(cands, words, colour) {
  return cands.map((c, i) => {
    const host = (() => { try { return new URL(c.url).host + ' ' + new URL(c.page).host; } catch { return ''; } })();
    const t = flatText(c.title), all = t + ' ' + flatText(c.page) + ' ' + flatText(c.url);
    // words that are part of the product's own name (Margiela "Replica", Stone Island "Reps") don't count as red flags
    const own = new RegExp('\\b(' + words.join('|').replace(/[^a-z0-9|]/g, '') + ')\\b', 'g');
    const clean = s => words.length ? flatText(s).replace(own, ' ') : s;
    if (BLOCK.test(clean(host)) || BLOCK.test(clean(c.title))) return null;
    // the result must name most of the model ("aventus", "baccarat rouge 540"), or it is some other picture
    const key = words.filter(w => !GENERIC.has(w)), hit = key.filter(w => all.includes(w)).length;
    if (key.length && hit < (key.length <= 2 ? key.length : Math.ceil(key.length * 2 / 3))) return null;
    let s = 30 - i * 0.5;                                 // search relevance
    if (GOOD.test(host)) s += 25;
    if (OFFICIAL.test(host)) s += 15;
    if (MEH.test(host)) s -= 12;
    s += words.filter(w => t.includes(w)).length * 3;     // title mentions the model
    // the colourway decides whether it is the right piece
    const cm = !colour.length || colour.every(w => all.includes(w)) ? 2 : colour.some(w => all.includes(w)) ? 1 : 0;
    s += [-15, 8, 30][cm];
    if (/\b(fake|dupe|replica|vs|real vs|how to spot|legit check|review|unboxing|on feet|worn|lot|bundle|set of)\b/.test(clean(c.title))) s -= 40;
    return { ...c, s, cm };
  }).filter(Boolean).sort((a, b) => b.s - a.s);
}
// Retailer CDNs that name a listing's gallery predictably: one matching photo gives the whole set of the same item.
function siblings(url) {
  const u = url.split('?')[0];
  let m;
  if ((m = u.match(/^(https:\/\/img\.ssensemedia\.com\/images\/)(?:[^/]+\/)?([0-9A-Z]+)_\d+(\/.+)$/))) return [1, 2, 3, 4, 5].map(n => `${m[1]}b_white,g_center,f_auto,q_auto:best/${m[2]}_${n}${m[3]}`);
  if ((m = u.match(/^(https:\/\/www\.(?:mrporter|net-a-porter)\.com\/variants\/images\/\d+\/)[a-z0-9]{2}(\/.+)$/))) return ['in', 'fr', 'bk', 'cu', 'e1', 'ou'].map(v => m[1] + v + '/w1500_q80.jpg');
  if ((m = u.match(/^(https:\/\/(?:img|www)\.mytheresa\.com\/.+\/)(P\d+)(?:_[a-z]\d)?\.jpg$/))) return ['', '_b1', '_b2', '_d1', '_d2', '_d3'].map(s => `${m[1]}${m[2]}${s}.jpg`);
  if ((m = u.match(/^(https:\/\/media\.endclothing\.com\/.+_)(\d)\.jpg$/))) return [1, 2, 3, 4, 5, 6].map(n => `${m[1]}${n}.jpg`);
  return null;
}
async function fromSearch(brand, model, colour, luxury) {
  const words = tokens(model).filter(w => w.length > 2);
  const col = tokens(colour).filter(w => w.length > 2 && !/^\d+$/.test(w) && w !== 'eau');
  const q = `${brand} ${model} ${colour}`.trim();
  let cands = rank(await search(q), words, col);
  // a second search aimed at retailers whose galleries we can read in full
  try { cands = cands.concat(rank(await search(q + (luxury ? ' mytheresa net-a-porter ssense' : ' ssense end clothing')), words, col)); } catch {}
  const seen = new Set(); cands = cands.filter(c => !seen.has(c.url) && seen.add(c.url)).sort((a, b) => b.s - a.s);
  const top = cands.length ? cands[0].s : 0;
  const pool = cands.filter(c => (LOOSE ? c.cm >= 0 : c.cm === 2)).filter(c => c.s >= top - (LOOSE ? 45 : 30));
  // 1) a full gallery from one retailer listing: every photo is the same item
  for (const c of pool.filter(c => siblings(c.url)).slice(0, 3)) {
    const shots = [];
    for (const s of siblings(c.url)) { if (shots.length >= MAX) break; try { shots.push({ buf: await download(s), src: c.page || c.url, listing: true, trusted: true }); } catch {} }
    if (shots.length >= 3) return { shots, listing: true };
  }
  // 2) otherwise separate studio photos that carry the whole model name and colourway
  const shots = [];
  for (const c of pool.slice(0, 14)) {
    if (shots.length >= MAX) break;
    try { shots.push({ buf: await download(c.url), src: c.page || c.url, search: true }); } catch {}
  }
  return { shots, listing: false };
}

// extra search for a shoe photographed from the side (the StockX-style main photo)
async function sideViews(brand, model, colour) {
  const words = tokens(model).filter(w => w.length > 2), col = tokens(colour).filter(w => w.length > 2 && !/^\d+$/.test(w));
  const base = `${brand} ${model} ${flatText(colour)}`.replace(/\s+/g, ' ').trim();
  let out = [];
  for (const q of [base + ' side view', base + ' lateral']) {
    try { out = out.concat(rank(await search(q), words, col).filter(c => c.cm === 2)); } catch {}
  }
  const seen = new Set(); return out.filter(c => !seen.has(c.url) && seen.add(c.url)).sort((a, b) => b.s - a.s);
}

// tell a running server to rebuild its catalogue cache, so the shop never points at photos we just replaced
async function reload() {
  try {
    const token = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
    await fetch(`http://localhost:${process.env.PORT || 8787}/api/admin/reload`, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(3000) });
  } catch {}
}

/* ---------- run ---------- */
// an --ids list may name hidden products too (retrying ones hidden for lack of a correct photo)
const where = [IDS_FILE ? '1=1' : 'active=1'], wargs = [];
if (ONLY_ID) { where.push('id=?'); wargs.push(ONLY_ID); }
else if (IDS_FILE) { const list = JSON.parse(readFileSync(IDS_FILE, 'utf8')); const ids = Array.isArray(list) ? list : list.ids; where.push('id IN (' + ids.map(() => '?').join(',') + ')'); wargs.push(...ids); }
else if (opt('thin')) where.push(dbm.DRIVER === 'mysql' ? "(photos IS NULL OR JSON_LENGTH(photos) < 3)" : "(photos IS NULL OR json_array_length(photos) < 3)");
else if (!ALL) where.push("(photos IS NULL OR photos='' OR photos='[]')");
if (ONLY_BRAND) { where.push('brand_slug=?'); wargs.push(ONLY_BRAND); }
if (ONLY_CAT) { where.push('cat=?'); wargs.push(ONLY_CAT); }
if (SKIP_CAT) { where.push('cat<>?'); wargs.push(SKIP_CAT); }
const brands = new Map((await db.all('SELECT slug, name FROM brands')).map(b => [b.slug, b.name]));
const todo = (await db.all(`SELECT id, brand_slug, name_en, type, cat, photos FROM products WHERE ${where.join(' AND ')} ORDER BY brand_slug, sort`, wargs)).slice(0, LIMIT);
console.log(`Finding photos for ${todo.length} products…`);

let kept = 0, done = 0, ok = 0, stockx = 0, images = 0; const failed = [], thin = [];
async function one(p) {
  const brand = (brands.get(p.brand_slug) || p.brand_slug).replace(/[’]/g, "'");
  const [model, colour = ''] = p.name_en.split(/\s+—\s+/);
  const footwear = p.cat === 'footwear';
  let prev = 0; try { prev = JSON.parse(p.photos || '[]').length; } catch {}
  try {
    // StockX covers sneakers, streetwear, bags and accessories; fragrance and beauty go straight to search
    const hint = STOCKX_NAMES.get(p.id);
    let raw = hint ? await fromStockXName(hint) : null;
    if (!raw && p.cat !== 'fragrance') raw = await fromStockX(brand, model.replace(/,/g, ''), colour);
    let viaStockX = !!(raw && raw.length);
    if (!viaStockX) raw = [];
    if (raw.length < 3) {
      const found = await fromSearch(brand, model.replace(/,/g, ''), colour, LUXURY.has(p.brand_slug));
      // keep the StockX shot as the clean main photo; a complete retailer listing fills the other angles
      raw = raw.concat(found.shots);
      if (!raw.length || (!viaStockX && found.listing)) viaStockX = false;
    }

    // style every photo the same way (white, trimmed, one size, centred) and pick the main photo:
    // shoes → a single shoe in side profile, toe pointing right (mirrored if the best side shot faces left)
    let looked = [];
    for (const r of raw) { try { looked.push({ ...(await analyse(r.buf)), src: r.src, from: r }); } catch {} }
    // --verify-colour: every photo must actually be the product's colour (checked on the photo, not the title)
    if (VERIFY && ['apparel', 'footwear', 'bags'].includes(p.cat)) {
      looked = looked.filter(a => (a.from && a.from.stockx && hint) || colourFit(a.tone, colour) >= 0.3);
      if (!looked.length) { failed.push(p.id + ' (no photo in the right colour)'); return; }
    }
    const usable = a => a.studio && !a.cropped && (!a.from.search || a.studio);
    let lead = null;
    if (footwear) {
      const rankSide = a => (a.from && a.from.stockx ? 100 : 0) + colourFit(a.tone, colour) * 30 + (a.facesRight === true ? 10 : a.facesRight === null ? 4 : 0) + Math.abs(a.lean || 0) * 20;
      const pickSide = list => list.filter(a => a.side).sort((x, y) => rankSide(y) - rankSide(x))[0];
      lead = pickSide(looked);
      if (!lead) {
        // nothing in profile yet: search for side views of this exact shoe
        for (const c of (await sideViews(brand, model.replace(/,/g, ''), colour)).slice(0, 10)) {
          try { const a = await analyse(await download(c.url)); a.src = c.page || c.url; a.from = {}; if (a.side) { looked.push(a); if (a.facesRight !== false) { lead = a; break; } } } catch {}
        }
        lead = lead || pickSide(looked);
      }
    }
    // not a shoe (or no side view anywhere): the clean shot whose colours fit the catalogue colour best
    const byFit = list => list.slice().sort((x, y) => colourFit(y.tone, colour) - colourFit(x.tone, colour))[0];
    lead = lead || byFit(looked.filter(a => usable(a))) || byFit(looked.filter(a => a.studio)) || looked[0];
    if (!lead) { failed.push(p.id); return; }
    const shots = [];
    // trusted sets (StockX 360°, one retailer listing) are kept as they are; loose photos must not repeat an
    // angle we already have and must be the same colourway as the main photo
    const add = async (a, flip, relax) => {
      const trusted = a.from && a.from.trusted;
      if (shots.length && !trusted && toneGap(a.tone, lead.tone) > (relax ? 0.5 : 0.3)) return;
      const r = await render(a, { footwear, flip });
      if (!trusted && shots.some(s => near(s.hash, r.hash))) return;
      shots.push({ ...r, src: a.src });
    };
    await add(lead, footwear && lead.facesRight === false);
    for (const a of looked) {
      if (shots.length >= MAX) break;
      if (a === lead) continue;
      if (a.from.search && !a.studio) continue;                            // loose search photos: clean shots only
      if (footwear && (!a.studio || a.cropped || (a.pair && !(a.from && a.from.trusted)))) continue;   // shoes: no lifestyle shots, close-ups or loose pairs
      try { await add(a, false); } catch {}
    }
    // fewer than 3 clean photos: look for more studio angles of the same model and colourway
    if (shots.length < 3) {
      const words = tokens(model).filter(w => w.length > 2), col = tokens(colour).filter(w => w.length > 2 && !/^\d+$/.test(w) && w !== 'eau');
      const base = `${brand} ${model.replace(/,/g, '')} ${flatText(colour)}`.replace(/\s+/g, ' ').trim();
      let more = [];
      for (const q of footwear ? [base, base + ' side view'] : [base + ' product', base]) { try { more = more.concat(rank(await search(q), words, col).filter(c => c.cm === 2)); } catch {} }
      const seen = new Set(looked.map(a => a.src));
      let tries = 0;
      for (const c of more) {
        if (shots.length >= MAX || tries >= 14) break;
        if (seen.has(c.url)) continue; seen.add(c.url); tries++;
        try {
          const a = await analyse(await download(c.url)); a.src = c.page || c.url;
          if (!a.studio || a.cropped || (footwear && a.pair)) continue;
          await add(a, false);
        } catch {}
      }
    }
    // still fewer than 3: a looser pass — on-model shots for clothing and bags, pairs for shoes,
    // a little more colour tolerance, and search results that name only part of the colour
    if (shots.length < 3) {
      const words = tokens(model).filter(w => w.length > 2), col = tokens(colour).filter(w => w.length > 2 && !/^\d+$/.test(w) && w !== 'eau');
      const base = `${brand} ${model.replace(/,/g, '')} ${flatText(colour)}`.replace(/\s+/g, ' ').trim();
      let more = [];
      for (const q of [base, `${brand} ${model.replace(/,/g, '')}`]) { try { more = more.concat(rank(await search(q), words, col).filter(c => c.cm >= 1 || !col.length)); } catch {} }
      const seen = new Set(looked.map(a => a.src)); let tries = 0;
      for (const c of more) {
        if (shots.length >= 3 || tries >= 16) break;
        if (seen.has(c.url)) continue; seen.add(c.url); tries++;
        try {
          const a = await analyse(await download(c.url)); a.src = c.page || c.url;
          if (a.studio && a.cropped) continue;                              // cut-off close-ups never
          if (footwear && !a.studio) continue;                              // shoes stay on white
          await add(a, false, true);
        } catch {}
      }
    }
    // never replace a bigger gallery with a smaller one
    if (!REPLACE && shots.length < (prev || 0)) { kept++; return; }
    const dir = join(UPLOADS, p.id);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const e of ['.jpg', '.png', '.webp', '.avif']) { const f = join(UPLOADS, p.id + e); if (existsSync(f)) unlinkSync(f); }
    const v = Date.now().toString(36);
    const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${p.id}/${i + 1}.webp?v=${v}`; });
    await db.run('UPDATE products SET photo=?, photos=?, photo_src=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [urls[0], JSON.stringify(urls), shots[0].src, p.id]);
    ok++; images += urls.length; if (viaStockX) stockx++;
    if (urls.length < 3) thin.push(p.id + ' (' + urls.length + ')');
  } catch (e) { failed.push(p.id + ' (' + e.message + ')'); }
  finally { done++; if (done % 20 === 0) reload(); if (done % 20 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} · ${ok} saved · ${images} photos · ${stockx} from StockX`); }
}
const queue = [...todo];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) { await one(queue.shift()); await sleep(200); } }));
writeFileSync(join(ROOT, 'data', 'photo-report.json'), JSON.stringify({ at: new Date().toISOString(), saved: ok, photos: images, from_stockx: stockx, failed, fewer_than_3: thin }, null, 2));
console.log(`Done: ${ok} products, ${images} photos (${stockx} from StockX). ${failed.length} without a usable result, ${thin.length} with fewer than 3 photos — see data/photo-report.json.`);
await reload();
process.exit(0);
