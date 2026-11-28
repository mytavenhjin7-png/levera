// LEVERA — browser smoke test: product page, sizes, bag, search, checkout, order tracking, admin edits.
// Start the server first (npm start), then: npm test   (creates a test order — set it to Cancelled in admin)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const base = process.env.BASE || 'http://localhost:8787', out = process.argv[2] || (await import('node:os')).tmpdir();
const token = readFileSync('data/admin-token.txt', 'utf8').trim();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const step = async (name, fn) => { try { await fn(); console.log('✓', name); } catch (e) { console.log('✗', name, e.message.split('\n')[0]); await p.screenshot({ path: `${out}/fail-${name.replace(/\W+/g, '_')}.png` }); } };

await step('product page + size + add', async () => {
  await p.goto(base + '/product.html?id=nike-kobe-6-protro-grinch', { waitUntil: 'networkidle' });
  await p.click('#pAdd'); await p.waitForSelector('#szErr:not([hidden])');
  await p.click('[data-sz="42"]'); await p.click('#pAdd');
  await p.waitForFunction(() => document.querySelector('#bagCount').textContent === '1');
});
await step('quick add one-size from shop', async () => {
  await p.goto(base + '/shop.html?brand=jean-paul-gaultier&cat=fragrance', { waitUntil: 'networkidle' });
  const c = p.locator('.card').first(); await c.hover(); await c.locator('.quick').click();
  await p.waitForFunction(() => document.querySelector('#bagCount').textContent === '2');
});
await step('shop filters count', async () => {
  await p.goto(base + '/shop.html?cat=footwear&price=2', { waitUntil: 'networkidle' });
  const t = await p.textContent('#count'); if (!/\d/.test(t)) throw new Error('count ' + t);
  console.log('   footwear 500k–1.5M:', t);
});
await step('search overlay', async () => {
  await p.keyboard.press('Control+k'); await p.fill('#sInput', 'moncler maya');
  await p.waitForFunction(() => document.querySelectorAll('#sResults .s-card').length > 0);
  console.log('   ', await p.textContent('#sCount')); await p.keyboard.press('Escape');
});
let orderNo = '';
await step('checkout + order', async () => {
  await p.goto(base + '/checkout.html', { waitUntil: 'networkidle' });
  await p.fill('#coName', 'Туршилт Бат'); await p.fill('#coPhone', '99112233'); await p.fill('#coAddress', 'ХУД, 15-р хороо, 101 байр, 2 орц, 34 тоот');
  await p.screenshot({ path: `${out}/checkout.png`, fullPage: false });
  await p.click('#coSubmit'); await p.waitForSelector('#coDone:not([hidden]) .cd-pay', { timeout: 10000 });
  orderNo = (await p.textContent('.cd-head h1')).match(/LV-\d\d-\d{4}/)[0];
  await p.screenshot({ path: `${out}/done.png` }); console.log('   order', orderNo);
});
await step('track order in footer', async () => {
  await p.goto(base + '/index.html?order=' + orderNo + '#track', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => /LV-/.test(document.querySelector('#trNote').textContent));
  console.log('   ', await p.textContent('#trNote'));
});
await step('admin login + mark paid + status', async () => {
  await p.goto(base + '/admin.html#orders', { waitUntil: 'networkidle' });
  await p.fill('#tk', token); await p.click('#lf button');
  await p.waitForSelector('.order'); await p.click('.order summary b');
  await p.click('[data-paid]'); await p.waitForTimeout(500);
  await p.selectOption('.order [data-status]', 'ereen'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/admin-orders.png` });
});
await step('tracker shows Ereen', async () => {
  const r = await (await fetch(base + '/api/orders/' + orderNo)).json();
  if (r.status !== 'ereen' || r.payment !== 'paid') throw new Error(JSON.stringify(r).slice(0, 200));
});
await step('admin product edit reprices', async () => {
  await p.goto(base + '/admin.html#products', { waitUntil: 'networkidle' });
  // remember the real values so the test leaves the catalogue exactly as it found it
  const before = (await (await fetch(base + '/api/admin/products?q=kobe-6-protro-grinch', { headers: { Authorization: 'Bearer ' + token } })).json()).rows.find(x => x.id === 'nike-kobe-6-protro-grinch');
  await p.fill('#pq', 'kobe-6-protro-grinch'); await p.waitForTimeout(800);
  const row = p.locator('tr[data-id="nike-kobe-6-protro-grinch"]');
  await row.locator('[data-k="cny"]').fill('3399'); await row.locator('[data-save]').click(); await p.waitForTimeout(600);
  const r = await (await fetch(base + '/api/products/nike-kobe-6-protro-grinch')).json();
  console.log('   new price', r.product.price, r.product.src);
  // put the catalogue back the way it was
  await fetch(base + '/api/admin/products/nike-kobe-6-protro-grinch', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ cny: before.cny, price_source: before.price_source }) });
  await p.screenshot({ path: `${out}/admin-products.png` });
});
await step('admin settings', async () => { await p.goto(base + '/admin.html#settings', { waitUntil: 'networkidle' }); await p.click('#calc'); await p.waitForTimeout(500); console.log('   ', await p.textContent('#cOut')); await p.screenshot({ path: `${out}/admin-settings.png` }); });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await b.close();
