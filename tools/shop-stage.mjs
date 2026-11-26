// LEVERA — add a brand's products from its official Shopify store with the store's own photos, reviewed first.
//   node tools/shop-stage.mjs stage  <products.json> <out-dir> <brand-slug> [title-regex]
//       styles up to 8 candidate photos per colourway into <out-dir>/<slug>/ (1.webp…) + meta.json, for a contact sheet
//   node tools/shop-stage.mjs commit <out-dir>     (server running)
//       adds every colourway listed in <out-dir>/picks.json { "<slug>": [1,2,4,5,6] } with those 5 photos, in that order
// <products.json> is a saved https://<store>/products.json (all pages). Prices: store US$ × 8.2 ≈ China retail ¥.
import { analyse, render } from './photo-style.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API || 'http://localhost:8787';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ham = (a, b) => a.reduce((s, v, i) => s + (v !== b[i]), 0);
const title = s => s.replace(/\s+/g, ' ').replace(/^(men's|women's|mens|womens)\s+/i, '').trim();

// product type from the store's category and the title
function typeOf(p) {
  const t = (p.product_type + ' ' + p.title).toLowerCase();
  if (/slide|mule/.test(t)) return 'slide';
  if (/running|race day|trail/.test(t)) return 'runner';
  if (/\bboots?\b/.test(t)) return 'boot';
  if (/shoe|sneaker|footwear|basketball|tennis|lifestyle/.test(t) &&!/tee|shirt|hoodie|pants|jacket/.test(t)) return 'sneaker';
  if (/down jacket|puffer/.test(t)) return 'puffer';
  if (/down vest/.test(t)) return 'puffer';
  if (/zip hoodie|zip top|track top/.test(t)) return 'zip';
  if (/hoodie/.test(t)) return 'hoodie';
  if (/sweatshirt|crew/.test(t)) return 'crew';
  if (/polo shirts?/.test(p.product_type.toLowerCase())) return 'polo';
  if (/jumper|knit|cardigan/.test(t)) return 'knit';
  if (/overshirt/.test(t) || /^shirts?$/.test(p.product_type.toLowerCase())) return 'shirt';
  if (/long-sleeve|long sleeve/.test(t)) return 'longsleeve';
  if (/tee|t-shirt|tank/.test(t)) return 'tee';
  if (/jacket/.test(t)) return 'jacket';
  if (/sweatpants|track pants|jogger/.test(t)) return 'sweatpants';
  if (/shorts|half pants/.test(t)) return 'shorts';
  if (/pants|trousers/.test(t)) return 'pants';
  if (/backpack/.test(t)) return 'backpack';
  if (/cap|hat/.test(t)) return 'cap';
  return null;
}

const [mode, a1, a2, a3, a4] = process.argv.slice(2);

if (mode === 'stage') {
  const [file, outDir, brand, re] = [a1, a2, a3, a4 ? new RegExp(a4, 'i') : null];
  const list = JSON.parse(readFileSync(file, 'utf8')).products.filter(p => (!re || re.test(p.title)) && !/kids|mismatch|socks|ball\b|basketball$|gift|bundle|sample|\b(gs|ps|td)\b|toddler|infant|baby/i.test(p.title)
    && (!process.env.VENDOR || new RegExp(process.env.VENDOR, 'i').test(p.vendor || ''))).slice(+process.env.SKIP || 0, (+process.env.SKIP || 0) + (+process.env.LIMIT || 9999));   // VENDOR=<regex> for multi-brand stores, SKIP=<n> LIMIT=<n>
  mkdirSync(outDir, { recursive: true }); let n = 0;
  for (const p of list) {
    const type = typeOf(p); if (!type) continue;
    const ci = p.options.findIndex(o => /colou?r/i.test(o.name));
    const colours = ci >= 0 ? p.options[ci].values : [null];
    // images of each colourway: the image tied to a variant of that colour, then the untied images after it
    const groups = new Map(colours.map(c => [c, []])); let cur = colours.length === 1 ? colours[0] : undefined;
    for (const i of p.images) {
      const v = p.variants.find(v => (i.variant_ids || []).includes(v.id));
      if (v && ci >= 0) cur = v['option' + (ci + 1)];
      if (cur !== undefined && groups.has(cur)) groups.get(cur).push(i);
    }
    for (const [c, imgs] of groups) {
      // 'Model "Colour"' or (multi-brand stores) 'Brand Model - Colour'
      const tt = p.vendor && title(p.title).toLowerCase().startsWith(p.vendor.toLowerCase() + ' ') ? title(p.title).slice(p.vendor.length + 1) : title(p.title);
      const m = /^(.*?)\s*["“](.+?)["”]\s*$/.exec(tt) || /^(.+?)\s+-\s+(.+)$/.exec(tt);
      let line = m ? m[1] : tt.replace(/\s+[A-Z]{3,}\w*-\d+$/, ''), colour = m ? m[2] : c;
      if (!colour) continue;                                   // a colour must be known for the name
      if (imgs.length < 5) continue;
      const usd = +(p.variants.find(v => ci < 0 || v['option' + (ci + 1)] === c) || p.variants[0]).price;
      const shots = [];
      for (const i of imgs) {
        if (shots.length >= 8) break;
        try {
          let r; for (let t = 0; t < 3 && !(r && r.ok); t++) { try { r = await fetch(i.src.split('?')[0] + '?width=1600', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) }); } catch { await new Promise(w => setTimeout(w, 3000)); } }   // slow CDNs: try again
          if (!r || !r.ok) continue;
          const an = await analyse(Buffer.from(await r.arrayBuffer()));
          const shoe = ['sneaker', 'runner', 'slide'].includes(type);
          const s = await render(an, { footwear: shoe && !shots.length, flip: shoe && !shots.length && an.facesRight === false });
          if (shots.some(x => ham(x.hash, s.hash) < (process.env.HAM ? +process.env.HAM : 5))) continue;   // only the same picture twice
          shots.push(s);
        } catch {}
      }
      if (shots.length < 5) continue;
      const d = join(outDir, slug(line + '-' + colour)); rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true });
      shots.forEach((s, k) => writeFileSync(join(d, `${k + 1}.webp`), s.out));
      writeFileSync(join(d, 'meta.json'), JSON.stringify({ brand, line, colour, type, usd, cny: Math.round(usd * (+process.env.FX || 8.2)), src: 'https://' + new URL(p.images[0].src).host.replace('cdn.shopify.com', '') + '/products/' + p.handle, handle: p.handle }));
      n++; console.log(shots.length, type, line, '—', colour, '$' + usd);
    }
  }
  console.log(`\n${n} colourways staged.`); process.exit(0);
}

if (mode === 'commit') {
  const outDir = a1, store = a2 || '';
  const TOKEN = process.env.ADMIN_TOKEN || readFileSync(join(ROOT, 'data', 'admin-token.txt'), 'utf8').trim();
  const call = async (path, body) => { const r = await fetch(API + path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN } }); const j = await r.json(); if (!r.ok) throw new Error(path + ' ' + JSON.stringify(j)); return j; };
  const dbm = await import('../server/db.mjs'); await dbm.ready;
  const picks = JSON.parse(readFileSync(join(outDir, 'picks.json'), 'utf8')); let n = 0;
  for (const [d, pick] of Object.entries(picks)) {
    const dir = join(outDir, d), meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    if (pick.length !== 5) throw new Error(d + ': pick 5 photos');
    // already in the shop: same line + colour, or the same id under another spelling (GEL-1130 / Gel-1130)
    if (await dbm.db.get('SELECT 1 FROM products WHERE (brand_slug=? AND line=? AND variant=?) OR id=?', [meta.brand, meta.line, meta.colour, slug(meta.brand + ' ' + meta.line + ' ' + meta.colour)])) { console.log('= have', d); continue; }
    const p = await call('/api/admin/products', { brand_slug: meta.brand, type: meta.type, model: meta.line, colour: meta.colour, colour_mn: meta.colour, cny: meta.cny, sizes: [] });
    const up = join(ROOT, 'uploads', 'products', p.id); rmSync(up, { recursive: true, force: true }); mkdirSync(up, { recursive: true });
    const ver = Date.now().toString(36);
    const urls = pick.map((f, k) => { copyFileSync(join(dir, f + '.webp'), join(up, `${k + 1}.webp`)); return `uploads/products/${p.id}/${k + 1}.webp?v=${ver}`; });
    await dbm.db.run("UPDATE products SET photo=?, photos=?, photo_src=?, price_source='estimate' WHERE id=?", [urls[0], JSON.stringify(urls), (store || '') + '/products/' + meta.handle, p.id]);
    n++; console.log('+', p.id, '₮' + p.price_mnt.toLocaleString());
  }
  await fetch(API + '/api/admin/reload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN } }).catch(() => {});
  console.log(`\n${n} added.`); process.exit(0);
}
console.log('usage: stage <products.json> <out-dir> <brand> [regex] | commit <out-dir> [https://store]');
