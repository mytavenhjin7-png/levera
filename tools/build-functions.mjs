// LEVERA — copy the store server into functions/ before `firebase deploy` (runs on its own as the predeploy step).
// Copies server/*.mjs and server/catalog/, plus the product seed; never server/.env (the live settings are functions/.env).
import { cpSync, rmSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), F = join(ROOT, 'functions');
rmSync(join(F, 'server'), { recursive: true, force: true }); rmSync(join(F, 'data'), { recursive: true, force: true });
mkdirSync(join(F, 'server'), { recursive: true }); mkdirSync(join(F, 'data'), { recursive: true });
for (const f of readdirSync(join(ROOT, 'server'))) if (f.endsWith('.mjs')) copyFileSync(join(ROOT, 'server', f), join(F, 'server', f));
cpSync(join(ROOT, 'server', 'catalog'), join(F, 'server', 'catalog'), { recursive: true });
copyFileSync(join(ROOT, 'data', 'levera-seed.sql'), join(F, 'data', 'levera-seed.sql'));
if (!existsSync(join(F, '.env'))) { console.error('functions/.env is missing: copy functions/.env.example to functions/.env and fill it in.'); process.exit(1); }
console.log('functions/ ready: server + seed copied.');
