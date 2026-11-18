// LEVERA — find amateur / lifestyle shots: every studio photo is drawn on pure white, so a photo whose outer ring
// isn't white is a snapshot, a room, a wall, a street. Official on-model shots (Uniqlo, Nike) are left out.
//   node tools/find-snapshots.mjs            → report + data/snapshots.json { main: [ids], gallery: { id: [indexes] } }
//   node tools/find-snapshots.mjs --strip    → also remove such photos from galleries (the main photo stays)
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRIP = process.argv.includes('--strip');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const rows = await dbm.db.all("SELECT id, brand_slug b, cat, photo, photos, photo_src FROM products WHERE active=1");
const white = async f => {
  const { data, info } = await sharp(join(ROOT, f.split('?')[0])).flatten({ background: '#fff' }).resize(40, 50, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0, w = 0;
  for (let y = 0; y < 50; y++) for (let x = 0; x < 40; x++) { if (x > 1 && x < 38 && y > 1 && y < 48) continue; const i = (y * 40 + x) * info.channels; n++; if (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238) w++; }
  return w / n;
};
const main = [], gallery = {};
for (const p of rows) {
  if (/uniqlo\.com|nike\.com/.test(p.photo_src || '')) continue;
  const ph = JSON.parse(p.photos || '[]'), bad = [];
  for (const [i, f] of ph.entries()) { try { if (await white(f) < 0.6) bad.push(i); } catch {} }
  if (!bad.length) continue;
  if (bad.includes(0)) main.push(p.id);
  gallery[p.id] = bad;
  if (STRIP) { const keep = ph.filter((_, i) => !bad.includes(i) || i === 0); await dbm.db.run('UPDATE products SET photos=? WHERE id=?', [JSON.stringify(keep), p.id]); }
}
writeFileSync(join(ROOT, 'data', 'snapshots.json'), JSON.stringify({ main, gallery }, null, 1));
const by = {}; for (const id of main) { const b = rows.find(r => r.id === id).b; by[b] = (by[b] || 0) + 1; }
console.log('active', rows.length, '· main not on white', main.length, '· with such gallery photos', Object.keys(gallery).length);
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
process.exit(0);
