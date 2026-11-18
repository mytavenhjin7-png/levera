// LEVERA — Nike's own product photos for pieces whose Nike style-colour code is known (Nike's public product feed).
//   node tools/nike-official.mjs                → the pieces in STYLE below
//   node tools/nike-official.mjs <id>=<code> …  → others, e.g. nike-club-cap-black=FB5368-010
//   node tools/nike-official.mjs --all           → redo every product whose photos already came from Nike
// Nike's CDN adds the grey backdrop as a separate layer (u_…): it is left off, so the cut-out lands on pure white,
// and a shoe's main photo is turned to point right (the StockX standard).
// All photos of that one style-colour, in Nike's order, styled like every other photo (white, centred, 800×1000).
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = join(ROOT, 'uploads', 'products');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const FEED = 'https://api.nike.com/product_feed/threads/v2?filter=marketplace(US)&filter=language(en)&filter=channelId(d9a5bc42-4b9c-4976-858a-f159cf99c647)&filter=productInfo.merchProduct.styleColor(';
const STYLE = {
  'nike-sportswear-club-t-shirt-black': 'AR4997-010', 'nike-sportswear-club-t-shirt-white': 'AR4997-100', 'nike-sportswear-club-t-shirt-grey': 'AR4997-066',
  'nike-sportswear-swoosh-t-shirt-black': 'DC5094-010', 'nike-sportswear-swoosh-t-shirt-white': 'DC5094-100',
  'nike-club-unstructured-futura-wash-cap-black': 'FB5368-010', 'nike-club-unstructured-futura-wash-cap-white': 'FB5368-100', 'nike-club-unstructured-futura-wash-cap-navy': 'FB5368-410',
  'nike-peak-futura-beanie-black': 'FB6527-010', 'nike-peak-futura-beanie-grey': 'FB6527-071'
};
const extra = Object.fromEntries(process.argv.slice(2).filter(a => a.includes('=')).map(a => a.split('=')));
let todo = Object.keys(extra).length ? extra : STYLE;

const dbm = await import('../server/db.mjs'); await dbm.ready;
if (process.argv.includes('--all')) todo = Object.fromEntries((await dbm.db.all("SELECT id, photo_src FROM products WHERE photo_src LIKE 'https://www.nike.com/t/%'")).map(r => [r.id, r.photo_src.split('/').pop()]));
let ok = 0; const missed = [];
for (const [id, code] of Object.entries(todo)) {
  try {
    const o = (await (await fetch(FEED + code + ')', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) })).json()).objects?.[0];
    const nodes = (o?.publishedContent?.nodes?.[0]?.nodes || []).filter(n => n.subType === 'image');
    const shots = [];
    const shoe = (await dbm.db.get('SELECT cat FROM products WHERE id=?', [id]))?.cat === 'footwear';
    for (const n of nodes) {
      if (shots.length >= 5) break;
      const raw = n.properties.squarishURL || n.properties.portraitURL || '';
      // without the backdrop layer the PNG is a transparent cut-out; with it as a fallback
      const urls = [raw.replace(/\/a\/images\/t_default\/u_[^/]*\//, '/a/images/f_png,w_1600/'), raw.replace('/t_default/', '/t_PDP_1728_v1/f_auto,q_auto:eco/')];
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) }); if (!r.ok) continue;
          const buf = await sharp(Buffer.from(await r.arrayBuffer())).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
          const a = await analyse(buf);
          shots.push(await render(a, { footwear: shoe && !shots.length, flip: shoe && !shots.length && a.facesRight === false }));
          break;
        } catch {}
      }
    }
    if (!shots.length) { missed.push(id); continue; }
    const dir = join(UPLOADS, id);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const v = Date.now().toString(36);
    const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${id}/${i + 1}.webp?v=${v}`; });
    const r = await dbm.db.run("UPDATE products SET photo=?, photos=?, photo_src=?, price_source='official', active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?", [urls[0], JSON.stringify(urls), 'https://www.nike.com/t/' + code, id]);
    if (r.changes) { ok++; console.log(id, '←', code, '(' + urls.length + ')'); } else missed.push(id + ' (no such product)');
  } catch (e) { missed.push(id + ' (' + e.message + ')'); }
}
try { await fetch('http://localhost:8787/api/admin/reload', { method: 'POST', headers: { Authorization: 'Bearer ' + (process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim()) } }); } catch {}
console.log(`\n${ok} products with Nike's photos.` + (missed.length ? ' Missed: ' + missed.join(', ') : ''));
process.exit(0);
