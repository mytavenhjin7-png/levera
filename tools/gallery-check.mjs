// LEVERA — find gallery photos that don't look like their product's main photo: compares the colours of the piece
// itself (white backdrop ignored). Writes data/gallery-odd.json { id: [gallery indexes] } for checking by eye.
//   node tools/gallery-check.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const rows = await dbm.db.all("SELECT id, type, photos, photo_src FROM products WHERE active=1");
// 4×4×4 colour histogram of the non-white pixels
const hist = async f => {
  const { data } = await sharp(join(ROOT, f.split('?')[0])).flatten({ background: '#fff' }).resize(48, 60, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const h = new Float32Array(64); let n = 0;
  for (let i = 0; i < data.length; i += 3) { const r = data[i], g = data[i + 1], b = data[i + 2]; if (r > 235 && g > 235 && b > 235) continue; h[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)]++; n++; }
  if (n) for (let i = 0; i < 64; i++) h[i] /= n; return { h, n };
};
const overlap = (a, b) => { let s = 0; for (let i = 0; i < 64; i++) s += Math.min(a[i], b[i]); return s; };
const odd = {}; let photos = 0;
for (const p of rows) {
  const ph = JSON.parse(p.photos || '[]'); if (ph.length < 2) continue;
  let main; try { main = await hist(ph[0]); } catch { continue; }
  for (let i = 1; i < ph.length; i++) {
    if (/\/d[a-z0-9]+\.webp/.test(ph[i])) continue;                 // a detail view cut from the main photo
    photos++;
    try { const x = await hist(ph[i]); if (x.n < 40 || overlap(main.h, x.h) < 0.3) (odd[p.id] ||= []).push(i); } catch { (odd[p.id] ||= []).push(i); }
  }
}
writeFileSync(join(ROOT, 'data', 'gallery-odd.json'), JSON.stringify(odd, null, 1));
console.log(`${photos} gallery photos checked, ${Object.values(odd).flat().length} look different, on ${Object.keys(odd).length} products.`);
process.exit(0);
