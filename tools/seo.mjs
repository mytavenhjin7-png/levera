// LEVERA — search and sharing basics: sitemap.xml (every page, brand and product), the web app manifest
// (add to home screen), and Open Graph / Twitter tags in each page's <head> so links shared on Facebook,
// Messenger or Telegram show the LEVERA picture and title. Run after adding products, before deploying.
//   SITE_URL=https://levera.mn node tools/seo.mjs      (default https://levera-mn.web.app)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL || 'https://levera-mn.web.app').replace(/\/$/, '');
const dbm = await import('../server/db.mjs'); await dbm.ready;
const products = await dbm.db.all('SELECT id, updated_at FROM products WHERE active=1');
const brands = await dbm.db.all('SELECT slug FROM brands');
const day = d => (d ? new Date(d) : new Date()).toISOString().slice(0, 10);

// sitemap
const urls = [['', '1.0'], ['shop.html', '0.9'], ['privacy.html', '0.2'], ['terms.html', '0.2'], ['cookies.html', '0.2'], ['shop.html?cat=fragrance', '0.8'], ['shop.html?cat=footwear', '0.8'], ['shop.html?cat=apparel', '0.7'], ['scent.html', '0.6'], ['reviews.html', '0.5']]
  .map(([u, p]) => `<url><loc>${SITE}/${u.replace(/&/g, '&amp;')}</loc><priority>${p}</priority></url>`)
  .concat(brands.map(b => `<url><loc>${SITE}/shop.html?brand=${encodeURIComponent(b.slug)}</loc><priority>0.6</priority></url>`))
  .concat(products.map(p => `<url><loc>${SITE}/product.html?id=${encodeURIComponent(p.id)}</loc><lastmod>${day(p.updated_at)}</lastmod><priority>0.5</priority></url>`));
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nDisallow: /admin.html\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);

// web app manifest
writeFileSync(join(ROOT, 'manifest.webmanifest'), JSON.stringify({
  name: 'LEVERA', short_name: 'LEVERA', description: 'Дэлхийн шилдэг пүүз, сүрчиг, хувцас — Улаанбаатарт 7–14 хоногт.',
  start_url: '/index.html', display: 'standalone', background_color: '#EEECE7', theme_color: '#16171A', lang: 'mn',
  icons: [{ src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
}, null, 2));

// <head> tags, between markers so re-running replaces them
const DESC = 'LEVERA — Улаанбаатар дахь олон брэндийн онлайн дэлгүүр. Nike Kobe, Way of Wade, Dior Sauvage, YSL, Lattafa ба 90+ брэнд. Карго, хүргэлт үнэд багтсан, QPay төлбөр, 7–14 хоногт хүргэлт.';
const tags = page => [
  '<!-- seo -->',
  `<meta property="og:type" content="${page === 'product.html' ? 'product' : 'website'}">`,
  '<meta property="og:site_name" content="LEVERA">',
  `<meta property="og:title" content="LEVERA — Пүүз, сүрчиг, хувцас · Улаанбаатар">`,
  `<meta property="og:description" content="${DESC}">`,
  `<meta property="og:image" content="${SITE}/assets/og.jpg">`,
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
  `<meta property="og:url" content="${SITE}/${page === 'index.html' ? '' : page}">`,
  '<meta property="og:locale" content="mn_MN">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="assets/icon-180.png">',
  '<meta name="apple-mobile-web-app-title" content="LEVERA">',
  '<!-- /seo -->'
].join('\n');
for (const f of readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'admin.html')) {
  let h = readFileSync(join(ROOT, f), 'utf8');
  h = h.replace(/\n?<!-- seo -->[\s\S]*?<!-- \/seo -->/, '');
  h = h.replace(/(<link rel="icon"[^>]*>)/, `$1\n${tags(f)}`);
  if (f === 'index.html') h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${DESC}">`);
  writeFileSync(join(ROOT, f), h);
}
console.log('sitemap:', urls.length, 'urls ·', SITE); process.exit(0);
