// LEVERA — end-to-end check of gift cards and member ranks against a running server. Removes what it creates.
//   node tools/rewards-test.mjs
import { readFileSync } from 'node:fs';
const API = 'http://localhost:8787', TOKEN = readFileSync(new URL('../data/admin-token.txt', import.meta.url), 'utf8').trim();
let cookie = '', fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const call = async (p, b, m = 'POST', admin) => {
  const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: 'Bearer ' + TOKEN } : {}), ...(cookie ? { cookie } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const c = r.headers.get('set-cookie'); if (c) cookie = c.split(';')[0];
  return { s: r.status, j: await r.json().catch(() => ({})) };
};
const dbm = await import('../server/db.mjs'); await dbm.ready; const db = dbm.db;
const phone = '88' + String(Date.now()).slice(-6), orders = [];
const item = (await db.get("SELECT id, price_mnt p FROM products WHERE active=1 AND brand_slug='uniqlo' AND price_mnt BETWEEN 60000 AND 110000 AND discount_pct=0 AND (sizes='[]' OR sizes LIKE '%\"M\"%') LIMIT 1"));
const order = (extra = {}) => call('/api/orders', { name: 'Тест Rewards', phone, address: 'Test address 12', ack: true, items: [{ id: item.id, size: 'M', qty: 1 }], ...extra });
try {
  let r;
  if (!process.argv.includes('--ranks')) {
  // a card is worth nothing until paid
  r = await call('/api/giftcards', { amount: 5000, name: 'Тест', phone }); ok(r.s === 400, 'amount below ₮10,000 refused');
  r = await call('/api/giftcards', { amount: 15000, name: 'Тест', phone }); ok(r.s === 400, 'amount not a multiple of ₮10,000 refused');
  r = await call('/api/giftcards', { amount: 50000, name: 'Тест', phone }); ok(r.s === 200, 'gift card order created'); const no = r.j.order.no; orders.push(no);
  r = await call('/api/giftcards/code', { no, phone }); ok(r.j.paid === false && !r.j.code, 'no code before payment');
  r = await call('/api/giftcards/code', { no, phone: '99999999' }); ok(r.s === 404, 'wrong phone gets nothing');
  r = await call('/api/admin/orders/' + no, { payment: 'paid' }, 'PATCH', true); ok(r.s === 200, 'admin marks paid');
  r = await call('/api/giftcards/code', { no, phone }); const code = r.j.code; ok(/^LV-/.test(code || '') && r.j.balance === 50000, 'code released, balance ₮50,000');
  // spending
  r = await call('/api/checkout/quote', { items: [{ id: item.id, qty: 1 }], gift_code: 'LV-FAKE-FAKE-FAKE' }); ok(r.j.gift_ok === false && r.j.gift_used === 0, 'fake code gives nothing');
  r = await order({ gift_code: 'LV-FAKE-FAKE-FAKE' }); ok(r.s === 400, 'order with fake code refused');
  r = await order({ gift_code: code }); ok(r.s === 200 && r.j.order.gift_used === 50000 && r.j.order.total === item.p - 50000, `card pays ₮50,000 of ₮${item.p}, rest ₮${r.j.order?.total}`); const o1 = r.j.order?.no; orders.push(o1);
  r = await order({ gift_code: code }); ok(r.j.order?.gift_used === 0 || r.s === 400, 'empty card pays nothing again'); if (r.j.order) orders.push(r.j.order.no);
  r = await call('/api/admin/orders/' + o1, { status: 'cancelled' }, 'PATCH', true); ok((await db.get('SELECT balance b FROM gift_cards WHERE code=?', [code])).b === 50000, 'cancelling gives the balance back');
  // two orders at once can't both spend the same balance
  const both = await Promise.all([order({ gift_code: code }), order({ gift_code: code })]);
  both.forEach(x => x.j.order && orders.push(x.j.order.no));
  const spent = both.reduce((a, x) => a + (x.j.order?.gift_used || 0), 0); ok(spent <= 50000, `two orders at once spent ₮${spent}, not more than the balance`);
  ok((await db.get('SELECT balance b FROM gift_cards WHERE code=?', [code])).b >= 0, 'balance never below zero');
  }
  // ranks
  r = await call('/api/account/register', { name: 'Тест Rewards', phone, password: 'test-pass-123' }); ok(r.s === 200, 'customer registered');
  r = await call('/api/account/rank', null, 'GET'); ok(r.j.rank === null && r.j.next?.key === 'bronze', 'new customer has no rank yet');
  r = await order(); ok(r.j.order?.rank_off === 0, 'no discount before a paid order'); const o2 = r.j.order.no; orders.push(o2);
  await call('/api/admin/orders/' + o2, { payment: 'paid' }, 'PATCH', true);
  r = await call('/api/account/rank', null, 'GET'); ok(r.j.rank?.key === 'bronze', 'paid order → Bronze');
  r = await order(); ok(r.j.order?.rank_off > 0 && r.j.order.total === item.p - r.j.order.rank_off, `Bronze takes ₮${r.j.order?.rank_off} off`); orders.push(r.j.order.no);
  await db.run('UPDATE orders SET subtotal=5000000 WHERE no=?', [o2]);
  r = await call('/api/account/rank', null, 'GET'); ok(r.j.rank?.key === 'gold', '₮5,000,000 spent → Gold');
} finally {
  const cid = (await db.get('SELECT id FROM customers WHERE phone=?', [phone]))?.id;
  for (const n of orders) { await db.run('DELETE FROM gift_cards WHERE order_no=?', [n]); await db.run('DELETE FROM orders WHERE no=?', [n]); }
  await db.run("DELETE FROM orders WHERE phone=? AND name='Тест Rewards'", [phone]);
  if (cid) { await db.run('DELETE FROM sessions WHERE customer_id=?', [cid]); await db.run('DELETE FROM customers WHERE id=?', [cid]); }
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
