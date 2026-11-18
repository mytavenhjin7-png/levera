// LEVERA — product photos straight from a house's own online shop (Shopify stores publish their catalogue as JSON).
//   node tools/official-shop-photos.mjs                 → every product of the houses below that has no photos yet
//   node tools/official-shop-photos.mjs --all           → redo them
// The photos are the house's own packshots, styled like every other photo (white, centred, 800×1000).
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = join(ROOT, 'uploads', 'products');
const dbm = await import('../server/db.mjs');
await dbm.ready;
const ALL = process.argv.includes('--all');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SHOPS = { creed: 'https://www.creedboutique.com', 'parfums-de-marly': 'https://parfums-de-marly.com', xerjoff: 'https://www.xerjoff.com', 'tom-ford-beauty': 'https://www.tomfordbeauty.com' };
const flat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const GENERIC = new Set(['eau', 'de', 'parfum', 'toilette', 'extrait', 'perfume', 'the', 'and', 'ml']);
const key = s => flat(s).split(' ').filter(w => w && !GENERIC.has(w));

async function catalogue(base) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`${base}/products.json?limit=250&page=${page}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) break;
    const list = (await r.json()).products || [];
    out.push(...list); if (list.length < 250) break;
  }
  return out;
}
// the shop listing whose title carries every distinctive word of the model and nothing much else
function match(list, model) {
  const want = key(model);
  const scored = list.map(p => {
    const t = key(p.title);
    if (!want.every(w => t.includes(w))) return null;
    if (/\b(sample|discovery|set|coffret|gift|hand cream|body|shower|candle|deodorant|hair|travel|refill|miniature|lotion|soap|oil)\b/i.test(p.title + ' ' + (p.product_type || ''))) return null;
    return { p, extra: t.filter(w => !want.includes(w)).length };
  }).filter(Boolean).sort((a, b) => a.extra - b.extra);
  return scored.length && scored[0].extra <= 2 ? scored[0].p : null;
}
// houses without a Shopify store of their own: authorised niche perfumeries on Shopify that carry them, searched
// per piece and kept only when the listing's vendor is the house itself
const RETAILERS = { 'maison-francis-kurkdjian': ['https://www.twistedlily.com'], byredo: ['https://www.twistedlily.com'], xerjoff: ['https://www.twistedlily.com'],
  'kilian-paris': ['https://www.twistedlily.com', 'https://osswaldnyc.com'], 'le-labo': ['https://www.twistedlily.com', 'https://osswaldnyc.com'] };
const VENDOR = { 'maison-francis-kurkdjian': /kurkdjian/i, byredo: /byredo/i, xerjoff: /xerjoff/i, 'kilian-paris': /kilian/i, 'le-labo': /le labo/i };
async function retailerListings(brand, model) {
  const out = [];
  for (const base of RETAILERS[brand] || []) {
    try {
      const q = key(model).join(' ');
      const r = await fetch(`${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      const found = ((await r.json()).resources?.results?.products || []).filter(p => VENDOR[brand].test(p.vendor || ''));
      for (const f of found) {
        const j = await (await fetch(base + f.url.split('?')[0] + '.json', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })).json();
        out.push({ ...j.product, base });
      }
    } catch {}
  }
  return out;
}
async function download(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('http ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

const BRANDS = [...new Set([...Object.keys(SHOPS), ...Object.keys(RETAILERS)])];
const rows = await dbm.db.all(`SELECT id, brand_slug, line, photos FROM products WHERE brand_slug IN (${BRANDS.map(() => '?').join(',')})`, BRANDS);
let ok = 0; const missed = [];
for (const brand of BRANDS) {
  const todo = rows.filter(p => p.brand_slug === brand && (ALL || JSON.parse(p.photos || '[]').length < 3));
  if (!todo.length) continue;
  let list = [];
  if (SHOPS[brand]) { try { list = (await catalogue(SHOPS[brand])).map(p => ({ ...p, base: SHOPS[brand] })); } catch (e) { console.log(brand, 'shop unreachable:', e.message); } }
  for (const p of todo) {
    let hit = match(list, p.line);
    if (!hit && RETAILERS[brand]) hit = match(await retailerListings(brand, p.line), p.line);
    if (!hit) { missed.push(p.id); continue; }
    const shots = [];
    for (const img of (hit.images || []).slice(0, 8)) {
      if (shots.length >= 5) break;
      try {
        const a = await analyse(await download(img.src.split('?')[0] + '?width=1200'));
        if (a.cropped && a.studio) continue;          // cut-off close-ups
        shots.push(await render(a));
      } catch {}
    }
    if (!shots.length) { missed.push(p.id); continue; }
    const dir = join(UPLOADS, p.id);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const v = Date.now().toString(36);
    const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${p.id}/${i + 1}.webp?v=${v}`; });
    await dbm.db.run('UPDATE products SET photo=?, photos=?, photo_src=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [urls[0], JSON.stringify(urls), hit.base + '/products/' + hit.handle, p.id]);
    ok++; console.log(p.id, '←', hit.title, '(' + urls.length + ')');
  }
}
try {
  const token = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
  await fetch('http://localhost:8787/api/admin/reload', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
} catch {}
console.log(`\n${ok} products from the houses' own shops.` + (missed.length ? ' Not found: ' + missed.join(', ') : ''));
process.exit(0);
