// LEVERA — renders a studio image for every product in the database into assets/products/<id>.webp.
//   node --no-warnings tools/product-renders/render-catalog.mjs            # only missing images
//   node --no-warnings tools/product-renders/render-catalog.mjs --force    # everything
//   node --no-warnings tools/product-renders/render-catalog.mjs nike-kobe-6-protro-grinch ...
// Needs: npm i -D playwright && npx playwright install chromium
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { db, seed } from '../../server/db.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', '..', 'assets', 'products');
await mkdir(outDir, { recursive: true });
seed();

const args = process.argv.slice(2), force = args.includes('--force'), only = args.filter(a => !a.startsWith('--'));
let items = db.prepare('SELECT id, render FROM products').all().map(r => ({ id: r.id, ...JSON.parse(r.render || '{}') })).filter(r => r.kind);
if (only.length) items = items.filter(i => only.includes(i.id));
else if (!force) items = items.filter(i => !existsSync(join(outDir, i.id + '.webp')));
console.log('to render:', items.length);
if (!items.length) process.exit(0);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.json': 'application/json' };
const srv = http.createServer(async (req, res) => {
  try { const p = join(here, decodeURIComponent(req.url.split('?')[0])); const body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 720, height: 900 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`http://127.0.0.1:${port}/render.html`);
await page.waitForFunction('window.ready === true', null, { timeout: 60000 });

const t0 = Date.now(); let done = 0, failed = 0;
for (let i = 0; i < items.length; i += 12) {
  const batch = items.slice(i, i + 12);
  const out = await page.evaluate(b => window.renderItems(b), batch);
  for (const [id, data] of Object.entries(out)) {
    if (data.startsWith('ERR')) { failed++; console.error(id, data); continue; }
    await writeFile(join(outDir, id + '.webp'), Buffer.from(data.split(',', 2)[1], 'base64')); done++;
  }
  const rate = done / ((Date.now() - t0) / 1000);
  process.stdout.write(`\r${done}/${items.length} rendered · ${rate.toFixed(1)}/s · ${failed} failed   `);
}
console.log('\ndone in', Math.round((Date.now() - t0) / 1000) + 's');
await browser.close(); srv.close();
