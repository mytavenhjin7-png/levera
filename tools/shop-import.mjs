// LEVERA — add sneakers from a retailer's Shopify listing with that listing's own photos (5+ real angles of one
// colourway), styled white, centred, toe to the right.
//   node tools/shop-import.mjs <listings.json> <brand-slug>     (server running)
// listings.json: [{ base, title, handle, imgs: [urls] }], title like "ASICS GEL-1130 - Cream / Cocoa Powder".
// Collaborations and models without a Dewu ¥ below are skipped.
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = join(ROOT, 'uploads', 'products');
const API = process.env.API || 'http://localhost:8787';
const TOKEN = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const [file, brand] = process.argv.slice(2);
// model (lower case, as in the listing) → display name and Dewu ¥ estimate
const MODELS = {
  'gel-1130': ['Gel-1130', 599], 'gel-kayano 14': ['Gel-Kayano 14', 899], 'gel-nyc': ['Gel-NYC', 799], 'gel-nyc 2.0': ['Gel-NYC 2.0', 899],
  'gt-2160': ['GT-2160', 749], 'gel-cumulus 16': ['Gel-Cumulus 16', 799], 'skyhand og': ['Skyhand OG', 599], 'jog 100s': ['Jog 100S', 549],
  'gel-stratus mc': ['Gel-Stratus MC', 599], 'gel kayano 12.1': ['Gel-Kayano 12.1', 899], 'gel-filimy': ['Gel-Filimy', 599], 'hypersync': ['Hypersync', 649],
  'gel-sd lyte': ['Gel-SD Lyte', 799], 'gel-k1011': ['Gel-K1011', 749], 'gel-kayano 20': ['Gel-Kayano 20', 899], 'gel-1130 mule': ['Gel-1130 Mule', 599],
  'mexico 66': ['Mexico 66', 699], 'mexico 66 sd': ['Mexico 66 SD', 849], 'mexico 66 sabot': ['Mexico 66 Sabot', 749], 'tokuten': ['Tokuten', 749], 'serrano': ['Serrano', 549]
};
const key = s => s.toLowerCase().replace(/®|™/g, '').replace(/gel kayano 14/, 'gel-kayano 14').replace(/gel kayano 12/, 'gel kayano 12').replace(/\s+/g, ' ').trim();
function parse(title) {
  if (/ x /i.test(title)) return null;                                     // collaborations: not everyday stock
  const m = title.replace(/^(asics|onitsuka tiger)\s+/i, '').match(/^(.+?)\s+-\s+(.+)$/);
  if (!m) return null;
  const model = MODELS[key(m[1])]; if (!model) return null;
  return { line: model[0], cny: model[1], colour: m[2].replace(/\s*\/\s*/g, ' / ').trim() };
}
const call = async (path, body, method = 'POST') => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(path + ': ' + (j.error || r.status)); return j;
};
const dbm = await import('../server/db.mjs'); await dbm.ready;
const cat = await (await fetch(API + '/api/catalog')).json();
const have = new Set(cat.products.filter(p => p.b === brand).map(p => p.en.toLowerCase()));
let ok = 0; const skipped = [];
for (const l of JSON.parse(readFileSync(file, 'utf8'))) {
  const x = l.line ? l : parse(l.title);   // a listing may name its own line / colour / cny / type
  if (!x || l.imgs.length < 4) { skipped.push(l.title); continue; }
  if (have.has((x.line + ' — ' + x.colour).toLowerCase())) continue;
  const shots = [];
  for (const [i, u] of l.imgs.entries()) {
    if (shots.length >= 5) break;
    try {
      const r = await fetch(u.split('?')[0] + '?width=1400', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) }); if (!r.ok) continue;
      const a = await analyse(Buffer.from(await r.arrayBuffer()));
      const shoe = !x.type || x.type === 'sneaker';
      shots.push(await render(a, { footwear: shoe && !shots.length, flip: shoe && !shots.length && a.facesRight === false }));
    } catch {}
  }
  if (shots.length < 4) { skipped.push(l.title + ' (photos)'); continue; }
  const p = await call('/api/admin/products', { brand_slug: brand, type: x.type || 'sneaker', model: x.line, colour: x.colour, colour_mn: x.colour_mn || x.colour, cny: x.cny, sizes: [] });
  const dir = join(UPLOADS, p.id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const v = Date.now().toString(36);
  const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${p.id}/${i + 1}.webp?v=${v}`; });
  await dbm.db.run("UPDATE products SET photo=?, photos=?, photo_src=?, price_source='estimate' WHERE id=?", [urls[0], JSON.stringify(urls), l.base + '/products/' + l.handle, p.id]);
  ok++; console.log('+', p.id, '₮' + p.price_mnt.toLocaleString(), urls.length);
  await new Promise(r => setTimeout(r, 1500));
}
await fetch(API + '/api/admin/reload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN } }).catch(() => {});
console.log(`\n${ok} added.` + (skipped.length ? ' Skipped: ' + skipped.join(' | ') : ''));
process.exit(0);
