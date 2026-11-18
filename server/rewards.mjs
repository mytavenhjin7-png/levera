// LEVERA — member ranks and gift cards. Everything that touches money is worked out here on the server:
// the rank discount from the customer's own paid orders, the gift-card balance from the database.
import { randomBytes } from 'node:crypto';

// by money spent on paid, not-cancelled goods orders; pct comes off the next orders
export const RANKS = [
  { key: 'bronze', mn: 'Хүрэл', en: 'Bronze', from: 1, pct: 1 },
  { key: 'silver', mn: 'Мөнгө', en: 'Silver', from: 2000000, pct: 2 },
  { key: 'gold', mn: 'Алт', en: 'Gold', from: 5000000, pct: 3 }
];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';     // no 0/O or 1/I to misread
const newCode = () => { const b = randomBytes(12); let s = ''; for (let i = 0; i < 12; i++) s += CODE_CHARS[b[i] % CODE_CHARS.length]; return 'LV-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); };
export const cleanCode = c => String(c || '').toUpperCase().replace(/\s+/g, '').slice(0, 24);

export function rewards({ db }) {
  async function rankOf(customerId) {
    const spent = customerId ? Number((await db.get("SELECT COALESCE(SUM(subtotal),0) s FROM orders WHERE customer_id=? AND payment='paid' AND status<>'cancelled' AND kind='goods'", [customerId])).s) : 0;
    const rank = [...RANKS].reverse().find(r => spent >= r.from) || null;
    const next = RANKS.find(r => spent < r.from) || null;
    return { spent, rank, next, to_next: next ? next.from - spent : 0 };
  }
  // what an order costs: rank discount first, then the gift card pays what it can
  async function quote(subtotal, customerId, code) {
    const r = await rankOf(customerId);
    const rank_off = r.rank ? Math.round(subtotal * r.rank.pct / 100 / 100) * 100 : 0;
    const after = subtotal - rank_off;
    let gift_used = 0, gift_balance = null;
    if (code) {
      const c = await db.get("SELECT balance FROM gift_cards WHERE code=? AND status='active'", [code]);
      if (c) { gift_balance = c.balance; gift_used = Math.min(c.balance, after); }
    }
    return { subtotal, rank: r.rank ? { key: r.rank.key, pct: r.rank.pct } : null, rank_off, gift_used, gift_balance, total: after - gift_used };
  }
  // takes the amount only if it is still there, in one statement: two orders can't spend the same balance
  async function spend(code, amount) {
    const r = await db.run("UPDATE gift_cards SET balance=balance-? WHERE code=? AND status='active' AND balance>=?", [amount, code, amount]);
    return r.changes > 0;
  }
  const refund = (code, amount) => db.run('UPDATE gift_cards SET balance=balance+? WHERE code=?', [amount, code]);
  async function create(amount, phone, orderNo) {
    const code = newCode();
    await db.run("INSERT INTO gift_cards(code,amount,balance,status,buyer_phone,order_no) VALUES(?,?,?,'pending',?,?)", [code, amount, amount, phone, orderNo]);
    return code;
  }
  const activate = orderNo => db.run("UPDATE gift_cards SET status='active', paid_at=CURRENT_TIMESTAMP WHERE order_no=? AND status='pending'", [orderNo]);
  const voidCard = orderNo => db.run("UPDATE gift_cards SET status='void' WHERE order_no=?", [orderNo]);
  const byOrder = orderNo => db.get('SELECT code, amount, balance, status FROM gift_cards WHERE order_no=?', [orderNo]);
  return { rankOf, quote, spend, refund, create, activate, voidCard, byOrder };
}
