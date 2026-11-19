// LEVERA — write assets/gallery.json { id: [photo urls] } so product pages show every photo on static hosting
// (Firebase Hosting before the server is deployed). Run after adding products, before `npm run deploy:site`.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const rows = await dbm.db.all('SELECT id, photo, photos FROM products WHERE active=1');
const out = {};
for (const r of rows) { let l = []; try { l = JSON.parse(r.photos || '[]'); } catch {} if (!l.length && r.photo) l = [r.photo]; out[r.id] = l; }
writeFileSync(join(ROOT, 'assets', 'gallery.json'), JSON.stringify(out));
console.log('gallery.json:', rows.length, 'products'); process.exit(0);
