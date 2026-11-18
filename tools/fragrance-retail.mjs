// LEVERA — official retail prices (US$, the houses' own US websites, checked 2026-11) for fragrance & beauty.
// Fragrance is priced like a Mongolian perfumery: retail × $ rate + customs duty + VAT + UBCab delivery
// (server/cargo.mjs priceProduct). Run after changing this table:
//   node tools/fragrance-retail.mjs            → writes retail_usd on matching products and re-prices
//   node tools/fragrance-retail.mjs --dry      → only lists what would change and what has no price
// A line maps to one price (any size / shade) or to { '100 ml': 140, '50 ml': 112 }.
export const RETAIL = {
  chanel: {
    'N°5 Eau de Parfum': { '100 ml': 190, '50 ml': 150, '35 ml': 120 },
    'N°5 L’Eau': { '100 ml': 175, '50 ml': 140 },
    'Coco Mademoiselle Eau de Parfum': { '100 ml': 190, '50 ml': 150, '35 ml': 120 },
    'Chance Eau Tendre': { '100 ml': 165, '50 ml': 130 },
    'Chance Eau Fraîche': { '100 ml': 165, '50 ml': 130 },
    'Bleu de Chanel Eau de Parfum': { '150 ml': 215, '100 ml': 175, '50 ml': 140 },
    'Bleu de Chanel Parfum': { '100 ml': 195, '50 ml': 150 },
    'Allure Homme Sport': { '100 ml': 135, '50 ml': 105 },
    'Gabrielle Essence': { '100 ml': 185 },
    'Rouge Allure Velvet Lipstick': 50, 'Rouge Coco Flash': 48, 'Les Beiges Healthy Glow Foundation': 70
  },
  dior: {
    'Sauvage Eau de Parfum': { '200 ml': 200, '100 ml': 140, '60 ml': 112 },
    'Sauvage Eau de Toilette': { '100 ml': 125, '60 ml': 100 },
    'Sauvage Elixir': { '60 ml': 185 },
    'Miss Dior Eau de Parfum': { '100 ml': 165, '50 ml': 135, '30 ml': 100 },
    'Miss Dior Blooming Bouquet': { '100 ml': 145, '50 ml': 115 },
    'J’adore Eau de Parfum': { '100 ml': 170, '50 ml': 135 },
    'Dior Homme Intense': { '100 ml': 150 }, 'Dior Homme Parfum': { '100 ml': 195 },
    'Fahrenheit Eau de Toilette': { '100 ml': 125 }, 'Hypnotic Poison Eau de Toilette': { '100 ml': 135 },
    'Rouge Dior Lipstick': 48, 'Dior Addict Lip Glow': 40
  },
  'jean-paul-gaultier': {
    'Le Male Eau de Toilette': { '200 ml': 160, '125 ml': 130, '75 ml': 105 },
    'Le Male Elixir': { '125 ml': 155, '75 ml': 125 }, 'Le Male Le Parfum': { '125 ml': 145, '75 ml': 120 },
    'Le Male Elixir Absolu': { '125 ml': 175 },
    'Le Beau Eau de Toilette': { '125 ml': 130, '75 ml': 105 }, 'Le Beau Le Parfum': { '125 ml': 145, '75 ml': 120 },
    'Le Beau Paradise Garden': { '125 ml': 145 },
    'Scandal Pour Homme': { '100 ml': 110, '50 ml': 85 }, 'Scandal Eau de Parfum': { '80 ml': 130, '50 ml': 100 },
    'La Belle Eau de Parfum': { '100 ml': 140, '50 ml': 110 }, 'La Belle Le Parfum': { '100 ml': 150 },
    'Gaultier Divine Eau de Parfum': { '100 ml': 150, '50 ml': 115 }
  },
  azzaro: {
    'The Most Wanted Parfum': { '100 ml': 125, '50 ml': 95 },
    'The Most Wanted Eau de Parfum Intense': { '100 ml': 115, '50 ml': 90 },
    'The Most Wanted Eau de Toilette Intense': { '100 ml': 105 },
    'Wanted Eau de Toilette': { '100 ml': 98, '50 ml': 75 }, 'Wanted Elixir': { '100 ml': 125 },
    'Forever Wanted Elixir': { '100 ml': 125, '50 ml': 95 }, 'Wanted by Night': { '100 ml': 105 },
    'Chrome Eau de Toilette': { '100 ml': 92, '50 ml': 72 }, 'Chrome Parfum': { '100 ml': 120 },
    'Chrome Extreme': { '100 ml': 100 }, 'Azzaro Pour Homme': { '100 ml': 80 }
  },
  burberry: {
    'Burberry Hero Eau de Toilette': { '100 ml': 120, '50 ml': 92 }, 'Burberry Hero Eau de Parfum': { '100 ml': 135 },
    'Her Eau de Parfum': { '100 ml': 150, '50 ml': 120 }, 'Goddess Eau de Parfum': { '100 ml': 160 }
  },
  'comme-des-garcons': { 'Comme des Garçons 2 Eau de Parfum': { '100 ml': 165 } },
  'maison-margiela': Object.fromEntries(['Jazz Club', 'By the Fireplace', 'Lazy Sunday Morning', 'Beach Walk', 'Coffee Break', 'Bubble Bath',
    'When the Rain Stops', 'Under the Lemon Trees', 'Autumn Vibes', 'Sailing Day', 'Matcha Meditation'].map(n => ['Replica ' + n, { '100 ml': 160, '30 ml': 82 }])),
  valentino: {
    'Born in Roma Uomo Intense': { '100 ml': 150, '50 ml': 115 }, 'Born in Roma Uomo Eau de Toilette': { '100 ml': 130, '50 ml': 100 },
    'Born in Roma Donna Eau de Parfum': { '100 ml': 160, '50 ml': 125 }, 'Born in Roma Donna Intense': { '100 ml': 170 },
    'Born in Roma Coral Fantasy': { '100 ml': 150 }, 'Born in Roma Yellow Dream': { '100 ml': 150 },
    'Valentino Uomo Eau de Toilette': { '100 ml': 120 }, 'Valentino Donna Eau de Parfum': { '100 ml': 150 },
    'Rouge Valentino Lipstick': 52
  },
  versace: {
    'Eros Eau de Toilette': { '200 ml': 140, '100 ml': 110, '50 ml': 85 }, 'Eros Eau de Parfum': { '100 ml': 125, '50 ml': 95 },
    'Eros Flame': { '100 ml': 118 }, 'Eros Energy': { '100 ml': 120 },
    'Dylan Blue Pour Homme': { '100 ml': 108, '50 ml': 84 }, 'Bright Crystal': { '90 ml': 108, '50 ml': 85 }, 'Pour Homme': { '100 ml': 96 }
  },
  'ysl-beauty': {
    'Libre Eau de Parfum': { '90 ml': 162, '50 ml': 130, '30 ml': 90 }, 'Libre Intense': { '90 ml': 172, '50 ml': 138 },
    'Libre Le Parfum': { '90 ml': 180 }, 'Libre Flowers & Flames': { '90 ml': 165 },
    'Y Eau de Parfum': { '200 ml': 195, '100 ml': 140, '60 ml': 115 }, 'Y Elixir': { '60 ml': 145 },
    'MYSLF Eau de Parfum': { '100 ml': 150, '60 ml': 122 },
    'Black Opium Eau de Parfum': { '90 ml': 160, '50 ml': 130, '30 ml': 88 }, 'Black Opium Le Parfum': { '90 ml': 175 },
    'La Nuit de L’Homme': { '100 ml': 125, '60 ml': 100 }, 'L’Homme Eau de Toilette': { '100 ml': 125, '60 ml': 100 },
    'Mon Paris Eau de Parfum': { '90 ml': 155, '50 ml': 125 }, 'Opium Eau de Parfum': { '90 ml': 160 },
    'Rouge Pur Couture Lipstick': 45, 'The Slim Velvet Radical': 45, 'Rouge Volupté Candy Glaze': 42, 'Touche Éclat Highlighter Pen': 42,
    'All Hours Foundation': 62, 'Loveshine Lip Oil Stick': 45, 'Make Me Blush': 42
  }
};

// New niche houses (2026-11): [model, { size: [Dewu ¥, US$] }]. Added through the admin API (same path as
// «+ Шинэ бараа»), photos then come from tools/fetch-photos.mjs --ids.
export const NICHE = [
  { name: 'Creed', city_en: 'Paris', city_mn: 'Парис', lines: [
    ['Aventus Eau de Parfum', { '100 ml': [2350, 495], '50 ml': [1750, 365] }],
    ['Absolu Aventus', { '100 ml': [2650, 545] }],
    ['Aventus for Her', { '75 ml': [2100, 435] }],
    ['Silver Mountain Water', { '100 ml': [2100, 445] }],
    ['Green Irish Tweed', { '100 ml': [2100, 445] }],
    ['Viking', { '100 ml': [2100, 445] }],
    ['Millésime Impérial', { '100 ml': [2100, 445] }]] },
  { name: 'Maison Francis Kurkdjian', city_en: 'Paris', city_mn: 'Парис', lines: [
    ['Baccarat Rouge 540 Eau de Parfum', { '70 ml': [1750, 335], '35 ml': [1250, 235] }],
    ['Baccarat Rouge 540 Extrait de Parfum', { '70 ml': [2300, 445] }],
    ['Grand Soir Eau de Parfum', { '70 ml': [1450, 265] }],
    ['Oud Satin Mood Eau de Parfum', { '70 ml': [1950, 375] }],
    ['Gentle Fluidity Gold', { '70 ml': [1400, 265] }],
    ['Aqua Universalis', { '70 ml': [1200, 225] }]] },
  { name: 'Tom Ford Beauty', city_en: 'New York', city_mn: 'Нью-Йорк', lines: [
    ['Oud Wood Eau de Parfum', { '100 ml': [2050, 395], '50 ml': [1500, 295] }],
    ['Tobacco Vanille Eau de Parfum', { '100 ml': [2050, 395], '50 ml': [1500, 295] }],
    ['Lost Cherry Eau de Parfum', { '100 ml': [2500, 495], '50 ml': [1950, 395] }],
    ['Tuscan Leather Eau de Parfum', { '50 ml': [1500, 295] }],
    ['Bitter Peach Eau de Parfum', { '50 ml': [1950, 395] }],
    ['Ombré Leather Eau de Parfum', { '100 ml': [950, 180] }],
    ['Noir Extreme Eau de Parfum', { '100 ml': [980, 185] }]] },
  { name: 'Parfums de Marly', city_en: 'Paris', city_mn: 'Парис', lines: [
    ['Layton Eau de Parfum', { '125 ml': [1650, 335] }],
    ['Pegasus Eau de Parfum', { '125 ml': [1650, 335] }],
    ['Herod Eau de Parfum', { '125 ml': [1650, 335] }],
    ['Althaïr Eau de Parfum', { '125 ml': [1700, 345] }],
    ['Delina Eau de Parfum', { '75 ml': [1750, 355] }],
    ['Valaya Eau de Parfum', { '75 ml': [1750, 355] }]] },
  { name: 'Kilian Paris', city_en: 'Paris', city_mn: 'Парис', lines: [
    ['Angels’ Share', { '50 ml': [1550, 295] }],
    ['Love, Don’t Be Shy', { '50 ml': [1550, 295] }],
    ['Black Phantom', { '50 ml': [1550, 295] }],
    ['Good Girl Gone Bad', { '50 ml': [1550, 295] }],
    ['Rolling in Love', { '50 ml': [1550, 295] }]] },
  { name: 'Xerjoff', city_en: 'Turin', city_mn: 'Турин', lines: [
    ['Naxos Eau de Parfum', { '100 ml': [1650, 325] }],
    ['Erba Pura Eau de Parfum', { '100 ml': [1650, 325] }],
    ['Alexandria II Parfum', { '100 ml': [2500, 495] }],
    ['40 Knots Eau de Parfum', { '100 ml': [1650, 325] }]] },
  { name: 'Le Labo', city_en: 'New York', city_mn: 'Нью-Йорк', lines: [
    ['Santal 33 Eau de Parfum', { '100 ml': [1750, 335], '50 ml': [1250, 240] }],
    ['Another 13 Eau de Parfum', { '100 ml': [1750, 335] }],
    ['Rose 31 Eau de Parfum', { '100 ml': [1750, 335] }],
    ['Thé Noir 29 Eau de Parfum', { '100 ml': [1750, 335] }]] },
  { name: 'Byredo', city_en: 'Stockholm', city_mn: 'Стокгольм', lines: [
    ['Gypsy Water Eau de Parfum', { '100 ml': [1500, 295], '50 ml': [1080, 210] }],
    ['Mojave Ghost Eau de Parfum', { '100 ml': [1500, 295] }],
    ['Bal d’Afrique Eau de Parfum', { '100 ml': [1500, 295] }],
    ['Blanche Eau de Parfum', { '100 ml': [1500, 295] }]] }
];

export function retailFor(brand, line, variant) {
  const v = RETAIL[brand]?.[line];
  if (v == null) return null;
  return typeof v === 'number' ? v : v[variant] ?? null;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('fragrance-retail.mjs')) {
  const dry = process.argv.includes('--dry');
  const dbm = await import('../server/db.mjs');
  await dbm.ready;
  const rows = await dbm.db.all("SELECT id, brand_slug, line, variant, retail_usd FROM products WHERE cat='fragrance'");
  let set = 0; const missing = [];
  for (const p of rows) {
    const usd = retailFor(p.brand_slug, p.line, p.variant);
    if (usd == null) { if (!p.retail_usd) missing.push(p.id); continue; }
    if (Number(p.retail_usd) !== usd) { set++; if (!dry) await dbm.db.run("UPDATE products SET retail_usd=?, price_source='official', updated_at=CURRENT_TIMESTAMP WHERE id=?", [usd, p.id]); }
  }
  if (!dry) await dbm.repriceAll();
  console.log((dry ? 'Would set ' : 'Set ') + set + ' official prices.' + (missing.length ? ' No official price for: ' + missing.join(', ') : ''));
  process.exit(0);
}
