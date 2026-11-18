// LEVERA — slow, polite photo search for a few pieces: ONE DuckDuckGo image search per product, a pause between
// products, and only results whose title names the model and the colour. Official brand sites rank first.
//   node tools/ddg-photos.mjs <ids.json> [--pause 25]
// Use it when tools/fetch-photos.mjs gets rate-limited (it makes several searches per product).
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = join(ROOT, 'uploads', 'products');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ids = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pause = (Number(process.argv[process.argv.indexOf('--pause') + 1]) || 25) * 1000;
const OFFICIAL = /(^|\.)(adidas\.[a-z.]+|newbalance\.[a-z.]+|converse\.[a-z.]+|nike\.com|assets\.adidas\.com|nb\.scene7\.com)$/i;
const RETAIL = /(endclothing|size\.co|jdsports|footlocker|zalando|asos|sneakersnstuff|kith|ssense|farfetch|nordstrom|dickssportinggoods|finishline|champssports|hibbett)/i;
const BAD = /aliexpress|alibaba|dhgate|temu|wish\.com|shein|ebay|poshmark|depop|mercari|vinted|pinterest|replica|fake/i;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const flat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const host = u => { try { return new URL(u).host; } catch { return ''; } };

async function ddg(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const h = await (await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(q) + '&iax=images&ia=images', { headers: { 'User-Agent': UA } })).text();
    const vqd = (h.match(/vqd=["']?([\d-]+)/) || [])[1];
    const r = await fetch('https://duckduckgo.com/i.js?l=us-en&o=json&f=,,,,,&p=1&q=' + encodeURIComponent(q) + '&vqd=' + vqd, { headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' } });
    if (r.status === 200) return (await r.json()).results || [];
    console.log('  rate-limited, waiting', 60 * (attempt + 1), 's'); await sleep(60000 * (attempt + 1));
  }
  return [];
}

const dbm = await import('../server/db.mjs'); await dbm.ready;
let ok = 0; const missed = [];
for (const id of ids) {
  const p = await dbm.db.get('SELECT p.id, p.line, p.variant, b.name brand FROM products p JOIN brands b ON b.slug=p.brand_slug WHERE p.id=?', [id]);
  if (!p) continue;
  const words = flat(p.line).split(' ').filter(w => w.length > 2 && !['the', 'and', 'tee', 'shirt'].includes(w));
  const colour = flat(p.variant);
  const res = (await ddg(`${p.brand} ${p.line} ${p.variant}`))
    .filter(x => x.image && x.width >= 600 && !BAD.test(x.url + x.image))
    .filter(x => { const t = flat(x.title + ' ' + x.url); return words.every(w => t.includes(w)) && t.includes(colour); })
    .map(x => ({ ...x, rank: OFFICIAL.test(host(x.url)) ? 0 : RETAIL.test(host(x.url)) ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank);
  const shots = []; let src = '';
  for (const x of res.slice(0, 10)) {
    if (shots.length >= 4) break;
    try {
      const r = await fetch(x.image, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      const a = await analyse(Buffer.from(await r.arrayBuffer()));
      if (!a.studio || a.cropped) continue;                 // clean packshots only
      const out = await render(a);
      if (shots.some(s => s.hash && out.hash && s.hash.reduce((n, v, i) => n + (v !== out.hash[i]), 0) <= 18)) continue;   // near-duplicate
      shots.push(out); src = src || x.url;
    } catch {}
  }
  if (!shots.length) { missed.push(id); console.log('·', id, 'nothing clean'); }
  else {
    const dir = join(UPLOADS, id);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const v = Date.now().toString(36);
    const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${id}/${i + 1}.webp?v=${v}`; });
    await dbm.db.run('UPDATE products SET photo=?, photos=?, photo_src=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [urls[0], JSON.stringify(urls), src, id]);
    ok++; console.log('✓', id, urls.length, 'photos ←', host(src));
  }
  await sleep(pause);
}
console.log(`\n${ok} products with photos (still hidden — check them, then set active=1).` + (missed.length ? ' Nothing for: ' + missed.join(', ') : ''));
process.exit(0);
