// LEVERA — the whole photo pipeline in one go, for after adding products:
//   npm run photos:all
//   1. photos for products that have none          (fetch-photos.mjs)
//   2. retry products hidden for a wrong photo       (fetch-photos --ids data/hidden-wrong-photo.json --verify-colour)
//      and show again the ones whose new main photo is the right colour
//   3. at least 3 photos for every product           (top-up-photos.mjs)
//   4. audit, better main photo to the front         (audit-photos.mjs --promote)
//   5. colour check of every main photo              → data/colour-check.json
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (...args) => { console.log('\n▶ node', args.join(' ')); const r = spawnSync(process.execPath, ['--no-warnings', ...args], { cwd: ROOT, stdio: 'inherit' }); if (r.status) console.warn('  (exit ' + r.status + ')'); };

run('tools/fetch-photos.mjs');

const hiddenFile = join(ROOT, 'data', 'hidden-wrong-photo.json');
if (existsSync(hiddenFile)) {
  run('tools/fetch-photos.mjs', '--ids', 'data/hidden-wrong-photo.json', '--replace', '--verify-colour', '--loose');
  // show again the hidden pieces whose main photo now fits their colour; keep the rest hidden
  const { analyse, colourFit } = await import('./photo-style.mjs');
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  const hidden = JSON.parse(readFileSync(hiddenFile, 'utf8'));
  const still = [];
  for (const id of hidden.ids) {
    const p = await dbm.db.get('SELECT name_en, photo FROM products WHERE id=?', [id]);
    const f = p && p.photo && join(ROOT, p.photo.split('?')[0]);
    let ok = false;
    if (f && existsSync(f)) { try { ok = colourFit((await analyse(readFileSync(f))).tone, p.name_en.split(/\s+—\s+/)[1] || '') >= 0.3; } catch {} }
    if (ok) await dbm.db.run('UPDATE products SET active=1 WHERE id=?', [id]); else still.push(id);
  }
  writeFileSync(hiddenFile, JSON.stringify({ ...hidden, at: new Date().toISOString(), ids: still }, null, 2));
  console.log(`Hidden products: ${hidden.ids.length - still.length} shown again with a correct photo, ${still.length} still hidden.`);
}

run('tools/top-up-photos.mjs');
run('tools/audit-photos.mjs', '--promote');

// colour check of every active main photo
{
  const { analyse, colourFit } = await import('./photo-style.mjs');
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  const rows = await dbm.db.all('SELECT id, cat, name_en, photo FROM products WHERE active=1 AND photo IS NOT NULL');
  const bad = [];
  for (const p of rows) {
    if (!['apparel', 'footwear', 'bags'].includes(p.cat)) continue;
    const f = join(ROOT, p.photo.split('?')[0]); if (!existsSync(f)) continue;
    try { const fit = colourFit((await analyse(readFileSync(f))).tone, p.name_en.split(/\s+—\s+/)[1] || ''); if (fit < 0.15) bad.push({ id: p.id, colour: p.name_en.split(/\s+—\s+/)[1], fit: +fit.toFixed(2) }); } catch {}
  }
  writeFileSync(join(ROOT, 'data', 'colour-check.json'), JSON.stringify(bad, null, 2));
  const s = await dbm.db.get("SELECT COUNT(*) active, SUM(photo IS NULL) no_photo, SUM(JSON_LENGTH(photos) >= 3) three_plus, SUM(JSON_LENGTH(photos) >= 5) five FROM products WHERE active=1");
  console.log('\nDone.', JSON.stringify(s), `· ${bad.length} main photos to look at for colour (data/colour-check.json)`);
}
process.exit(0);
