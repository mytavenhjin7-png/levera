// LEVERA — product photo styling, StockX-style: pure white background, the product trimmed, scaled to one
// size and centred on an 800×1000 canvas (the shop's 4:5 frame). For shoes it also reads the silhouette:
//   side profile? (one shoe, wide and low)   pair? (two separate shapes)   cropped? (cut off at the edge)
//   which way does the toe point? (the heel end is the taller one) — the main photo always points right.
import sharp from 'sharp';

const W = 800, H = 1000;
// how much of the canvas the product may fill
const BOX = { shoeSide: [700, 470], shoeOther: [560, 620], item: [660, 800] };

// read a photo, flood-fill the background in from the edges and measure what is left
export async function analyse(buf) {
  const img = sharp(buf, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });
  const meta = await sharp(buf, { failOn: 'none' }).rotate().metadata();
  if (!meta.width || Math.max(meta.width, meta.height) < 450) throw new Error('too small');
  const { data, info } = await img.resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels, n = w * h;
  const at = i => [data[i * ch], data[i * ch + 1], data[i * ch + 2]];

  // background colour = median of the border; "studio" when the border is one flat colour
  const border = [];
  for (let x = 0; x < w; x += 2) border.push(at(x), at((h - 1) * w + x));
  for (let y = 0; y < h; y += 2) border.push(at(y * w), at(y * w + w - 1));
  const med = [0, 1, 2].map(c => border.map(p => p[c]).sort((a, b) => a - b)[border.length >> 1]);
  const dist = p => Math.abs(p[0] - med[0]) + Math.abs(p[1] - med[1]) + Math.abs(p[2] - med[2]);
  const flatShare = border.filter(p => dist(p) < 30).length / border.length;
  const studio = flatShare > 0.9 && med.every(v => v > 170);   // a light, even backdrop

  // flood fill the backdrop from every edge pixel that matches it
  const bg = new Uint8Array(n);
  if (studio) {
    const q = new Int32Array(n); let head = 0, tail = 0;
    const push = i => { if (!bg[i] && dist(at(i)) < 42) { bg[i] = 1; q[tail++] = i; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (head < tail) {
      const i = q[head++], x = i % w;
      if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < n - w) push(i + w);
    }
  }
  // bounding box of the product (ignore specks: a row/column needs a few product pixels)
  const cols = new Uint32Array(w), rows = new Uint32Array(h);
  for (let i = 0; i < n; i++) if (!bg[i]) { cols[i % w]++; rows[(i / w) | 0]++; }
  const minC = Math.max(2, h * 0.004), minR = Math.max(2, w * 0.004);
  let x0 = 0, x1 = w - 1, y0 = 0, y1 = h - 1;
  if (studio) {
    while (x0 < w && cols[x0] < minC) x0++; while (x1 > x0 && cols[x1] < minC) x1--;
    while (y0 < h && rows[y0] < minR) y0++; while (y1 > y0 && rows[y1] < minR) y1--;
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw < 40 || bh < 40) throw new Error('no product');
  const m = 3, cropped = studio && (x0 < m || y0 < m || x1 > w - 1 - m || y1 > h - 1 - m);

  // two shapes side by side (a pair) leave an empty band of columns inside the box
  let gap = 0, run = 0;
  for (let x = x0; x <= x1; x++) { if (cols[x] < minC) { run++; gap = Math.max(gap, run); } else run = 0; }
  // …or stacked one above the other leave an empty band of rows
  let rgap = 0; run = 0;
  for (let y = y0; y <= y1; y++) { if (rows[y] < minR) { run++; rgap = Math.max(rgap, run); } else run = 0; }
  const pair = gap > bw * 0.03 || rgap > bh * 0.04;

  // toe direction: the topmost product pixel near each end; the heel collar rises higher than the toe box
  const topIn = (a, b) => { let best = h; for (let x = a; x <= b; x++) for (let y = y0; y < best && y <= y1; y++) if (!bg[y * w + x]) { best = y; break; } return best; };
  const band = Math.max(3, Math.round(bw * 0.16));
  const topL = topIn(x0, x0 + band), topR = topIn(x1 - band, x1);
  const ratio = bw / bh;
  const side = studio && !cropped && !pair && ratio >= 1.55 && ratio <= 3.4;
  const lean = (topR - topL) / bh;                 // > 0: left end taller → heel left → toe points right
  const facesRight = lean > 0.08 ? true : lean < -0.08 ? false : null;

  // average colour of the product, to keep a gallery to one colourway
  // colour signature: share of the product in 12 hue bins (saturated pixels only) + share of dark and of light pixels
  const tone = new Float32Array(14); let tn = 0;
  for (let i = 0; i < n; i += 3) {
    if (bg[i]) continue;
    const r = data[i * ch] / 255, g = data[i * ch + 1] / 255, b = data[i * ch + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; tn++;
    if (mx < 0.17) { tone[12]++; continue; }
    if (d / mx < 0.2) { if (mx > 0.75) tone[13]++; else if (mx < 0.3) tone[12]++; continue; }
    let hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    tone[Math.floor(((hue * 60 + 360) % 360) / 30)]++;
  }
  if (tn) for (let k = 0; k < 14; k++) tone[k] /= tn;
  return { data, w, h, ch, bg, box: [x0, y0, bw, bh], studio, cropped, pair, side, facesRight, lean, ratio, tone };
}

// draw the product onto the white canvas; `flip` mirrors it so the toe points right
export async function render(a, { footwear = false, flip = false } = {}) {
  let out, hashSrc = null;
  if (a.studio) {
    const px = Buffer.from(a.data);
    for (let i = 0; i < a.w * a.h; i++) if (a.bg[i]) { px[i * a.ch] = 255; px[i * a.ch + 1] = 255; px[i * a.ch + 2] = 255; }
    const [x0, y0, bw, bh] = a.box;
    const [mw, mh] = footwear ? (a.ratio >= 1.3 ? BOX.shoeSide : BOX.shoeOther) : BOX.item;
    const s = Math.min(mw / bw, mh / bh);
    const tw = Math.max(1, Math.round(bw * s)), th = Math.max(1, Math.round(bh * s));
    let piece = sharp(px, { raw: { width: a.w, height: a.h, channels: a.ch } }).extract({ left: x0, top: y0, width: bw, height: bh });
    if (flip) piece = piece.flop();
    const buf = await piece.resize(tw, th, { kernel: 'lanczos3' }).png().toBuffer();
    hashSrc = buf;
    out = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
      .composite([{ input: buf, left: Math.round((W - tw) / 2), top: Math.round((H - th) / 2) }]).webp({ quality: 84 }).toBuffer();
  } else {
    // lifestyle / on-model shots: keep them whole, smart-cropped to the frame
    out = await sharp(a.data, { raw: { width: a.w, height: a.h, channels: a.ch } })
      .resize(W, H, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 82 }).toBuffer();
  }
  // 16×16 average hash of the product itself (not the white canvas), to drop near-duplicate photos
  const g = await sharp(hashSrc || out).flatten({ background: '#ffffff' }).greyscale().resize(16, 16, { fit: 'fill' }).raw().toBuffer();
  const avg = g.reduce((s, v) => s + v, 0) / 256;
  return { out, hash: Array.from(g, v => (v > avg ? 1 : 0)) };
}

// colour distance between two products: 0 = identical signature, 2 = nothing in common
export const toneGap = (a, b) => { let d = 0; for (let k = 0; k < 14; k++) d += Math.abs(a[k] - b[k]); return d; };

// How well a photo's colour signature fits a catalogue colour name ("Black / White", "Royal Blue", "Olive"…).
// Signature slots: 0–11 hue bins of 30° (0 red, 1 orange, 2 yellow, 3–5 greens, 6 cyan, 7–8 blues, 9 violet,
// 10 magenta, 11 rose), 12 dark, 13 light; whatever is left is mid grey. Returns 0…1 (≥ 0.55 is a good fit),
// or 1 when the colour name says nothing checkable (Multicolor, Monogram…).
const CAT = {
  black: [12], charcoal: [12, 'mid'], chocolate: [12, 0, 1], white: [13, 'mid'], cream: [13, 'mid', 1, 2], ecru: [13, 'mid', 1, 2], sail: [13, 'mid', 1],
  grey: ['mid', 13], heather: ['mid', 13], silver: ['mid', 13], navy: [12, 7, 8], blue: [7, 8, 6], royal: [7, 8], lightblue: [6, 7, 13], teal: [5, 6],
  red: [0, 11], burgundy: [0, 11, 12], pink: [10, 11, 0, 13], purple: [8, 9, 10], lavender: [8, 9, 13], green: [3, 4, 5], forest: [3, 4, 12],
  olive: [2, 3, 4, 12, 'mid'], sage: [3, 4, 'mid'], grinch: [2, 3, 4], khaki: [1, 2, 'mid'], beige: [1, 2, 13, 'mid'], sand: [1, 2, 13, 'mid'],
  camel: [0, 1, 2], tan: [0, 1, 2], brown: [0, 1, 12], yellow: [1, 2], gold: [1, 2], orange: [0, 1]
};
export function colourFit(tone, colourName) {
  const words = String(colourName || '').toLowerCase().replace('light blue', 'lightblue').split(/[^a-z]+/).filter(w => CAT[w]);
  if (!words.length) return 1;
  const want = new Set(words.flatMap(w => CAT[w]));
  const mid = Math.max(0, 1 - tone.reduce((s, v) => s + v, 0));
  const share = k => (k === 'mid' ? mid : tone[k]);
  let inWant = 0, offHue = 0, wantHue = 0;
  for (const k of want) inWant += share(k);
  for (let k = 0; k < 12; k++) { if (want.has(k)) wantHue += tone[k]; else offHue += tone[k]; }
  if (!want.has('mid')) inWant += mid * 0.5;                 // shading and soles read as mid grey
  const needsHue = [...want].some(k => typeof k === 'number' && k < 12) && !words.some(w => ['black', 'white', 'grey', 'navy', 'brown', 'burgundy', 'forest', 'olive', 'cream', 'sand', 'beige', 'ecru'].includes(w));
  if (needsHue && wantHue < 0.12) return 0;                   // "Royal Blue" must actually have blue in it
  // two-colour names ("Black / Red"): each colour has to be clearly there
  if (words.length > 1 && words.some(w => CAT[w].reduce((t, k) => t + share(k), 0) < 0.08)) return 0;
  // plain neutrals (Black, White, Grey…) allow only a touch of other colour
  if (words.every(w => ['black', 'white', 'grey', 'heather', 'silver', 'charcoal', 'cream', 'ecru', 'sail'].includes(w)) && offHue > 0.16) return 0;
  return Math.max(0, Math.min(1, inWant - offHue));
}
