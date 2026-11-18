// LEVERA — expands brands.mjs + brands-more.mjs into product rows (40 per brand) with
// names in MN/EN, packed weight + box size for HiCargo, size run and render parameters.
import { BRANDS } from './brands.mjs';
import { MORE } from './brands-more.mjs';
import { NEW_BRANDS, NIKE_SIGNATURE } from './brands-2026.mjs';
import { COLORS, TYPES, SIZE_RUNS } from './dict.mjs';

export const PER_BRAND = 40;
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// small deterministic hash so render variety (shoe model variant, yaw) is stable between builds
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const METAL = { yellowgold: 'gold', gold: 'gold', rosegold: 'rose', whitegold: 'white', silver: 'white', sterling: 'silver' };
const LIP = { red: '#A3172A', burgundy: '#5E1424', pink: '#D9798D', beige: '#C99A80', orange: '#D86A4A', brown: '#7A4532', sand: '#D9B48E' };

function renderParams(type, colorKey, opts, id) {
  const T = TYPES[type], hex = colorKey ? COLORS[colorKey][2] : '#2A2A2C', h = hash(id);
  switch (T.kind) {
    case 'flacon': return { kind: 'flacon', p: opts || { shape: 'rect', juice: '#E9C98B', cap: 'black', glass: '#ffffff' } };
    case 'fold': {
      const tex = ['rinse','midwash','lightwash','blackdenim'].includes(colorKey) ? 'denim' : T.tex;
      return { kind: 'fold', p: { type: T.fold, color: hex, tex } };
    }
    case 'shoe': {
      // the studio sneaker has 3 material variants; tint with the colourway (light tints keep the texture readable)
      const v = h % 3;
      return { kind: 'shoe', p: { v, yaw: (h % 2 ? 1 : -1) * (0.38 + (h % 7) * 0.04), tint: colorKey === 'white' ? '#F4F2EE' : hex } };
    }
    case 'bangle': case 'ring': case 'necklace': case 'watch':
      return { kind: T.kind, p: { metal: METAL[colorKey] || 'silver', color: hex, small: type === 'earrings' } };
    case 'lipstick': return { kind: 'lipstick', p: { color: LIP[colorKey] || hex, beauty: type === 'beauty' } };
    default: return { kind: T.kind, p: { color: hex } };
  }
}

// Houses that get the couture serif on product names; everything else (sportswear, streetwear,
// outdoor, denim, high street) gets the clean grotesk. The storefront reads this from brands.tier.
export const LUXURY = new Set(['chanel', 'dior', 'louis-vuitton', 'cartier', 'celine', 'burberry', 'ysl-beauty', 'versace', 'valentino',
  'maison-margiela', 'comme-des-garcons', 'moncler', 'chrome-hearts', 'enfants-riches-deprimes', 'balenciaga', 'acne-studios',
  'jean-paul-gaultier', 'azzaro']);

export function buildCatalog() {
  const brands = [], products = [];
  // the five 2026 houses go after the original thirty; a brand may set its own size limit (max)
  [...BRANDS, ...NEW_BRANDS].forEach((b, bi) => {
    brands.push({ slug: b.slug, name: b.name, city_en: b.city[0], city_mn: b.city[1], blurb_en: b.blurb[0], blurb_mn: b.blurb[1], tier: LUXURY.has(b.slug) ? 'luxury' : 'street', sort: bi });
    let lines = [...b.lines, ...(MORE[b.slug] || [])];
    // Nike: the full signature basketball lines replace the earlier single Kobe / KD / LeBron entries
    if (b.slug === 'nike') lines = [...NIKE_SIGNATURE, ...lines.filter(l => !['Kobe ', 'KD ', 'LeBron '].some(w => l[0].startsWith(w)))];
    const max = b.slug === 'nike' ? 160 : b.max || PER_BRAND;
    const seen = new Set(); let n = 0;
    for (const [model, type, cny, variants, opts] of lines) {
      const T = TYPES[type];
      const list = typeof variants === 'string' ? variants.split(/\s+/) : variants;
      for (const v of list) {
        if (n >= max) break;
        let label = null, colorKey = null, price = cny, stockx = null;
        if (typeof v === 'string') colorKey = v;
        else { [label, price, colorKey, stockx] = [v[0], v[1] ?? cny, v[2] || null, v[3] || null]; if (COLORS[label]) { colorKey = label; label = null; } }
        const C = colorKey ? COLORS[colorKey] : null;
        const suffixEn = label || (C && C[0]) || '';
        const suffixMn = label || (C && C[1]) || '';
        let id = slugify(b.slug + '-' + model + (suffixEn ? '-' + suffixEn : ''));
        while (seen.has(id)) id += '-x';
        seen.add(id);
        const sep = T.cat === 'fragrance' && label && !colorKey ? ', ' : ' — ';
        // fragrance sizes in Mongolian: "100 ml" → "100 мл"
        const mnLabel = suffixMn.replace(/\bml\b/, 'мл');
        const r = renderParams(type, colorKey, opts, id);
        products.push({
          id, brand_slug: b.slug, line: model, type, cat: T.cat,
          name_en: suffixEn ? model + sep + suffixEn : model,
          name_mn: suffixMn ? model + sep + mnLabel : model,
          color_key: colorKey, variant: label,
          cny: price, weight_kg: T.w, len_cm: T.box[0], wid_cm: T.box[1], hei_cm: T.box[2],
          sizes: JSON.stringify(SIZE_RUNS[T.sizes]),
          img: 'assets/products/' + id + '.webp',
          render: JSON.stringify(r),
          featured: 0, sort: n, stockx
        });
        n++;
      }
      if (n >= max) break;
    }
  });
  // feature a varied first page: the first piece of each of 12 houses
  ['chanel','dior','nike','moncler','louis-vuitton','arcteryx','supreme','cartier','stone-island','maison-margiela','balenciaga','ysl-beauty']
    .forEach((s, i) => { const p = products.find(x => x.brand_slug === s); if (p) p.featured = 12 - i; });
  return { brands, products };
}
