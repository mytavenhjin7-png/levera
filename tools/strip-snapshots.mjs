// LEVERA — after tools/find-snapshots.mjs: drop non-white photos of pieces whose photos came from unknown sites
// (resale listings, blogs, phone snapshots). Photos from official sites and major retailers stay, on-model included.
// A main photo that goes is replaced by the first white photo of the gallery; with none left the piece is hidden.
//   node tools/strip-snapshots.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRUSTED = /stockx|goat\.com|flightclub|ssense|mrporter|net-a-porter|mytheresa|farfetch|endclothing|harrods|selfridges|nordstrom|saksfifth|neimanmarcus|bergdorf|luisaviaroma|24s\.com|fwrd|revolve|kith\.com|sephora|ulta|notino|douglas|lookfantastic|cartier\.com|chanel\.com|dior\.com|louisvuitton\.com|celine\.com|burberry\.com|yslbeauty|versace\.com|valentino\.com|maisonmargiela|moncler\.com|stoneisland|ralphlauren|arcteryx|nike\.com|adidas\.|converse\.com|levi\.com|zara\.com|balenciaga\.com|acnestudios|thenorthface|columbia\.com|newbalance|uniqlo|hm\.com|carhartt|bape\.com|creedboutique|parfums-de-marly|xerjoff|tomfordbeauty|twistedlily|perfumeonline|fragranceoutlet|luxuryperfume/i;
const dbm = await import('../server/db.mjs'); await dbm.ready; const db = dbm.db;
const { gallery } = JSON.parse(readFileSync(join(ROOT, 'data', 'snapshots.json'), 'utf8'));
let cut = 0, swapped = 0; const hidden = [], thin = [];
for (const [id, bad] of Object.entries(gallery)) {
  const p = await db.get('SELECT photo, photos, photo_src FROM products WHERE id=?', [id]);
  if (!p || TRUSTED.test(p.photo_src || '')) continue;
  const keep = JSON.parse(p.photos || '[]').filter((_, i) => !bad.includes(i));
  cut += bad.length;
  if (!keep.length) { await db.run('UPDATE products SET active=0 WHERE id=?', [id]); hidden.push(id); continue; }
  if (bad.includes(0)) swapped++;
  await db.run('UPDATE products SET photo=?, photos=? WHERE id=?', [keep[0], JSON.stringify(keep), id]);
  if (keep.length < 3) thin.push(id);
}
console.log(`${cut} photos removed, ${swapped} main photos replaced, ${hidden.length} hidden, ${thin.length} now under 3 photos.`);
if (hidden.length) console.log('hidden:', hidden.join(' '));
process.exit(0);
