// LEVERA — Uniqlo pieces with Uniqlo's own photos (their public product API + image CDN).
//   node tools/uniqlo-official.mjs --dry      → only check which items / colours Uniqlo has
//   node tools/uniqlo-official.mjs            → add the everyday pieces below (under ₮150,000) through the admin API
//   node tools/uniqlo-official.mjs --photos   → also give every existing Uniqlo product the official photos
//   node tools/uniqlo-official.mjs --redo     → re-draw the photos of every Uniqlo product
// Photos per colour: the flat packshot (goods_<colour>_<id>.jpg) and the on-model shot in that same colour,
// styled like every other photo (white, centred, 800×1000); tools/top-up-photos.mjs then adds detail views.
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPLOADS = join(ROOT, 'uploads', 'products');
const API = process.env.API || 'http://localhost:8787';
const TOKEN = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
const DRY = process.argv.includes('--dry'), REDO = process.argv.includes('--redo'), PHOTOS = REDO || process.argv.includes('--photos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const UQ = 'https://www.uniqlo.com/us/api/commerce/v5/en';

// [Uniqlo product name, LEVERA type, Dewu/Uniqlo CN ¥, colours (Uniqlo colour names)]
const PLAN = [
  ['Crew Neck T-Shirt', 'tee', 99, ['BLACK', 'WHITE', 'GRAY']],
  ['DRY Color T-Shirt', 'tee', 39, ['BLACK', 'WHITE', 'GRAY']],
  ['Boxy Cropped T-Shirt', 'tee', 79, ['BLACK', 'WHITE', 'OLIVE']],
  ['DRY-EX T-Shirt', 'tee', 99, ['BLACK', 'WHITE', 'DARK GRAY']],
  ['Mini T-Shirt', 'tee', 79, ['BLACK', 'WHITE', 'BROWN']],
  ['AIRism Cotton T-Shirt', 'tee', 79, ['WHITE', 'BLACK', 'NAVY']],
  ['AIRism Cotton T-Shirt | Long Sleeve', 'longsleeve', 99, ['BLACK', 'WHITE', 'NATURAL']],
  ['Soft Brushed T-Shirt | Long Sleeve', 'longsleeve', 129, ['BLACK', 'WHITE', 'OLIVE']],
  ['Waffle T-Shirt', 'longsleeve', 129, ['BLACK', 'OFF WHITE', 'BEIGE']],
  ['Mock Neck T-Shirt | Long Sleeve', 'longsleeve', 79, ['BLACK', 'BROWN']],
  ['Turtleneck Long T-Shirt | Long Sleeve', 'longsleeve', 79, ['OFF WHITE', 'BLACK']],
  ['Soft Knitted Fleece T-Shirt', 'longsleeve', 129, ['BLACK', 'OFF WHITE', 'GRAY']],
  ['AIRism Cotton Pique Polo Shirt', 'polo', 129, ['NAVY', 'WHITE', 'BLACK']],
  ['DRY-EX Polo Shirt', 'polo', 129, ['BLACK', 'WHITE', 'GRAY']],
  ['DRY Pique Polo Shirt', 'polo', 129, ['BLACK']],
  ['Oxford Boxy Shirt', 'shirt', 179, ['WHITE', 'BLUE', 'PINK']],
  ['Sweatshirt', 'crew', 149, ['GRAY', 'BLACK', 'NAVY']],
  ['Washable Milano Ribbed Sweater', 'knit', 179, ['GRAY', 'OFF WHITE', 'BLACK']],
  ['Double Face Sweater', 'knit', 129, ['BLACK', 'NATURAL']],
  ['Fleece Button-Up Pullover', 'crew', 179, ['NATURAL', 'DARK GRAY', 'NAVY']],
  ['Barrel Chino Pants', 'pants', 179, ['BLACK', 'GRAY']],
  ['Ultra Stretch Active Jogger Pants', 'sweatpants', 199, ['BLACK', 'GRAY']],
  ['Chino Shorts | 8.5\"', 'shorts', 79, ['BEIGE', 'OFF WHITE', 'BLUE']],
  ['Ultra Stretch Sweat Shorts | 7\"', 'shorts', 79, ['BLACK', 'OFF WHITE']],
  ['Stretch Slim Shorts | 9\"', 'shorts', 69, ['NAVY', 'BEIGE']],
  ['Wide Sweat Shorts', 'shorts', 149, ['GRAY', 'BLACK']],
  ['Pocketable UV Protection Parka', 'jacket', 199, ['NAVY', 'BLACK']],
  ['Fleece Full-Zip Jacket | Color Block', 'zip', 179, ['BEIGE', 'OLIVE']],
  ['UV Protection Twill Cap', 'cap', 99, ['BLACK', 'BEIGE']],
  ['HEATTECH Ribbed Beanie', 'beanie', 79, ['BLACK', 'GRAY', 'BEIGE']],
  ['HEATTECH Cable Knit Beanie', 'beanie', 79, ['OFF WHITE', 'DARK GRAY']],
  ['HEATTECH Scarf', 'scarf', 99, ['BLACK', 'GRAY']],
  ['Round Mini Shoulder Bag', 'crossbody', 99, ['BEIGE']],
  // winter and women's everyday pieces (added 2026-11-03)
  ['Ribbed Henley Neck T-Shirt', 'tee', 99, ['BLACK', 'OFF WHITE', 'LIGHT GRAY']],
  ['Soft Ribbed T-Shirt | Long Sleeve', 'longsleeve', 99, ['BLACK', 'WHITE', 'BROWN']],
  ['Mini T-Shirt | Long Sleeve', 'longsleeve', 99, ['BLACK', 'WHITE', 'BEIGE']],
  ['Hooded Ribbed T-Shirt', 'longsleeve', 129, ['BLACK', 'GRAY', 'NAVY']],
  ['Soft Knitted Fleece T-Shirt | Long Sleeve', 'longsleeve', 129, ['BLACK', 'OFF WHITE', 'PINK']],
  ['HEATTECH T-Shirt', 'longsleeve', 79, ['NAVY', 'DARK GRAY']],
  ['HEATTECH Extra Warm Cashmere Blend T-Shirt', 'longsleeve', 149, ['BLACK', 'GRAY', 'NAVY']],
  ['AIRism Cotton Oversized T-Shirt | Half-Sleeve', 'tee', 99, ['GRAY', 'NAVY', 'DARK BROWN']],
  ['Merino Blended Sweater', 'knit', 179, ['BLACK', 'DARK BROWN']],
  ['Washable 3D Knit Sweater', 'knit', 179, ['BLACK', 'NAVY', 'LIGHT GRAY']],
  ['Smooth Cotton Sweater', 'knit', 199, ['BLACK', 'OFF WHITE', 'GRAY']],
  ['Fleece Full-Zip Jacket', 'zip', 179, ['NATURAL', 'BROWN', 'GREEN']],
  ['Fluffy Yarn Fleece Full-Zip Jacket', 'zip', 179, ['OFF WHITE', 'BLACK', 'PINK']],
  ['Chino Wide Pants', 'pants', 129, ['NATURAL', 'DARK BROWN']],
  ['Wide Sweatpants', 'sweatpants', 199, ['NAVY', 'BEIGE']],
  ['Straight Sweatpants', 'sweatpants', 199, ['NATURAL', 'BLACK', 'GRAY']],
  ['Warm Pile Lined Sweatpants', 'sweatpants', 199, ['GRAY', 'BLACK', 'NAVY']],
  ['Ultra Stretch Active Wide Pants', 'pants', 199, ['BLACK', 'DARK GRAY', 'BEIGE']],
  ['Wool Cashmere Beanie', 'beanie', 129, ['GRAY', 'NAVY']],
  ['HEATTECH Beanie', 'beanie', 79, ['BROWN']]
];
const MN = { BLACK: 'Хар', WHITE: 'Цагаан', 'OFF WHITE': 'Цайвар цагаан', NAVY: 'Хар хөх', GRAY: 'Саарал', 'DARK GRAY': 'Бараан саарал', 'LIGHT GRAY': 'Цайвар саарал',
  BEIGE: 'Шаргал', NATURAL: 'Цайвар шаргал', OLIVE: 'Чидун ногоон', BLUE: 'Цэнхэр', 'LIGHT BLUE': 'Цайвар цэнхэр', BROWN: 'Бор', 'DARK BROWN': 'Бараан бор', PINK: 'Ягаан', RED: 'Улаан', GREEN: 'Ногоон', 'DARK GREEN': 'Бараан ногоон', KHAKI: 'Хаки', CAMEL: 'Тэмээн шаргал' };
// LEVERA colour words → Uniqlo's
const TO_UQ = { black: 'BLACK', white: 'WHITE', navy: 'NAVY', grey: 'GRAY', gray: 'GRAY', beige: 'BEIGE', olive: 'OLIVE', camel: 'CAMEL', 'mid wash': 'BLUE', 'black denim': 'BLACK', blue: 'BLUE' };
const WHITE = new Set(['WHITE', 'OFF WHITE', 'NATURAL']);
const title = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const flat = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const get = async url => { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error(r.status + ' ' + url); return r; };
async function findItem(name, colours = []) {
  const j = await (await get(`${UQ}/products?q=${encodeURIComponent(name)}&limit=40&httpFailure=true`)).json();
  const items = (j.result?.items || []).filter(i => flat(i.name) === flat(name));
  // the listing that has the most of the colours we want, then men's / unisex (the women's cut of a basic is listed separately)
  const rank = i => (i.genderName === 'MEN' || i.genderName === 'UNISEX' ? 0 : i.genderName === 'WOMEN' ? 1 : 2);
  const hits = i => colours.filter(c => i.colors.some(x => x.name === c)).length;
  return items.sort((a, b) => hits(b) - hits(a) || rank(a) - rank(b))[0] || null;
}
async function photos(item, code) {
  const pid = item.productId.replace(/^E/, '').split('-')[0];
  const colourName = (item.colors.find(c => c.displayCode === code) || {}).name;
  // the colour's flat packshot, then every photo Uniqlo tags with that colour (main + on-model subs);
  // untagged subs are left out because they may show another colour
  const urls = [{ url: `https://image.uniqlo.com/UQ/ST3/WesternCommon/imagesgoods/${pid}/item/goods_${code}_${pid}.jpg` }];
  try {
    const im = (await (await get(`${UQ}/products/${item.productId}/price-groups/${item.priceGroup}/details?httpFailure=true`)).json()).result.images;
    const main = im.main?.[code];
    if (main) urls.push({ url: main.image, model: (main.model || []).length > 0 });
    for (const s of im.sub || []) if (s.colorCode === code) urls.push({ url: s.image, model: true });
  } catch {}
  // a white piece vanishes into the pale packshot backdrop: lead with it on the model instead
  if (WHITE.has(colourName) && urls.length > 1) urls.push(urls.shift());
  const shots = [];
  for (const u of urls) {
    if (shots.length >= 5) break;
    try {
      let buf = Buffer.from(await (await get(u.url)).arrayBuffer());
      const m = await sharp(buf).metadata();
      // the on-model shot carries the model's height in the lower right corner: crop it off
      if (u.model) buf = await sharp(buf).extract({ left: 0, top: 0, width: m.width, height: Math.round(m.height * 0.84) }).toBuffer();
      // collaboration logos and the "U" badge sit in the top-left corner: paint them over with the backdrop (sampled top right, never the model)
      const { data } = await sharp(buf).extract({ left: m.width - 4, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
      const patch = await sharp({ create: { width: Math.round(m.width * 0.3), height: Math.round(m.height * 0.11), channels: 3, background: { r: data[0], g: data[1], b: data[2] } } }).png().toBuffer();
      buf = await sharp(buf).composite([{ input: patch, left: 0, top: 0 }]).jpeg({ quality: 95 }).toBuffer();
      shots.push(await render(await analyse(buf)));
    } catch {}
  }
  return { shots, src: `https://www.uniqlo.com/us/en/products/${item.productId}` };
}
async function save(id, { shots, src }) {
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  const dir = join(UPLOADS, id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const v = Date.now().toString(36);
  const urls = shots.map((s, i) => { writeFileSync(join(dir, `${i + 1}.webp`), s.out); return `uploads/products/${id}/${i + 1}.webp?v=${v}`; });
  await dbm.db.run('UPDATE products SET photo=?, photos=?, photo_src=?, active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?', [urls[0], JSON.stringify(urls), src, id]);
}
const admin = async (path, body, method = 'POST') => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(path + ': ' + (j.error || r.status)); return j;
};

const cat = await (await fetch(API + '/api/catalog')).json();
const have = new Set(cat.products.filter(p => p.b === 'uniqlo').map(p => flat(p.en)));
const added = [], missing = [], over = [];
// --fix <id>=<Uniqlo name>|<COLOUR> …: tie an existing piece to the exact Uniqlo item; its name follows Uniqlo's
const FIX = process.argv.filter(a => a.includes('=') && a.includes('|')).map(a => { const i = a.indexOf('='), j = a.lastIndexOf('|'); return [a.slice(0, i), a.slice(i + 1, j), a.slice(j + 1)]; });
if (FIX.length) {
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  for (const [id, name, col] of FIX) {
    const p = await dbm.db.get('SELECT id, name_en, name_mn, line, variant FROM products WHERE id=?', [id]);
    const item = p && await findItem(name, [col]).catch(() => null);
    const code = item && new Map(item.colors.map(c => [c.name, c.displayCode])).get(col);
    if (!code) { missing.push('fix ' + id); continue; }
    const ph = await photos(item, code); if (!ph.shots.length) { missing.push('fix ' + id + ' (no photo)'); continue; }
    const model = item.name.replace(/\s*\|\s*/g, ' · ').replace(/®/g, ''), colour = title(col), mn = MN[col] || colour;
    await dbm.db.run('UPDATE products SET line=?, variant=?, name_en=?, name_mn=? WHERE id=?', [model, colour, model + ' — ' + colour, model + ' — ' + mn, id]);
    await save(id, ph); console.log('✓', id, '→', model, colour, ph.shots.length + ' photos');
  }
}
for (const [name, type, cny, colours] of FIX.length ? [] : PLAN) {
  const item = await findItem(name, colours).catch(() => null);
  if (!item) { missing.push(name); continue; }
  const byName = new Map(item.colors.map(c => [c.name, c.displayCode]));
  for (const col of colours) {
    const code = byName.get(col);
    if (!code) { missing.push(name + ' / ' + col); continue; }
    const colour = title(col);
    if (have.has(flat(item.name.replace(/®/g, '') + ' ' + colour))) continue;
    if (DRY) { console.log('ok', item.name, colour, code, item.genderName, '$' + item.prices.base.value); continue; }
    const ph = await photos(item, code);
    if (!ph.shots.length) { missing.push(name + ' / ' + col + ' (no photo)'); continue; }
    const p = await admin('/api/admin/products', { brand_slug: 'uniqlo', type, model: item.name.replace(/\s*\|\s*/g, ' · ').replace(/®/g, ''), colour, colour_mn: MN[col] || colour, cny, sizes: [] });
    await admin('/api/admin/products/' + encodeURIComponent(p.id), { price_source: 'official' }, 'PATCH');
    await save(p.id, ph);
    if (p.price_mnt >= 150000) over.push(p.id + ' ₮' + p.price_mnt);
    added.push(p.id); console.log('+', p.id, '₮' + p.price_mnt.toLocaleString(), ph.shots.length + ' photos');
  }
}
// existing Uniqlo pieces: swap the search photos for Uniqlo's own
let swapped = 0;
if (PHOTOS && !DRY) {
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  // pieces still on search photos, and official ones with fewer than 3 photos
  const rows = (await dbm.db.all("SELECT id, line, variant, photo_src, photos FROM products WHERE brand_slug='uniqlo'"))
    .filter(p => REDO || !String(p.photo_src || '').startsWith('https://www.uniqlo.com/') || JSON.parse(p.photos || '[]').length < 3);
  for (const p of rows) {
    const item = await findItem(p.line, [TO_UQ[flat(p.variant)] || String(p.variant).toUpperCase()]).catch(() => null); if (!item) { missing.push('existing ' + p.id); continue; }
    const code = new Map(item.colors.map(c => [c.name, c.displayCode])).get(TO_UQ[flat(p.variant)] || String(p.variant).toUpperCase());
    if (!code) { missing.push('existing ' + p.id + ' (colour)'); continue; }
    const ph = await photos(item, code); if (!ph.shots.length) { missing.push('existing ' + p.id + ' (no photo)'); continue; }
    await save(p.id, ph); swapped++; console.log('↻', p.id);
  }
}
try { await fetch(API + '/api/admin/reload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN } }); } catch {}
console.log(`\n${added.length} added, ${swapped} existing re-photographed.` + (over.length ? ' Over ₮150k: ' + over.join(', ') : '') + (missing.length ? '\nNot at Uniqlo: ' + missing.join('; ') : ''));
process.exit(0);
