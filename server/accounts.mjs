// LEVERA — customer accounts: sign up / sign in with phone + password, profile and default address,
// order history, saved pieces kept across devices.
// Passwords: scrypt with a per-user salt (never stored as text). Sign-in: a random session id in an HttpOnly cookie
// (lv_sess, 60 days) that page scripts can't read. Phone numbers are not verified by SMS, so past orders are NOT
// linked by phone — only orders placed while signed in belong to an account.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE = '__session', DAYS = 60;   // Firebase Hosting passes only a cookie named __session on to the server
const hashPassword = pw => { const salt = randomBytes(16).toString('base64url'); return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString('base64url')}`; };
function checkPassword(pw, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const a = scryptSync(pw, salt, 64), b = Buffer.from(hash, 'base64url');
  return a.length === b.length && timingSafeEqual(a, b);
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
const sqlTime = d => d.toISOString().slice(0, 19).replace('T', ' ');

export function accounts({ route, db, readJSON, HttpError, str, limited, publicOrder }) {
  const secure = /^https:/.test(process.env.PUBLIC_URL || '');
  const setCookie = (res, value, maxAge) => res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
  const cleanPhone = v => str(v, 20).replace(/[^\d+]/g, '');
  const pub = c => ({ id: c.id, name: c.name, phone: c.phone, address: c.address || '', district: c.district || '' });

  // the signed-in customer for a request, or null
  async function customer(req) {
    const t = cookies(req)[COOKIE];
    if (!t || !/^[\w-]{30,64}$/.test(t)) return null;
    const s = await db.get('SELECT customer_id, expires_at FROM sessions WHERE token=?', [t]);
    if (!s || new Date(String(s.expires_at).replace(' ', 'T') + 'Z') < new Date()) return null;
    return (await db.get('SELECT * FROM customers WHERE id=?', [s.customer_id])) || null;
  }
  async function signIn(res, c) {
    const token = randomBytes(32).toString('base64url');
    await db.run('INSERT INTO sessions(token, customer_id, expires_at) VALUES(?,?,?)', [token, c.id, sqlTime(new Date(Date.now() + DAYS * 864e5))]);
    await db.run('UPDATE customers SET last_login=CURRENT_TIMESTAMP WHERE id=?', [c.id]);
    setCookie(res, token, DAYS * 86400);
  }
  const savedOf = c => { try { return JSON.parse(c.saved || '[]'); } catch { return []; } };

  route('POST', '/api/account/register', async (req, res) => {
    if (limited(req, 'reg', 5, 60 * 60 * 1000)) throw new HttpError(429, 'too many sign-ups, try again later');
    const b = await readJSON(req);
    const name = str(b.name, 80), phone = cleanPhone(b.phone), pw = String(b.password || '');
    if (!name || !/^\+?\d{8,12}$/.test(phone)) throw new HttpError(400, 'name and an 8-digit phone number are required');
    if (pw.length < 8 || pw.length > 200) throw new HttpError(400, 'password must be at least 8 characters');
    if (await db.get('SELECT 1 FROM customers WHERE phone=?', [phone])) throw new HttpError(409, 'this phone number already has an account');
    const r = await db.run('INSERT INTO customers(phone, name, pass_hash, saved) VALUES(?,?,?,?)', [phone, name, hashPassword(pw), JSON.stringify(Array.isArray(b.saved) ? b.saved.slice(0, 300).map(x => str(x, 160)) : [])]);
    const c = await db.get('SELECT * FROM customers WHERE id=?', [r.insertId]);
    await signIn(res, c);
    return { customer: pub(c), saved: savedOf(c) };
  });

  route('POST', '/api/account/login', async (req, res) => {
    if (limited(req, 'login', 10, 15 * 60 * 1000)) throw new HttpError(429, 'too many attempts, wait 15 minutes');
    const b = await readJSON(req);
    const c = await db.get('SELECT * FROM customers WHERE phone=?', [cleanPhone(b.phone)]);
    // same answer for unknown phone and wrong password
    if (!c || !checkPassword(String(b.password || ''), c.pass_hash)) throw new HttpError(401, 'wrong phone number or password');
    // pieces saved on this device before signing in join the account's list
    const merged = [...new Set([...savedOf(c), ...(Array.isArray(b.saved) ? b.saved.map(x => str(x, 160)) : [])])].slice(0, 300);
    await db.run('UPDATE customers SET saved=? WHERE id=?', [JSON.stringify(merged), c.id]);
    await signIn(res, c);
    return { customer: pub(c), saved: merged };
  });

  route('POST', '/api/account/logout', async (req, res) => {
    const t = cookies(req)[COOKIE];
    if (t) await db.run('DELETE FROM sessions WHERE token=?', [t]);
    setCookie(res, '', 0);
    return { ok: true };
  });

  route('GET', '/api/account/me', async req => {
    const c = await customer(req);
    return c ? { customer: pub(c), saved: savedOf(c) } : { customer: null };
  });

  route('PATCH', '/api/account/me', async req => {
    const c = await customer(req); if (!c) throw new HttpError(401, 'sign in first');
    const b = await readJSON(req), sets = [], args = [];
    if ('name' in b) { const v = str(b.name, 80); if (!v) throw new HttpError(400, 'name required'); sets.push('name=?'); args.push(v); }
    if ('address' in b) { sets.push('address=?'); args.push(str(b.address, 400) || null); }
    if ('district' in b) { sets.push('district=?'); args.push(str(b.district, 60) || null); }
    if (b.new_password) {
      if (!checkPassword(String(b.password || ''), c.pass_hash)) throw new HttpError(400, 'current password is wrong');
      if (String(b.new_password).length < 8) throw new HttpError(400, 'password must be at least 8 characters');
      sets.push('pass_hash=?'); args.push(hashPassword(String(b.new_password)));
    }
    if (sets.length) await db.run(`UPDATE customers SET ${sets.join(', ')} WHERE id=?`, [...args, c.id]);
    return { customer: pub(await db.get('SELECT * FROM customers WHERE id=?', [c.id])) };
  });

  route('PUT', '/api/account/saved', async req => {
    const c = await customer(req); if (!c) throw new HttpError(401, 'sign in first');
    const b = await readJSON(req);
    const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(x => str(x, 160)))].slice(0, 300) : [];
    await db.run('UPDATE customers SET saved=? WHERE id=?', [JSON.stringify(ids), c.id]);
    return { saved: ids };
  });

  route('GET', '/api/account/orders', async req => {
    const c = await customer(req); if (!c) throw new HttpError(401, 'sign in first');
    const rows = await db.all('SELECT * FROM orders WHERE customer_id=? ORDER BY id DESC LIMIT 100', [c.id]);
    return rows.map(o => ({ ...publicOrder(o), district: o.district, address: o.address }));
  });

  /* ---------- admin ---------- */
  route('GET', '/api/admin/customers', async req => {
    const q = str(new URL(req.url, 'http://x').searchParams.get('q'), 60);
    const rows = await db.all(`SELECT c.id, c.name, c.phone, c.district, c.created_at, c.last_login,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id) orders,
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.customer_id=c.id AND o.payment='paid') spent
      FROM customers c ${q ? 'WHERE c.name LIKE ? OR c.phone LIKE ?' : ''} ORDER BY c.id DESC LIMIT 500`, q ? ['%' + q + '%', '%' + q + '%'] : []);
    return rows;
  }, { admin: true });
  route('POST', '/api/admin/customers/:id/password', async (req, res, { id }) => {
    const b = await readJSON(req), pw = String(b.password || '');
    if (pw.length < 8) throw new HttpError(400, 'password must be at least 8 characters');
    const r = await db.run('UPDATE customers SET pass_hash=? WHERE id=?', [hashPassword(pw), Number(id)]);
    if (!r.changes) throw new HttpError(404, 'not found');
    await db.run('DELETE FROM sessions WHERE customer_id=?', [Number(id)]);   // sign them out everywhere
    return { ok: true };
  }, { admin: true });

  return { customer };
}
