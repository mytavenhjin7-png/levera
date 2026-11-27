// LEVERA — writes js/logos.js from assets/logos/*.png.
// Each logo is tagged 'm' (one dark colour on transparent → can be shown white on the dark brand band)
// or 'c' (colour / filled → shown as is on a light chip).
//   node tools/logos.mjs
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'logos');
const out = {};
for (const f of readdirSync(DIR).filter(f => f.endsWith('.png')).sort()) {
  const { data, info } = await sharp(join(DIR, f)).ensureAlpha().resize(120, 120, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let ink = 0, clear = 0, colour = 0, light = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 40) { clear++; continue; }
    ink++;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 40) colour++;   // saturated pixel
    else if (r > 200 && g > 200 && b > 200) light++;           // white fill (e.g. a white background box)
  }
  const mono = clear > 0.15 * (ink + clear) && colour < 0.04 * ink && light < 0.25 * ink;
  out[f.replace('.png', '')] = mono ? 'm' : 'c';
}
writeFileSync(join(ROOT, 'js', 'logos.js'), '/* brand logos in assets/logos: m = single dark colour (shown white on dark), c = colour */\nwindow.LV_LOGOS = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length, 'logos;', Object.values(out).filter(v => v === 'c').length, 'colour');
