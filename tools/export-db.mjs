// LEVERA — export the shop for a new server: data/levera-seed.sql
//   npm run db:export
// Holds brands, products (photos, prices, sale %), settings and reviews. Orders and newsletter sign-ups are
// customer data and stay out. A new server with an empty MySQL database loads this file on its first start.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbm = await import('../server/db.mjs');
await dbm.ready;
if (dbm.DRIVER !== 'mysql') { console.error('db:export needs DB_DRIVER=mysql.'); process.exit(1); }
const mysql = (await import('mysql2')).default;

const TABLES = ['brands', 'products', 'settings', 'reviews'];
let sql = '-- LEVERA shop data, exported ' + new Date().toISOString() + '\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n';
const counts = {};
for (const t of TABLES) {
  const rows = await dbm.db.all(`SELECT * FROM ${t}`);
  counts[t] = rows.length;
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  const head = `INSERT INTO \`${t}\` (${cols.map(c => '`' + c + '`').join(',')}) VALUES\n`;
  for (let i = 0; i < rows.length; i += 200) {
    sql += head + rows.slice(i, i + 200).map(r => '(' + cols.map(c => mysql.escape(r[c])).join(',') + ')').join(',\n') + ';\n';
  }
}
sql += 'SET FOREIGN_KEY_CHECKS=1;\n';
mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(join(ROOT, 'data', 'levera-seed.sql'), sql);
console.log('Wrote data/levera-seed.sql:', Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '), `(${(sql.length / 1e6).toFixed(1)} MB)`);
process.exit(0);
