// LEVERA — check every product photo against the shop's standard, and restyle the ones that pass.
//   npm run photos:audit            → report only (data/photo-audit.json)
//   npm run photos:audit -- --fix   → also re-draw every passing studio photo in the standard style
// Standard for the MAIN photo: the file exists, is big enough, is a studio shot (plain light backdrop), the whole
// product is inside the frame (not cut off at an edge) and, for shoes, it is one shoe in side profile.
// Products that fail go to data/photo-audit.json → `npm run photos -- --ids data/photo-audit.json --replace`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyse, render } from './photo-style.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs');
await dbm.ready;
const db = dbm.db;
const FIX = process.argv.includes('--fix');
// --promote: when the main photo fails but another photo of the same piece passes, move that one to the front
const PROMOTE = process.argv.includes('--promote');
const passes = (x, footwear) => x.studio && !x.cropped && (!footwear || x.side);

const rows = await db.all('SELECT id, cat, photo, photos FROM products WHERE active=1 ORDER BY brand_slug, sort');
const bad = [], reasons = {};
let restyled = 0, checked = 0, promoted = 0;
const note = (id, why) => { bad.push(id); reasons[id] = why; };
for (const p of rows) {
  checked++;
  let list = []; try { list = JSON.parse(p.photos || '[]'); } catch {}
  if (!list.length && p.photo) list = [p.photo];
  if (!list.length) { note(p.id, 'no photo'); continue; }
  const files = list.map(u => join(ROOT, u.split('?')[0]));
  if (!existsSync(files[0])) { note(p.id, 'main photo file missing'); continue; }
  let a;
  try { a = await analyse(readFileSync(files[0])); } catch (e) { note(p.id, 'main photo unreadable: ' + e.message); continue; }
  const footwear = p.cat === 'footwear';
  if (PROMOTE && !passes(a, footwear)) {
    for (let k = 1; k < files.length; k++) {
      if (!existsSync(files[k])) continue;
      let x; try { x = await analyse(readFileSync(files[k])); } catch { continue; }
      if (!passes(x, footwear)) continue;
      const order = [list[k], ...list.filter((_, j) => j !== k)];
      await db.run('UPDATE products SET photo=?, photos=? WHERE id=?', [order[0], JSON.stringify(order), p.id]);
      list.splice(0, list.length, ...order); files.splice(0, files.length, ...order.map(u => join(ROOT, u.split('?')[0]))); a = x; promoted++;
      break;
    }
  }
  if (!a.studio) note(p.id, 'main photo is not a clean studio shot');
  else if (a.cropped) note(p.id, 'product cut off at the edge of the main photo');
  else if (footwear && !a.side) note(p.id, 'main shoe photo is not a single shoe in side profile');
  else if (list.length < 3) note(p.id, 'fewer than 3 photos');
  if (FIX) {
    // re-draw every studio photo that shows the whole product, so they all share one size and position
    for (const f of files) {
      if (!existsSync(f)) continue;
      try {
        const x = await analyse(readFileSync(f));
        if (!x.studio || x.cropped) continue;
        const r = await render(x, { footwear });
        writeFileSync(f, r.out); restyled++;
      } catch {}
    }
  }
  if (checked % 100 === 0) console.log(`  ${checked}/${rows.length} checked · ${bad.length} need new photos${FIX ? ' · ' + restyled + ' restyled' : ''}`);
}
const byReason = {};
for (const id of bad) byReason[reasons[id]] = (byReason[reasons[id]] || 0) + 1;
writeFileSync(join(ROOT, 'data', 'photo-audit.json'), JSON.stringify({ at: new Date().toISOString(), checked, need_new: bad.length, by_reason: byReason, ids: bad, reasons }, null, 2));
console.log(`Checked ${checked} products: ${bad.length} need new photos`, byReason, FIX ? `· ${restyled} photos restyled` : '', PROMOTE ? `· ${promoted} better main photos moved to the front` : '');
process.exit(0);
