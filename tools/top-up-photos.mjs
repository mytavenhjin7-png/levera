// LEVERA — make sure every product has at least 5 photos.
//   npm run photos:top-up               (-- --id <product-id> for one piece)
// Run after `npm run photos`. A product that still has fewer than 5 photos (search couldn't find more clean shots of that exact
// colourway) gets close-up detail views cut from its own main photo — toe and heel for shoes, collar/chest and
// fabric close-ups for everything else — so every image shows the real piece, never a different one.
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs');
await dbm.ready;
const db = dbm.db;
const W = 800, H = 1000, TARGET = 5;

const only = process.argv.includes('--id') ? process.argv[process.argv.indexOf('--id') + 1] : null;
const rows = await db.all('SELECT id, cat, photo, photos FROM products WHERE active=1 AND photo IS NOT NULL' + (only ? ' AND id=?' : ''), only ? [only] : []);
let topped = 0, skipped = 0;
for (const p of rows) {
  let list = []; try { list = JSON.parse(p.photos || '[]'); } catch {}
  if (!list.length) list = [p.photo];
  list = [...new Set(list.map(u => u.split('?')[0]))].map(b => list.find(u => u.split('?')[0] === b));   // no photo twice
  if (list.length >= TARGET) { if (list.length !== JSON.parse(p.photos || '[]').length) await db.run('UPDATE products SET photos=? WHERE id=?', [JSON.stringify(list), p.id]); continue; }
  const mainFile = join(ROOT, list[0].split('?')[0]);
  if (!existsSync(mainFile)) { skipped++; continue; }
  try {
    // a studio shot has a white margin all round (the styling in photo-style.mjs puts it there)
    const corners = await sharp(mainFile).flatten({ background: '#ffffff' }).resize(10, 10, { fit: 'fill' }).raw().toBuffer();
    const studio = [0, 9, 90, 99].every(i => corners[i * 3] > 240 && corners[i * 3 + 1] > 240 && corners[i * 3 + 2] > 240);
    // the product without its white margin (on-model shots keep the whole frame)
    const piece = studio
      ? await sharp(mainFile).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true })
      : await sharp(mainFile).flatten({ background: '#ffffff' }).toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = piece.info;
    if (w < 120 || h < 120) { skipped++; continue; }
    const wide = w / h > 1.2;
    // detail regions as [left, top, width, height] fractions of the product
    const regions = p.cat === 'footwear' || wide
      ? [[0.42, 0, 0.58, 1], [0, 0, 0.58, 1], [0.2, 0.25, 0.6, 0.75], [0.55, 0.3, 0.45, 0.7], [0, 0.1, 0.42, 0.75]]   // toe end, heel end, mid-foot, toe box, collar
      : [[0.15, 0, 0.7, 0.5], [0.25, 0.3, 0.5, 0.45], [0.1, 0.45, 0.8, 0.55], [0.08, 0, 0.84, 0.62], [0.08, 0.38, 0.84, 0.62]]; // collar/chest, fabric, lower half, upper and lower close-ups (never split down the middle)
    const dir = join(ROOT, 'uploads', 'products', p.id);
    mkdirSync(dir, { recursive: true });
    const v = Date.now().toString(36);
    let n = list.length;
    // photos already topped up used the first views: carry on with the ones not used yet
    let k = 0;
    for (const [fx, fy, fw, fh] of regions.slice(list.length >= 3 ? 3 : 0).concat(regions.slice(0, 3))) {
      if (n >= TARGET) break;
      const left = Math.round(w * fx), top = Math.round(h * fy), cw = Math.max(1, Math.min(w - left, Math.round(w * fw))), ch = Math.max(1, Math.min(h - top, Math.round(h * fh)));
      const cut = sharp(piece.data).extract({ left, top, width: cw, height: ch });
      // studio shots: the close-up sits on the white canvas; on-model / backdrop shots: it fills the frame
      const out = studio
        ? await (async () => {
            const crop = await cut.resize(720, 900, { fit: 'inside', kernel: 'lanczos3' }).toBuffer({ resolveWithObject: true });
            return sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
              .composite([{ input: crop.data, left: Math.round((W - crop.info.width) / 2), top: Math.round((H - crop.info.height) / 2) }]).webp({ quality: 84 }).toBuffer();
          })()
        : await cut.resize(W, H, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).webp({ quality: 84 }).toBuffer();
      n++; k++;
      // a name of its own: galleries can have gaps, a plain number could overwrite a photo still in use
      writeFileSync(join(dir, `d${v}${k}.webp`), out);
      list.push(`uploads/products/${p.id}/d${v}${k}.webp`);
    }
    await db.run('UPDATE products SET photos=? WHERE id=?', [JSON.stringify(list), p.id]);
    topped++;
  } catch (e) { skipped++; }
}
console.log(`Topped up ${topped} products to ${TARGET} photos; ${skipped} skipped (no usable main photo).`);
try {
  const token = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
  await fetch(`http://localhost:${process.env.PORT || 8787}/api/admin/reload`, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(3000) });
} catch {}
process.exit(0);
