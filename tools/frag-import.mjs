// LEVERA — import a perfume house's whole line from its official Shopify store, with the store's own photos.
// Only lines with 5 distinct, matching photos of the everyday bottle (30–200 ml) qualify; travel sprays, sets,
// samples and the big 240 ml+ flacons are left out. Prices: official US$ → ¥ (× 478/120) → the perfume rate in admin.
//   node tools/frag-import.mjs stage  <store> <out-dir>     download + style photos into <out-dir>/<line>/ for review
//   node tools/frag-import.mjs commit <store> <out-dir> [skip-line,...]   add the reviewed lines to the shop (server running);
//     <out-dir>/picks.json { "line-slug": [3,1,4,6,7] } chooses which candidate photos to use (default the first 5)
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API || 'http://localhost:8787';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const STORES = {
  'tom-ford-beauty': {
    base: 'https://tomfordbeauty.com', brand: 'tom-ford-beauty',
    keep: p => p.product_type === 'Fragrance' && !/set|test|deodorant|body|candle|gift|travel|discovery|collection|mist|oil|lotion|wash|shower|soap|refill|atomi[sz]er|duo|trio|coffret|mini/i.test(p.title),
    line: t => t.replace(/\s+/g, ' ').trim()
  },
  'parfums-de-marly': {
    base: 'https://parfums-de-marly.com', brand: 'parfums-de-marly',
    keep: p => /Masculine Fragrance|Feminine Fragrance/.test(p.product_type) && !/sample|set|travel|discovery|body|mini/i.test(p.title + ' ' + p.handle),
    line: t => t.replace(/\s+/g, ' ').trim()
  },
  creed: {
    base: 'https://creedfragrances.co.uk', priceFrom: 'https://creedboutique.com', brand: 'creed',
    keep: p => p.product_type === 'Fragrance' && !/sample|set|travel|discovery|gift/i.test(p.title),
    line: t => t.replace(/\s+/g, ' ').trim()
  },
  kayali: { base: 'https://kayali.com', brand: 'kayali', keep: p => p.product_type === 'Fragrances' && !SKIP.test(p.title), line: t => tc(t) },
  'ellis-brooklyn': { base: 'https://ellisbrooklyn.com', brand: 'ellis-brooklyn', keep: p => /eau de parfum/i.test(p.product_type) && !SKIP.test(p.title), line: t => tc(t.replace(/\s*eau de parfum/i, '')) },
  'juliette-has-a-gun': { base: 'https://juliettehasagun.com', brand: 'juliette-has-a-gun', keep: p => /^eau de parfum$/i.test(p.product_type) && !SKIP.test(p.title), line: t => tc(t) },
  'vilhelm-parfumerie': { base: 'https://vilhelmparfumerie.com', brand: 'vilhelm-parfumerie', keep: p => p.product_type === 'Eau de Parfum' && !SKIP.test(p.title), line: t => tc(t) },
  'imaginary-authors': { base: 'https://imaginaryauthors.com', brand: 'imaginary-authors', keep: p => p.product_type === 'Perfume' && !SKIP.test(p.title), line: t => tc(t.replace(/\s*-\s*fragrance$/i, '')) },
  initio: { base: 'https://initioparfums.com', brand: 'initio', keep: p => !SKIP.test(p.title) && p.variants.some(v => +v.price >= 150), line: t => tc(t) },
  'henry-rose': { base: 'https://henryrose.com', brand: 'henry-rose', keep: p => /eau de parfum/i.test(p.product_type) && !SKIP.test(p.title), line: t => tc(t) }
};
const SKIP = /set|kit|gift|trio|duo|discovery|sample|mini|travel|body|mist|oil|lotion|candle|coffret|refill|7[.,]5 ?ml|bundle/i;
// SHOUTED shop titles (FLASHPOINT) to Title Case; mixed-case titles stay as written
const tc = t => { t = t.replace(/\s+/g, ' ').trim(); return t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s'’(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : t; };
const ml = s => { const m = /([\d.]+)\s*ml/i.exec(s); if (m) return Math.round(+m[1]); const o = /([\d.]+)\s*fl\.?\s*oz/i.exec(s); return o ? ({ '1.0': 30, '1': 30, '1.7': 50, '2.5': 75, '3.4': 100, '4.2': 125, '6.8': 200 })[o[1]] || Math.round(+o[1] * 29.57) : 0; };
const everyday = n => n >= 30 && n <= 200;
// SHOP_CACHE=<dir> reads <dir>/<host>.json saved earlier instead of asking the store again (they rate-limit)
const json = async u => { const c = process.env.SHOP_CACHE && join(process.env.SHOP_CACHE, new URL(u).host + '.json'); if (c && existsSync(c)) return JSON.parse(readFileSync(c, 'utf8')); return (await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })).json(); };
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ham = (a, b) => a.reduce((s, v, i) => s + (v !== b[i]), 0);

const [mode, storeKey, outDir, skipArg] = process.argv.slice(2);
const S = STORES[storeKey]; if (!S || !outDir) { console.log('usage: stage|commit <' + Object.keys(STORES).join('|') + '> <out-dir>'); process.exit(1); }
const products = (await json(S.base + '/products.json?limit=250')).products.filter(S.keep);
const usd = new Map();
if (S.priceFrom) for (const p of (await json(S.priceFrom + '/products.json?limit=250')).products) for (const v of p.variants) usd.set(S.line(p.title).toLowerCase() + '|' + ml(v.title), +v.price);

if (mode === 'stage') {
  mkdirSync(outDir, { recursive: true }); const report = [];
  for (const p of products) {
    const line = S.line(p.title), sizes = p.variants.map(v => ({ id: v.id, ml: ml(v.title), usd: usd.get(line.toLowerCase() + '|' + ml(v.title)) || +v.price })).filter(v => everyday(v.ml));
    if (!sizes.length) { report.push([line, 0, 'no everyday size']); continue; }
    const ok = new Set(sizes.map(v => v.id));
    // photos of the everyday sizes (or not tied to one size), biggest everyday size first
    const order = [...sizes].sort((a, b) => b.ml - a.ml).map(v => v.id);
    const imgs = p.images.filter(i => !(i.variant_ids || []).length || i.variant_ids.some(v => ok.has(v)));
    const rank = i => { const v = (i.variant_ids || [])[0]; const k = order.indexOf(v); return k < 0 ? 50 : k * 10; };
    // a size's own photos come as a group: the tied packshot, then the untied shots that follow it
    const groups = []; let g = null;
    for (const i of p.images) { if ((i.variant_ids || []).length) { g = { r: rank(i), list: [] }; groups.push(g); } else if (!g) { g = { r: 50, list: [] }; groups.push(g); } if (imgs.includes(i)) g.list.push(i); }
    const queue = groups.filter(x => x.r < 50 || !p.images.some(i => (i.variant_ids || []).length)).sort((a, b) => a.r - b.r).flatMap(x => x.list);
    const shots = [];
    for (const i of queue) {
      if (shots.length >= 10) break;
      try {
        const r = await fetch(i.src.split('?')[0] + '?width=1600', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }); if (!r.ok) continue;
        const s = await render(await analyse(Buffer.from(await r.arrayBuffer())));
        if (shots.some(x => ham(x.hash, s.hash) < 18)) continue;          // the same picture for another size
        shots.push(s);
      } catch {}
    }
    const dir = join(outDir, slug(line)); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    shots.forEach((s, k) => writeFileSync(join(dir, `${k + 1}.webp`), s.out));
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ line, handle: p.handle, sizes }));
    report.push([line, shots.length, sizes.map(v => v.ml + 'ml $' + v.usd).join(' ')]);
    console.log(shots.length, line, '|', sizes.map(v => v.ml + 'ml $' + v.usd).join(' '));
  }
  console.log(`\n${report.filter(r => r[1] >= 5).length} of ${report.length} lines have 5 photos.`);
  process.exit(0);
}

if (mode === 'commit') {
  const TOKEN = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
  const call = async (path, opts = {}) => { const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN } }); const j = await r.json(); if (!r.ok) throw new Error(path + ' ' + JSON.stringify(j)); return j; };
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  const skip = new Set((skipArg || '').split(',').filter(Boolean));
  const picks = existsSync(join(outDir, 'picks.json')) ? JSON.parse(readFileSync(join(outDir, 'picks.json'), 'utf8')) : {};
  let n = 0;
  for (const d of readdirSync(outDir)) {
    const dir = join(outDir, d); if (!existsSync(join(dir, 'meta.json')) || skip.has(d)) continue;
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')), files = readdirSync(dir).filter(f => f.endsWith('.webp')).sort();
    const pick = picks[d] || [1, 2, 3, 4, 5];   // reviewed choice of 5 among the candidates
    if (pick.length < 5 || pick.some(k => !files.includes(k + '.webp'))) continue;
    for (const v of meta.sizes.filter(v => [30, 50, 75, 100, 125, 200].includes(v.ml))) {
      const name = meta.line + ', ' + v.ml + ' ml';
      if (await dbm.db.get('SELECT 1 FROM products WHERE brand_slug=? AND name_en=?', [S.brand, name])) continue;
      const cny = Math.round(v.usd * 478 / 120);
      const p = await call('/api/admin/products', { method: 'POST', body: JSON.stringify({ brand_slug: S.brand, type: 'perfume', model: meta.line, colour: v.ml + ' ml', colour_mn: v.ml + ' мл', cny, retail_usd: v.usd, weight_kg: 0.6, sizes: [] }) });
      const up = join(ROOT, 'uploads', 'products', p.id); rmSync(up, { recursive: true, force: true }); mkdirSync(up, { recursive: true });
      const ver = Date.now().toString(36);
      const urls = pick.map((f, k) => { copyFileSync(join(dir, f + '.webp'), join(up, `${k + 1}.webp`)); return `uploads/products/${p.id}/${k + 1}.webp?v=${ver}`; });
      await dbm.db.run("UPDATE products SET photo=?, photos=?, photo_src=?, price_source='official' WHERE id=?", [urls[0], JSON.stringify(urls), S.base + '/products/' + meta.handle, p.id]);
      n++; console.log('+', p.id);
    }
  }
  await fetch(API + '/api/admin/reload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN } }).catch(() => {});
  console.log(`\n${n} products added.`); process.exit(0);
}
