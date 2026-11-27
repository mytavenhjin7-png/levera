import { analyse, render } from './photo-style.mjs';
import { readFileSync } from 'node:fs';
const p = JSON.parse(readFileSync(process.argv[2],'utf8')).products[0];
for (const i of p.images) { try { const r = await fetch(i.src.split('?')[0]+'?width=1600'); const an = await analyse(Buffer.from(await r.arrayBuffer())); const s = await render(an,{}); console.log('ok', s.hash.slice(0,8).join('')); } catch(e){ console.log('ERR', e.message); } }
