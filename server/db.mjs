// LEVERA — database. MySQL (Laragon) by default; set DB_DRIVER=sqlite to use the built-in file database instead.
//   MySQL:  MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE in server/.env (Laragon: root, no password).
//           The database and tables are created on first start. If data/levera.db (the old SQLite file) exists and
//           MySQL is empty, everything in it (products, orders, settings, subscribers) is copied over once.
//   SQLite: data/levera.db (Node's node:sqlite, no packages).
// Every query helper is async: all(sql, args) → rows, get(sql, args) → row, run(sql, args) → { changes, insertId }.
import './env.mjs';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './catalog/build.mjs';
import { priceProduct } from './cargo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DRIVER = (process.env.DB_DRIVER || 'mysql').toLowerCase() === 'sqlite' ? 'sqlite' : 'mysql';
export const SQLITE_PATH = process.env.DB_PATH || join(root, 'data', 'levera.db');
// Connection settings, in order: one URL (MYSQL_URL / DATABASE_URL, e.g. mysql://user:pass@host:3306/levera, as
// Railway and most hosts give it), then MYSQL_HOST… (server/.env), then Railway's MYSQLHOST… names, then Laragon defaults.
const env = process.env;
const url = (() => { try { const u = new URL(env.MYSQL_URL || env.DATABASE_URL || ''); return /^mysql/.test(u.protocol) ? u : null; } catch { return null; } })();
const MYSQL = {
  host: url?.hostname || env.MYSQL_HOST || env.MYSQLHOST || '127.0.0.1',
  port: Number(url?.port || env.MYSQL_PORT || env.MYSQLPORT || 3306),
  user: (url && decodeURIComponent(url.username)) || env.MYSQL_USER || env.MYSQLUSER || 'root',
  password: (url && decodeURIComponent(url.password)) || env.MYSQL_PASSWORD || env.MYSQLPASSWORD || '',
  database: (url && url.pathname.slice(1)) || env.MYSQL_DATABASE || env.MYSQLDATABASE || 'levera'
};
export const DB_LABEL = DRIVER === 'mysql' ? `MySQL ${MYSQL.user}@${MYSQL.host}:${MYSQL.port}/${MYSQL.database}` : `SQLite ${SQLITE_PATH}`;

/* ---------- schema ---------- */
const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS brands (
    slug VARCHAR(80) PRIMARY KEY, name VARCHAR(120) NOT NULL, city_en VARCHAR(80), city_mn VARCHAR(80), blurb_en TEXT, blurb_mn TEXT,
    tier VARCHAR(12) DEFAULT 'luxury', sort INT DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(160) PRIMARY KEY, brand_slug VARCHAR(80) NOT NULL, line VARCHAR(160), type VARCHAR(40), cat VARCHAR(40),
    name_en VARCHAR(255), name_mn VARCHAR(255), color_key VARCHAR(40), variant VARCHAR(160),
    cny DOUBLE NOT NULL, weight_kg DOUBLE NOT NULL, len_cm DOUBLE, wid_cm DOUBLE, hei_cm DOUBLE,
    sizes TEXT, img VARCHAR(255), photo VARCHAR(255), photos TEXT, photo_src TEXT, render TEXT,
    dewu_spu VARCHAR(80), dewu_url VARCHAR(500), price_source VARCHAR(20) DEFAULT 'estimate',
    featured INT DEFAULT 0, active TINYINT DEFAULT 1, sort INT DEFAULT 0, cargo_mnt INT, price_mnt INT, list_mnt INT, discount_pct INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX products_brand (brand_slug), INDEX products_cat (cat)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS settings (\`key\` VARCHAR(64) PRIMARY KEY, value TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY, no VARCHAR(20) UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(80), phone VARCHAR(20), address TEXT, district VARCHAR(60), note TEXT,
    items MEDIUMTEXT, subtotal INT, total INT, status VARCHAR(20) DEFAULT 'pending', history TEXT,
    payment VARCHAR(12) DEFAULT 'unpaid', qpay_invoice VARCHAR(80)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS subscribers (email VARCHAR(160) PRIMARY KEY, interests TEXT, lang VARCHAR(4), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
    ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY, product_id VARCHAR(160) NOT NULL, name VARCHAR(80) NOT NULL, rating TINYINT NOT NULL,
    title VARCHAR(140), body TEXT NOT NULL, size VARCHAR(20), fit VARCHAR(12), order_no VARCHAR(20), verified TINYINT DEFAULT 0,
    status VARCHAR(12) DEFAULT 'published', lang VARCHAR(4), created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX reviews_product (product_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  // customer accounts (phone + password) and their sign-in sessions
  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY, phone VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL, pass_hash VARCHAR(200) NOT NULL,
    address TEXT, district VARCHAR(60), saved TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY, customer_id INT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL,
    INDEX sessions_customer (customer_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];
const SQLITE_SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS brands (slug TEXT PRIMARY KEY, name TEXT NOT NULL, city_en TEXT, city_mn TEXT, blurb_en TEXT, blurb_mn TEXT, tier TEXT DEFAULT 'luxury', sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, brand_slug TEXT NOT NULL, line TEXT, type TEXT, cat TEXT, name_en TEXT, name_mn TEXT, color_key TEXT, variant TEXT,
  cny REAL NOT NULL, weight_kg REAL NOT NULL, len_cm REAL, wid_cm REAL, hei_cm REAL, sizes TEXT, img TEXT, photo TEXT, photos TEXT, photo_src TEXT, render TEXT,
  dewu_spu TEXT, dewu_url TEXT, price_source TEXT DEFAULT 'estimate', featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, sort INTEGER DEFAULT 0,
  cargo_mnt INTEGER, price_mnt INTEGER, list_mnt INTEGER, discount_pct INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS products_brand ON products(brand_slug);
CREATE INDEX IF NOT EXISTS products_cat ON products(cat);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, no TEXT UNIQUE, created_at TEXT DEFAULT CURRENT_TIMESTAMP, name TEXT, phone TEXT, address TEXT, district TEXT, note TEXT,
  items TEXT, subtotal INTEGER, total INTEGER, status TEXT DEFAULT 'pending', history TEXT DEFAULT '[]', payment TEXT DEFAULT 'unpaid', qpay_invoice TEXT
);
CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, interests TEXT, lang TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL, name TEXT NOT NULL, rating INTEGER NOT NULL, title TEXT, body TEXT NOT NULL,
  size TEXT, fit TEXT, order_no TEXT, verified INTEGER DEFAULT 0, status TEXT DEFAULT 'published', lang TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS reviews_product ON reviews(product_id, status);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL, pass_hash TEXT NOT NULL,
  address TEXT, district TEXT, saved TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_login TEXT
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, customer_id INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL);
`;

/* ---------- drivers ---------- */
function sqliteHandle(DatabaseSync, path) {
  const h = new DatabaseSync(path);
  const stmt = new Map();
  const prep = sql => { let s = stmt.get(sql); if (!s) { s = h.prepare(sql); stmt.set(sql, s); } return s; };
  return {
    raw: h,
    async all(sql, args = []) { return prep(sql).all(...args); },
    async get(sql, args = []) { return prep(sql).get(...args); },
    async run(sql, args = []) { const r = prep(sql).run(...args); return { changes: Number(r.changes), insertId: Number(r.lastInsertRowid) }; },
    async exec(sql) { h.exec(sql); },
    async tx(fn) { h.exec('BEGIN'); try { const out = await fn(this); h.exec('COMMIT'); return out; } catch (e) { h.exec('ROLLBACK'); throw e; } }
  };
}
function mysqlHandle(pool) {
  const wrap = c => ({
    async all(sql, args = []) { const [rows] = await c.query(sql, args); return rows; },
    async get(sql, args = []) { const [rows] = await c.query(sql, args); return rows[0]; },
    async run(sql, args = []) { const [r] = await c.query(sql, args); return { changes: r.affectedRows, insertId: r.insertId }; },
    async exec(sql) { await c.query(sql); }
  });
  return {
    ...wrap(pool), pool,
    async tx(fn) {
      const conn = await pool.getConnection();
      try { await conn.beginTransaction(); const out = await fn(wrap(conn)); await conn.commit(); return out; }
      catch (e) { await conn.rollback().catch(() => {}); throw e; }
      finally { conn.release(); }
    }
  };
}

export let db;
// Dialect helpers: the same SQL runs on both, except "insert or update".
//   upsert('settings', ['key','value'], ['key'], ['value'])  →  INSERT … ON DUPLICATE KEY UPDATE / ON CONFLICT DO UPDATE
const q = c => DRIVER === 'mysql' ? '`' + c + '`' : '"' + c + '"';
export function upsert(table, cols, keys, update, custom = {}) {
  const head = `INSERT INTO ${table}(${cols.map(q).join(',')}) VALUES(${cols.map(() => '?').join(',')})`;
  if (DRIVER === 'mysql') return head + ' ON DUPLICATE KEY UPDATE ' + update.map(c => custom[c]?.mysql || `${q(c)}=VALUES(${q(c)})`).join(', ');
  return head + ` ON CONFLICT(${keys.map(q).join(',')}) DO UPDATE SET ` + update.map(c => custom[c]?.sqlite || `${q(c)}=excluded.${q(c)}`).join(', ');
}

async function connect() {
  if (DRIVER === 'sqlite') {
    const { DatabaseSync } = await import('node:sqlite');
    mkdirSync(dirname(SQLITE_PATH), { recursive: true });
    db = sqliteHandle(DatabaseSync, SQLITE_PATH);
    await db.exec(SQLITE_SCHEMA);
    // older files predate these columns
    const cols = async t => (await db.all(`PRAGMA table_info(${t})`)).map(c => c.name);
    if (!(await cols('brands')).includes('tier')) await db.exec("ALTER TABLE brands ADD COLUMN tier TEXT DEFAULT 'luxury'");
    if (!(await cols('products')).includes('photo_src')) await db.exec('ALTER TABLE products ADD COLUMN photo_src TEXT');
    if (!(await cols('products')).includes('photos')) await db.exec('ALTER TABLE products ADD COLUMN photos TEXT');
    if (!(await cols('orders')).includes('customer_id')) await db.exec('ALTER TABLE orders ADD COLUMN customer_id INTEGER');
    if (!(await cols('products')).includes('discount_pct')) await db.exec('ALTER TABLE products ADD COLUMN list_mnt INTEGER; ALTER TABLE products ADD COLUMN discount_pct INTEGER DEFAULT 0');
    if (!(await cols('products')).includes('retail_usd')) await db.exec('ALTER TABLE products ADD COLUMN retail_usd REAL');
    if (!(await cols('orders')).includes('kind')) await db.exec("ALTER TABLE orders ADD COLUMN rank_off INTEGER DEFAULT 0; ALTER TABLE orders ADD COLUMN gift_code TEXT; ALTER TABLE orders ADD COLUMN gift_used INTEGER DEFAULT 0; ALTER TABLE orders ADD COLUMN kind TEXT DEFAULT 'goods'");
    await db.exec("CREATE TABLE IF NOT EXISTS gift_cards (code TEXT PRIMARY KEY, amount INTEGER, balance INTEGER, status TEXT DEFAULT 'pending', buyer_phone TEXT, order_no TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, paid_at TEXT)");
    return;
  }
  const mysql = (await import('mysql2/promise')).default;
  // cloud MySQL (TiDB Cloud, Aiven, PlanetScale…) needs TLS: MYSQL_SSL=true, or ?ssl=true / ?ssl-mode=REQUIRED in MYSQL_URL
  const tls = /^(1|true|required)$/i.test(env.MYSQL_SSL || '') || /ssl(-mode)?=(true|required)/i.test(url?.search || '');
  const base = { host: MYSQL.host, port: MYSQL.port, user: MYSQL.user, password: MYSQL.password, charset: 'utf8mb4', ...(tls ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}) };
  try {
    const c = await mysql.createConnection(base);
    await c.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL.database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await c.end();
  } catch (e) {
    const err = new Error(`Cannot reach MySQL at ${MYSQL.host}:${MYSQL.port} (${e.code || e.message}).\n` +
      `  → Open Laragon and press "Start All" (MySQL must be running), or check MYSQL_* in server/.env.\n` +
      `  → To run without MySQL, set DB_DRIVER=sqlite in server/.env.`);
    err.code = 'DB_UNREACHABLE'; throw err;
  }
  // dateStrings + UTC keep timestamps in the same "YYYY-MM-DD HH:MM:SS" UTC form SQLite uses
  const pool = mysql.createPool({ ...base, database: MYSQL.database, connectionLimit: 8, dateStrings: true, decimalNumbers: true, supportBigNumbers: true, timezone: 'Z' });
  pool.on('connection', c => c.query("SET time_zone = '+00:00'"));
  db = mysqlHandle(pool);
  for (const s of MYSQL_SCHEMA) await db.exec(s);
  // gallery column added after the first MySQL release
  if (!(await db.all("SHOW COLUMNS FROM products LIKE 'photos'")).length) await db.exec('ALTER TABLE products ADD COLUMN photos TEXT AFTER photo');
  // orders placed while signed in belong to that customer (added 2026-11)
  if (!(await db.all("SHOW COLUMNS FROM orders LIKE 'customer_id'")).length) await db.exec('ALTER TABLE orders ADD COLUMN customer_id INT NULL, ADD INDEX orders_customer (customer_id)');
  // sale prices (added 2026-10-26)
  if (!(await db.all("SHOW COLUMNS FROM products LIKE 'discount_pct'")).length) await db.exec('ALTER TABLE products ADD COLUMN list_mnt INT AFTER price_mnt, ADD COLUMN discount_pct INT DEFAULT 0 AFTER list_mnt');
  // member ranks and gift cards (added 2026-11)
  if (!(await db.all("SHOW COLUMNS FROM orders LIKE 'kind'")).length) await db.exec("ALTER TABLE orders ADD COLUMN rank_off INT DEFAULT 0, ADD COLUMN gift_code VARCHAR(24) NULL, ADD COLUMN gift_used INT DEFAULT 0, ADD COLUMN kind VARCHAR(12) DEFAULT 'goods'");
  await db.exec("CREATE TABLE IF NOT EXISTS gift_cards (code VARCHAR(24) PRIMARY KEY, amount INT, balance INT, status VARCHAR(12) DEFAULT 'pending', buyer_phone VARCHAR(20), order_no VARCHAR(20), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, paid_at DATETIME NULL, INDEX gift_order (order_no)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  // fragrance and beauty are priced from the house's official retail price (added 2026-11)
  if (!(await db.all("SHOW COLUMNS FROM products LIKE 'retail_usd'")).length) await db.exec('ALTER TABLE products ADD COLUMN retail_usd DECIMAL(8,2) NULL AFTER cny');
  // A new server (e.g. on the internet) starts with an empty database: load the shop as exported by
  // `npm run db:export` (data/levera-seed.sql: brands, products with their photos and prices, settings, reviews).
  const seedFile = join(root, 'data', 'levera-seed.sql');
  if ((await db.get('SELECT COUNT(*) n FROM products')).n === 0 && existsSync(seedFile)) {
    const c = await mysql.createConnection({ ...base, database: MYSQL.database, multipleStatements: true });
    await c.query(readFileSync(seedFile, 'utf8')); await c.end();
    console.log('Loaded the shop from data/levera-seed.sql:', (await db.get('SELECT COUNT(*) n FROM products')).n, 'products.');
  }
  await migrateFromSqlite();
}

// one-time copy of the old SQLite database into an empty MySQL database
async function migrateFromSqlite() {
  if ((await db.get('SELECT COUNT(*) n FROM products')).n > 0 || !existsSync(SQLITE_PATH)) return;
  let src;
  try { const { DatabaseSync } = await import('node:sqlite'); src = new DatabaseSync(SQLITE_PATH, { readOnly: true }); } catch { return; }
  const tables = ['brands', 'products', 'settings', 'orders', 'subscribers', 'reviews'];
  const copied = {};
  await db.tx(async t => {
    for (const table of tables) {
      let rows; try { rows = src.prepare(`SELECT * FROM ${table}`).all(); } catch { continue; }
      if (!rows.length) continue;
      const have = new Set((await t.all(`SHOW COLUMNS FROM ${table}`)).map(c => c.Field));
      const cols = Object.keys(rows[0]).filter(c => have.has(c));
      const sql = `INSERT IGNORE INTO ${table}(${cols.map(q).join(',')}) VALUES ?`;
      for (let i = 0; i < rows.length; i += 300) await t.run(sql, [rows.slice(i, i + 300).map(r => cols.map(c => r[c]))]);
      copied[table] = rows.length;
    }
  });
  src.close();
  console.log('Copied the SQLite database into MySQL:', Object.entries(copied).map(([k, v]) => `${v} ${k}`).join(', '));
}

export const ready = connect();

/* ---------- settings ---------- */
// Defaults are HiCargo's live rates on 2026-10-22 (Ereen → Цирк branch): 3,000₮/kg, ¥599/m³, ¥1 = 545₮.
export const DEFAULTS = {
  cargo_yuan: 545, cargo_kg: 3000, cargo_m3: 599, hicargo_branch_id: 1, hicargo_branch: 'Цирк салбар',
  goods_cny_rate: 545,        // ₮ per ¥ for the Dewu item price itself
  markup_pct: 70.9,           // owner's rule: price = landed cost × (1 + markup) — ₮275,000 → ₮470,000; 0 = old fee model
  service_fee_pct: 20,        // (old model) LEVERA service fee on the item price, up to service_fee_high_from_mnt …
  service_fee_high_pct: 15,   // … and on the part of the item price above it (luxury pieces)
  service_fee_high_from_mnt: 2000000,
  service_fee_min_mnt: 15000, // never less than this per piece
  china_shipping_cny: 0,      // Dewu → Ereen domestic shipping per item, if Dewu charges it
  local_delivery_mnt: 6000,   // UBCab Express home delivery in Ulaanbaatar, per piece
  // fragrance & beauty: priced like a Mongolian perfumery — official retail (US$) × rate + customs duty + VAT
  usd_mnt_rate: 3608,
  customs_duty_pct: 5,
  vat_pct: 10,
  frag_mnt_per_cny: 983.2,    // perfume: ₮ per Dewu ¥, all in (Le Male Le Parfum 75 ml: ¥478 → ₮470,000)
  frag_fee_pct: 0,            // on top of the duty-paid retail price (0 = the local shop price)
  rates_synced_at: ''
};
export const PRICE_KEYS = ['markup_pct','goods_cny_rate','service_fee_pct','service_fee_high_pct','service_fee_high_from_mnt','service_fee_min_mnt','china_shipping_cny','local_delivery_mnt','usd_mnt_rate','customs_duty_pct','vat_pct','frag_fee_pct','frag_mnt_per_cny'];
const NUMERIC = new Set(['cargo_yuan','cargo_kg','cargo_m3','hicargo_branch_id', ...PRICE_KEYS]);
export async function getSettings() {
  const s = { ...DEFAULTS };
  for (const r of await db.all('SELECT `key`, value FROM settings')) s[r.key] = NUMERIC.has(r.key) ? Number(r.value) : r.value;
  return s;
}
export async function setSettings(obj) {
  const sql = upsert('settings', ['key', 'value'], ['key'], ['value']);
  for (const [k, v] of Object.entries(obj)) if (k in DEFAULTS) await db.run(sql, [k, String(v)]);
}

/* ---------- prices ---------- */
// list_mnt = the normal price (item + cargo + service). A sale (discount_pct, set in admin) really lowers the price
// customers pay: price_mnt = list price minus the discount, rounded to 1,000₮. Every page, the bag and the order use
// price_mnt, so the crossed-out list price is always the honest "before".
export const salePrice = (list, pct) => (pct > 0 ? Math.round(list * (1 - pct / 100) / 1000) * 1000 : list);
export async function repriceAll() {
  const s = await getSettings();
  const rows = await db.all('SELECT id, type, cny, retail_usd, weight_kg, len_cm, wid_cm, hei_cm, discount_pct FROM products');
  await db.tx(async t => {
    for (const p of rows) { const r = priceProduct(p, s); await t.run('UPDATE products SET cargo_mnt=?, list_mnt=?, price_mnt=? WHERE id=?', [r.cargo.price, r.total, salePrice(r.total, p.discount_pct || 0), p.id]); }
  });
}
export async function repriceOne(id) {
  const p = await db.get('SELECT id, type, cny, retail_usd, weight_kg, len_cm, wid_cm, hei_cm, discount_pct FROM products WHERE id=?', [id]);
  if (!p) return;
  const r = priceProduct(p, await getSettings());
  await db.run('UPDATE products SET cargo_mnt=?, list_mnt=?, price_mnt=? WHERE id=?', [r.cargo.price, r.total, salePrice(r.total, p.discount_pct || 0), id]);
}

/* ---------- bring a live database up to the deployed shop ---------- */
// A server only loads data/levera-seed.sql into an EMPTY database, so a redeploy updates the code but not the rows:
// the live shop would keep old products and point at photos the new deploy no longer has. This copies the deployed
// brands, products (photos, prices) and settings over the live rows. Orders, customers and subscribers are not
// touched, reviews are only added to, and pieces added by hand in admin stay; other pieces no longer in the file are hidden.
export async function applySeed() {
  await ready;
  if (DRIVER !== 'mysql') throw new Error('needs MySQL');
  const file = join(root, 'data', 'levera-seed.sql');
  if (!existsSync(file)) throw new Error('data/levera-seed.sql not found');
  const sql = readFileSync(file, 'utf8')
    .replace(/^INSERT INTO `(brands|products|settings)`/gm, 'REPLACE INTO `$1`')
    .replace(/^INSERT INTO `reviews`/gm, 'INSERT IGNORE INTO `reviews`');
  await db.run("UPDATE products SET active=0 WHERE price_source<>'manual'");
  const mysql = (await import('mysql2/promise')).default;
  const c = await mysql.createConnection({ host: MYSQL.host, port: MYSQL.port, user: MYSQL.user, password: MYSQL.password, database: MYSQL.database, charset: 'utf8mb4', multipleStatements: true });
  try { await c.query(sql); } finally { await c.end(); }
  return { products: (await db.get('SELECT COUNT(*) n FROM products WHERE active=1')).n, brands: (await db.get('SELECT COUNT(*) n FROM brands')).n };
}

/* ---------- seed ---------- */
export async function seed({ force = false } = {}) {
  await ready;
  const { brands, products } = buildCatalog();
  const have = (await db.get('SELECT COUNT(*) n FROM products')).n;
  // brands are always refreshed (cheap, and keeps the luxury/street tier current)
  const ib = upsert('brands', ['slug', 'name', 'city_en', 'city_mn', 'blurb_en', 'blurb_mn', 'tier', 'sort'], ['slug'], ['name', 'city_en', 'city_mn', 'blurb_en', 'blurb_mn', 'tier', 'sort']);
  await db.tx(async t => { for (const b of brands) await t.run(ib, [b.slug, b.name, b.city_en, b.city_mn, b.blurb_en, b.blurb_mn, b.tier, b.sort]); });
  if (have && !force) return { seeded: false, products: have };
  // on a forced re-seed keep anything the admin set by hand (live Dewu price, photo, Dewu link, active flag)
  const cols = ['id', 'brand_slug', 'line', 'type', 'cat', 'name_en', 'name_mn', 'color_key', 'variant', 'cny', 'weight_kg', 'len_cm', 'wid_cm', 'hei_cm', 'sizes', 'img', 'render', 'featured', 'sort'];
  const ip = upsert('products', cols, ['id'], ['line', 'type', 'cat', 'name_en', 'name_mn', 'color_key', 'variant', 'sizes', 'img', 'render', 'sort', 'cny'], {
    cny: { mysql: "cny=CASE WHEN price_source='estimate' THEN VALUES(cny) ELSE cny END", sqlite: "cny=CASE WHEN products.price_source='estimate' THEN excluded.cny ELSE products.cny END" }
  });
  await db.tx(async t => { for (const p of products) await t.run(ip, cols.map(c => p[c])); });
  await repriceAll();
  return { seeded: true, products: products.length };
}

/* ---------- reads ---------- */
const PUBLIC_COLS = 'id, brand_slug, line, type, cat, name_en, name_mn, color_key, variant, cny, retail_usd, weight_kg, len_cm, wid_cm, hei_cm, sizes, img, photo, photos, featured, sort, cargo_mnt, price_mnt, list_mnt, discount_pct, price_source, dewu_url';
export const listProducts = (all = false) => db.all(`SELECT ${PUBLIC_COLS}, active FROM products ${all ? '' : 'WHERE active=1'} ORDER BY brand_slug, sort`);
export const getProduct = id => db.get(`SELECT ${PUBLIC_COLS}, active, dewu_spu, render FROM products WHERE id=?`, [id]);
export const listBrands = () => db.all('SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_slug=b.slug AND p.active=1) AS count FROM brands b ORDER BY sort');
