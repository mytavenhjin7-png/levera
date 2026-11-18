// LEVERA — adds the niche fragrance houses in tools/fragrance-retail.mjs (NICHE) through the admin API, once.
//   node tools/add-niche.mjs   (server running on :8787)   → prints the new ids for tools/fetch-photos.mjs --ids
import { readFileSync } from 'node:fs';
import { NICHE } from './fragrance-retail.mjs';
const API = process.env.API || 'http://localhost:8787';
const TOKEN = process.env.ADMIN_TOKEN || readFileSync(new URL('../data/admin-token.txt', import.meta.url), 'utf8').trim();
const call = async (path, opts = {}) => {
  const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN } });
  const j = await r.json(); if (!r.ok) throw new Error(path + ': ' + (j.error || r.status)); return j;
};
const cat = await (await fetch(API + '/api/catalog')).json();
const have = new Set(cat.products.map(p => p.b + '|' + p.en));
const ids = [];
for (const h of NICHE) {
  let slug = cat.brands.find(b => b.name === h.name)?.slug;
  for (const [model, sizes] of h.lines) for (const [size, [cny, usd]] of Object.entries(sizes)) {
    if (slug && have.has(slug + '|' + model + ', ' + size)) continue;
    const body = { type: 'perfume', model, colour: size, colour_mn: size, cny, retail_usd: usd, weight_kg: 0.6, sizes: [] };
    if (slug) body.brand_slug = slug; else body.new_brand = { name: h.name, city_en: h.city_en, city_mn: h.city_mn, tier: 'luxury' };
    const p = await call('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
    slug = p.brand_slug; ids.push(p.id);
    await call('/api/admin/products/' + encodeURIComponent(p.id), { method: 'PATCH', body: JSON.stringify({ price_source: 'official' }) });
    console.log(p.id, '₮' + p.price_mnt.toLocaleString());
  }
}
console.log('\n' + ids.length + ' added. Photos: node tools/fetch-photos.mjs --ids ' + ids.join(','));
