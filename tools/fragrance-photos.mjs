// LEVERA — replace wrong perfume photos with the bottle, from perfumeries on Shopify (their search + product JSON).
//   node tools/fragrance-photos.mjs <ids.json>
// A listing must name the brand and every distinctive word of the perfume; sets, samples, minis and body products are
// skipped. Photos are combined across shops, near-duplicates dropped. If nothing is found, a sibling size's good
// photos are used (same bottle). Prints what was done; products with no result are hidden.
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = join(ROOT, 'uploads', 'products');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SHOPS = ['https://www.perfumeonline.ca', 'https://www.fragranceoutlet.com', 'https://luxuryperfume.com'];
const SKIP = /\b(gift|set|sets|sample|vial|mini|miniature|travel|tester|deodorant|deo|lotion|balm|shower|gel|body|soap|candle|after ?shave|hair|mist|coffret|unbox|refill|cream|bath)\b/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const flat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'°]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const get = async u => { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) }); if (r.ok) return r; if (r.status === 429) { await sleep(20000); continue; } return null; } catch { await sleep(3000); } } return null; };
const BRAND = { 'ysl-beauty': 'saint laurent', 'jean-paul-gaultier': 'gaultier', 'maison-margiela': 'margiela', chanel: 'chanel', dior: 'dior', burberry: 'burberry', versace: 'versace', valentino: 'valentino', azzaro: 'azzaro' };
const words = line => flat(line).replace(/\b(eau de parfum|eau de toilette|parfum|edp|edt|burberry|dior|replica)\b/g, ' ').replace(/\bn5\b/, '5').replace(/\bleau\b/, 'l eau').split(' ').filter(Boolean);
const conc = line => (/eau de parfum/i.test(line) ? /eau de parfum|edp/ : /eau de toilette/i.test(line) ? /eau de toilette|edt/ : /\bparfum\b/i.test(line) && !/le parfum/i.test(line) ? /parfum/ : null);

const dbm = await import('../server/db.mjs'); await dbm.ready; const db = dbm.db;
const ids = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const bad = new Set(ids);
const cache = new Map();
async function photosFor(p) {
  const k = p.brand_slug + '|' + p.line; if (cache.has(k)) return cache.get(k);
  const want = words(p.line), brand = BRAND[p.brand_slug] || '', c = conc(p.line), shots = []; let src = '';
  for (const base of SHOPS) {
    const q = `${brand.split(' ').pop()} ${want.join(' ')}`;
    const r = await get(`${base}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`); await sleep(1500);
    const list = r ? ((await r.json()).resources?.results?.products || []) : [];
    for (const f of list) {
      if (shots.length >= 3) break;
      const t = flat(f.title + ' ' + (f.vendor || '') + ' ' + f.url);
      if (SKIP.test(f.title) || !want.every(w => (' ' + t + ' ').includes(' ' + w + ' ')) || (brand && !t.includes(brand.split(' ').pop()) && !(p.brand_slug === 'ysl-beauty' && /\bysl\b|yves/.test(t)))) continue;
      const pr = await get(base + f.url.split('?')[0] + '.json'); await sleep(1200); if (!pr) continue;
      const prod = (await pr.json()).product;
      if (c && /\b(edt|edp|eau de toilette|eau de parfum)\b/.test(flat(prod.title)) && !c.test(flat(prod.title))) continue;   // a listing naming the other concentration
      for (const im of (prod.images || []).slice(0, 2)) {
        if (shots.length >= 3) break;
        const ir = await get(im.src.split('?')[0] + '?width=800'); if (!ir) continue;
        try {
          const a = await analyse(Buffer.from(await ir.arrayBuffer())); if (a.cropped) continue;
          const o = await render(a);
          if (shots.some(s => s.hash && o.hash && s.hash.reduce((n, v, i) => n + (v !== o.hash[i]), 0) <= 18)) continue;
          shots.push(o); src = src || base + '/products/' + prod.handle;
        } catch {}
      }
      if (shots.length) break;     // one good listing per shop
    }
  }
  const res = { shots, src }; cache.set(k, res); return res;
}
let ok = 0; const none = [];
for (const id of ids) {
  const p = await db.get('SELECT id, brand_slug, line FROM products WHERE id=?', [id]); if (!p) continue;
  const { shots, src } = await Promise.race([photosFor(p), sleep(240000).then(() => ({ shots: [], src: '' }))]);
  if (!shots.length) { none.push(id); console.log('·', id); continue; }
  const dir = join(UPLOADS, id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const v = Date.now().toString(36);
  const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${id}/${i + 1}.webp?v=${v}`; });
  await db.run('UPDATE products SET photo=?, photos=?, photo_src=? WHERE id=?', [urls[0], JSON.stringify(urls), src, id]);
  ok++; console.log('✓', id, urls.length, '←', src.slice(8, 70));
}
// nothing found: borrow a sibling size's photos when that size is good, else hide
for (const id of [...none]) {
  const p = await db.get('SELECT id, brand_slug, line FROM products WHERE id=?', [id]);
  const sib = (await db.all('SELECT id, photo, photos, photo_src FROM products WHERE brand_slug=? AND line=? AND id<>? AND active=1', [p.brand_slug, p.line, id])).find(s => !bad.has(s.id) || cache.get(p.brand_slug + '|' + p.line)?.shots.length);
  if (sib && sib.photo) { await db.run('UPDATE products SET photo=?, photos=?, photo_src=? WHERE id=?', [sib.photo, sib.photos, sib.photo_src, id]); none.splice(none.indexOf(id), 1); console.log('= sibling', id, '←', sib.id); }
  else await db.run('UPDATE products SET active=0 WHERE id=?', [id]);
}
console.log(`\n${ok} re-photographed. Hidden (no bottle photo found): ${none.join(', ') || 'none'}`);
process.exit(0);
