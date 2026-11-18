// LEVERA — honest numbers on the photos: real photos vs detail crops, and how sharp each main photo is.
//   node tools/photo-quality.mjs     → summary + data/photo-quality.json (per brand, and the softest main photos)
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const rows = await dbm.db.all('SELECT id, brand_slug b, cat, photo, photos, photo_src FROM products WHERE active=1');
// edge energy of the piece at full size: blurry, upscaled photos score low
const sharpness = async f => {
  const { data, info } = await sharp(join(ROOT, f.split('?')[0])).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height; let s = 0, n = 0;
  for (let y = 2; y < h - 2; y += 2) for (let x = 2; x < w - 2; x += 2) { const i = y * w + x, v = data[i]; if (v > 240) continue; const l = 4 * v - data[i - 1] - data[i + 1] - data[i - w] - data[i + w]; s += l * l; n++; }
  return n > 200 ? s / n : 0;
};
const isCrop = u => /\/d[a-z0-9]+\.webp/.test(u);
const realDist = {}, by = {}, soft = [];
for (const p of rows) {
  const l = JSON.parse(p.photos || '[]'), real = l.filter(u => !isCrop(u)).length;
  realDist[real] = (realDist[real] || 0) + 1;
  const b = by[p.b] ||= { n: 0, real5: 0, real1: 0, soft: 0 }; b.n++; if (real >= 5) b.real5++; if (real <= 1) b.real1++;
  try { const s = await sharpness(l[0] || p.photo); if (s < 60) { b.soft++; soft.push([p.id, Math.round(s)]); } } catch {}
}
writeFileSync(join(ROOT, 'data', 'photo-quality.json'), JSON.stringify({ realDist, by, soft }, null, 1));
console.log('products', rows.length, '· real photos per product', realDist, '· soft main photos', soft.length);
console.log(Object.entries(by).sort((a, b) => b[1].real1 - a[1].real1).map(([k, v]) => `${k} ${v.n}: 5real ${v.real5}, ≤1real ${v.real1}, soft ${v.soft}`).join('\n'));
process.exit(0);
