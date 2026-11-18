// LEVERA — everyday pieces under ₮150,000 from the sportswear houses, added once through the admin API.
//   node tools/add-affordable.mjs   (server running)   → prints the ids for tools/fetch-photos.mjs --ids
// Uniqlo has its own tool with Uniqlo's photos: tools/uniqlo-official.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
const API = process.env.API || 'http://localhost:8787';
const TOKEN = process.env.ADMIN_TOKEN || readFileSync(new URL('../data/admin-token.txt', import.meta.url), 'utf8').trim();
const MN = { Black: 'Хар', White: 'Цагаан', Grey: 'Саарал', Navy: 'Хар хөх', Beige: 'Шаргал', Red: 'Улаан' };
// [brand, model, type, Dewu ¥, colours]
const PLAN = [
  ['nike', 'Sportswear Club T-Shirt', 'tee', 179, ['Black', 'White', 'Grey']],
  ['nike', 'Sportswear Swoosh T-Shirt', 'tee', 199, ['Black', 'White']],
  ['nike', 'Club Unstructured Futura Wash Cap', 'cap', 149, ['Black', 'White', 'Navy']],
  ['nike', 'Peak Futura Beanie', 'beanie', 129, ['Black', 'Grey']],
  ['adidas', 'Adicolor Classics Trefoil Tee', 'tee', 199, ['Black', 'White']],
  ['adidas', 'Essentials Single Jersey Big Logo Tee', 'tee', 159, ['Black', 'White']],
  ['adidas', 'Trefoil Baseball Cap', 'cap', 149, ['Black', 'White']],
  ['adidas', 'Adicolor Cuff Beanie', 'beanie', 119, ['Black', 'Red']],
  ['new-balance', 'Sport Essentials Logo Hoodie', 'hoodie', 199, ['Black', 'Grey']],
  ['converse', 'Chuck Taylor Patch Beanie', 'beanie', 119, ['Black']],
  ['converse', 'Go-To Chuck Taylor Patch Tee', 'tee', 159, ['Black', 'White']]
];
const call = async (path, body, method = 'POST') => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(path + ': ' + (j.error || r.status)); return j;
};
const cat = await (await fetch(API + '/api/catalog')).json();
const have = new Set(cat.products.map(p => p.b + '|' + p.en));
const ids = [];
for (const [brand, model, type, cny, colours] of PLAN) for (const colour of colours) {
  if (have.has(brand + '|' + model + ' — ' + colour)) continue;
  const p = await call('/api/admin/products', { brand_slug: brand, type, model, colour, colour_mn: MN[colour] || colour, cny, sizes: [] });
  ids.push(p.id); console.log(p.id, '₮' + p.price_mnt.toLocaleString());
}
writeFileSync(new URL('../data/new-affordable.json', import.meta.url), JSON.stringify(ids));
console.log('\n' + ids.length + ' added → data/new-affordable.json. Photos: node tools/fetch-photos.mjs --ids data/new-affordable.json --concurrency 1');
process.exit(0);
