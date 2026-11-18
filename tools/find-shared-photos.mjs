// LEVERA — find one picture used as the main photo of different models (a search result that landed on the wrong
// pieces). Compares a small fingerprint of every main photo; prints groups and writes data/shared-photos.json.
//   node tools/find-shared-photos.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const rows = await dbm.db.all("SELECT id, brand_slug b, line, cat, photo FROM products WHERE active=1 AND photo IS NOT NULL AND photo<>''");
const fp = async f => { const d = await sharp(join(ROOT, f.split('?')[0])).flatten({ background: '#fff' }).greyscale().resize(16, 20, { fit: 'fill' }).raw().toBuffer(); return d; };
const items = [];
for (const r of rows) { try { items.push({ ...r, d: await fp(r.photo) }); } catch {} }
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const seen = new Set(), groups = [];
for (let i = 0; i < items.length; i++) {
  if (seen.has(i)) continue; const g = [i];
  for (let j = i + 1; j < items.length; j++) if (!seen.has(j) && dist(items[i].d, items[j].d) < 3.5) g.push(j);
  const lines = new Set(g.map(k => items[k].b + '|' + items[k].line));
  if (lines.size > 1) { g.forEach(k => seen.add(k)); groups.push(g.map(k => items[k])); }
}
groups.sort((a, b) => b.length - a.length);
for (const g of groups) console.log(g.length, 'x', [...new Set(g.map(x => x.b + ':' + x.line))].slice(0, 7).join(', '));
writeFileSync(join(ROOT, 'data', 'shared-photos.json'), JSON.stringify(groups.map(g => g.map(x => x.id)), null, 1));
console.log(`\n${groups.length} groups, ${groups.flat().length} pieces.`);
process.exit(0);
