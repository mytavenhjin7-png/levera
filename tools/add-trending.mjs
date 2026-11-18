// LEVERA — the 2026 pieces people ask for, added once through the admin API with Nike's own photos.
//   node tools/add-trending.mjs   (server running)
// Each line: [model, type, Dewu ¥, colour (EN), colour (MN), Nike style-colour code]. Photos: tools/nike-official.mjs.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const API = process.env.API || 'http://localhost:8787';
const TOKEN = process.env.ADMIN_TOKEN || readFileSync(new URL('../data/admin-token.txt', import.meta.url), 'utf8').trim();
const PLAN = [
  ['Air Max Dn8', 'sneaker', 899, 'Light Bone', 'Цайвар яс', 'IO7846-002'],
  ['Air Max Dn8', 'sneaker', 899, 'Summit White Black', 'Цагаан хар', 'IO7846-100'],
  ['Shox TL', 'sneaker', 899, 'Black Metallic Cool Grey', 'Хар мөнгөлөг', 'IQ0299-010'],
  ['Shox TL', 'sneaker', 899, 'Light Silver', 'Цайвар мөнгөлөг', 'IM4687-002'],
  ['V2K Run', 'runner', 599, 'Pure Platinum', 'Цайвар саарал', 'FD0736-003'],
  ['V2K Run', 'runner', 599, 'Summit White', 'Цагаан', 'FD0736-100'],
  ['Air Jordan 1 Low', 'sneaker', 599, 'White Black', 'Цагаан хар', 'DC0774-101'],
  ['Air Jordan 1 Low', 'sneaker', 599, 'Palomino', 'Паломино', '553558-200'],
  ['Cortez Leather', 'sneaker', 459, 'White Black', 'Цагаан хар', 'DM4044-105'],
  ['Cortez Leather', 'sneaker', 459, 'Black White', 'Хар цагаан', 'DM4044-001'],
  ['Ja 4', 'sneaker', 799, 'Zombie', 'Zombie', 'IO7939-300'],
  ['Ja 4', 'sneaker', 799, 'Black Cobalt Bliss', 'Хар цэнхэр', 'IM4135-001'],
  ['Sabrina 3', 'sneaker', 599, 'Wolf Grey Perfect Pink', 'Саарал ягаан', 'II5172-001'],
  ['Sabrina 3', 'sneaker', 599, 'University Red', 'Улаан', 'II5172-600'],
  ['Tech Fleece Joggers', 'sweatpants', 599, 'Dark Grey Heather', 'Бараан саарал', 'HV0959-063'],
  ['Tech Fleece Joggers', 'sweatpants', 599, 'Black', 'Хар', 'HV0959-010'],
  ['Zoom Vomero 5', 'runner', 799, 'Grey Fog', 'Саарал манан', 'IM3486-002'],
  ['Kobe 3 Low Protro', 'sneaker', 1599, 'Mamba Eterno', 'Mamba Eterno', 'IO6260-800'],
  ['Air Jordan 4 Retro', 'sneaker', 1499, 'Tour Yellow', 'Tour Yellow', 'IO2463-102']
];
const call = async (path, body, method = 'POST') => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(path + ': ' + (j.error || r.status)); return j;
};
const cat = await (await fetch(API + '/api/catalog')).json();
const have = new Set(cat.products.map(p => p.b + '|' + p.en));
const pairs = [];
for (const [model, type, cny, colour, mn, code] of PLAN) {
  if (have.has('nike|' + model + ' — ' + colour)) continue;
  const p = await call('/api/admin/products', { brand_slug: 'nike', type, model, colour, colour_mn: mn, cny, sizes: [] });
  await call('/api/admin/products/' + encodeURIComponent(p.id), { active: false }, 'PATCH');   // shown once its photos are in
  pairs.push(p.id + '=' + code); console.log('+', p.id, '₮' + p.price_mnt.toLocaleString());
}
if (pairs.length) execFileSync(process.execPath, [new URL('./nike-official.mjs', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), ...pairs], { stdio: 'inherit' });
process.exit(0);
