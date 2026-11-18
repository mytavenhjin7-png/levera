// LEVERA — count the REAL photos of every product. Detail crops don't count: new ones are named d….webp, older ones
// are found by re-cutting the same regions from the main photo and comparing. Near-identical photos count once.
//   node tools/photo-verdict.mjs     → data/photo-verdict.json { id: realCount } + summary per brand
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const rows = await dbm.db.all('SELECT id, brand_slug b, cat, photos FROM products WHERE active=1');
const W = 800, H = 1000, F = p => join(ROOT, p.split('?')[0]);
const SHOE = [[0.42, 0, 0.58, 1], [0, 0, 0.58, 1], [0.2, 0.25, 0.6, 0.75], [0.55, 0.3, 0.45, 0.7], [0, 0.1, 0.42, 0.75]];
const REST = [[0.15, 0, 0.7, 0.5], [0.25, 0.3, 0.5, 0.45], [0.1, 0.45, 0.8, 0.55], [0, 0.15, 0.55, 0.5], [0.45, 0.15, 0.55, 0.5], [0.08, 0, 0.84, 0.62], [0.08, 0.38, 0.84, 0.62]];
const small = async b => sharp(b).flatten({ background: '#fff' }).greyscale().resize(32, 40, { fit: 'fill' }).raw().toBuffer();
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
async function cuts(main, cat) {
  const out = [];
  const corners = await sharp(main).flatten({ background: '#ffffff' }).resize(10, 10, { fit: 'fill' }).raw().toBuffer();
  const studio = [0, 9, 90, 99].every(i => corners[i * 3] > 240 && corners[i * 3 + 1] > 240 && corners[i * 3 + 2] > 240);
  const piece = studio ? await sharp(main).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true }) : await sharp(main).flatten({ background: '#ffffff' }).toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = piece.info, wide = w / h > 1.2;
  for (const [fx, fy, fw, fh] of cat === 'footwear' || wide ? SHOE : REST) {
    const left = Math.round(w * fx), top = Math.round(h * fy), cw = Math.max(1, Math.min(w - left, Math.round(w * fw))), ch = Math.max(1, Math.min(h - top, Math.round(h * fh)));
    const cut = sharp(piece.data).extract({ left, top, width: cw, height: ch });
    const buf = studio ? await (async () => { const c = await cut.resize(720, 900, { fit: 'inside' }).toBuffer({ resolveWithObject: true }); return sharp({ create: { width: W, height: H, channels: 3, background: '#fff' } }).composite([{ input: c.data, left: Math.round((W - c.info.width) / 2), top: Math.round((H - c.info.height) / 2) }]).png().toBuffer(); })() : await cut.resize(W, H, { fit: 'cover' }).png().toBuffer();
    out.push(await small(buf));
  }
  return out;
}
const verdict = {}, by = {};
for (const p of rows) {
  const l = JSON.parse(p.photos || '[]'); let real = 0;
  try {
    const seen = [await small(F(l[0]))]; real = 1;
    const made = await cuts(F(l[0]), p.cat);
    for (const u of l.slice(1)) {
      if (/\/d[a-z0-9]+\.webp/.test(u)) continue;
      const s = await small(F(u));
      if (made.some(c => diff(c, s) < 7)) continue;        // a crop of the main photo
      if (seen.some(c => diff(c, s) < 4)) continue;        // the same picture twice
      seen.push(s); real++;
    }
  } catch {}
  verdict[p.id] = real;
  const b = by[p.b] ||= { n: 0, r5: 0, r4: 0 }; b.n++; if (real >= 5) b.r5++; else if (real === 4) b.r4++;
}
writeFileSync(join(ROOT, 'data', 'photo-verdict.json'), JSON.stringify(verdict));
const d = {}; for (const v of Object.values(verdict)) d[v] = (d[v] || 0) + 1;
console.log('real photos per product', d);
console.log(Object.entries(by).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${k}: ${v.n} → 5 real ${v.r5}, 4 real ${v.r4}`).join('\n'));
process.exit(0);
