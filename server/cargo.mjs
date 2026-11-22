// LEVERA — HiCargo cargo cost (Ereen warehouse → Ulaanbaatar branch).
// The formula is the one HiCargo's own calculator uses (hicargo.mn/calculate):
//   weight is rounded UP to the next 0.5 kg and charged per kg;
//   volume (m³) is charged in yuan per m³, rounded up to whole yuan, then converted at HiCargo's ¥ rate;
//   the larger of the two is charged (weight wins for anything under 0.01 m³);
//   weight price is rounded up to 50₮, volume price to 100₮.
// Live rates come from HiCargo's public GraphQL API (the same one their calculator reads).

const HICARGO_GQL = 'https://hasura.hicargo.mn/graphql';
export const EREEN_ID = 3;

export const roundUp = (n, step) => Math.ceil(n / step) * step;
export const toM3 = ([l, w, h]) => Math.ceil(1000 * (l * w * h) / 1e6) / 1000;

/** rates: { yuan: ₮ per ¥, kg: ₮ per kg, m3: ¥ per m³ } */
export function hicargoFee(weightKg, m3, rates) {
  const w = 0.5 * Math.ceil(weightKg / 0.5);
  const yuanForVolume = Math.ceil(m3 * rates.m3);
  const volumePrice = yuanForVolume * rates.yuan;
  const weightPrice = w * rates.kg;
  const byWeight = weightPrice >= volumePrice || m3 < 0.01;
  return {
    price: byWeight ? roundUp(weightPrice, 50) : roundUp(volumePrice, 100),
    basis: byWeight ? 'weight' : 'volume',
    chargedKg: w, m3,
    weightPrice: roundUp(weightPrice, 50),
    volumePrice: roundUp(volumePrice, 100),
    volumeYuan: yuanForVolume
  };
}

/** LEVERA service fee on the item price: service_fee_pct up to service_fee_high_from_mnt, service_fee_high_pct on
 *  the part above it (a ₮10M bag isn't charged the same 20% as ₮400k sneakers), and at least service_fee_min_mnt. */
export function serviceFee(goods, s) {
  const pct = s.service_fee_pct ?? 0, hi = s.service_fee_high_pct ?? pct, from = s.service_fee_high_from_mnt || Infinity;
  const fee = Math.min(goods, from) * pct / 100 + Math.max(0, goods - from) * hi / 100;
  return Math.max(fee, s.service_fee_min_mnt || 0);
}

/** Full LEVERA price for one product. s = settings object (numbers).
 *  Most pieces: Dewu ¥ price × rate + LEVERA service fee + HiCargo cargo + UBCab Express delivery.
 *  Perfume: Dewu ¥ × frag_mnt_per_cny, one all-in rate set from a real shelf price (¥478 → ₮470,000).
 *  Other beauty with an official retail price (retail_usd): what a Mongolian perfumery charges —
 *  retail × US$ rate + customs duty + VAT (+ frag_fee_pct) + delivery — never below the Dewu route with its fee. */
export function priceProduct(p, s) {
  const rates = { yuan: s.cargo_yuan, kg: s.cargo_kg, m3: s.cargo_m3 };
  const m3 = toM3([p.len_cm, p.wid_cm, p.hei_cm]);
  const cargo = hicargoFee(p.weight_kg, m3, rates);
  const local = s.local_delivery_mnt || 0;
  const goods = p.cny * s.goods_cny_rate;
  const china = (s.china_shipping_cny || 0) * s.goods_cny_rate;
  const fee = serviceFee(goods, s);
  const total = roundUp(goods + china + fee + cargo.price + local, 1000);
  const cost = Math.round(goods + china + cargo.price + local);
  // owner's rule: landed cost (China price × rate + China shipping + cargo + UB delivery) + markup_pct
  // (70.9% = ₮275,000 cost → ₮470,000 price). Applies to every piece when set.
  if (s.markup_pct > 0) {
    const shelf = roundUp(cost * (1 + s.markup_pct / 100), 1000);
    return { total: shelf, basis: 'markup', goods: Math.round(goods), china: Math.round(china), fee: shelf - cost, cargo, local, cost, margin: shelf - cost };
  }
  if (p.type === 'perfume' && s.frag_mnt_per_cny > 0) {
    const shelf = roundUp(p.cny * s.frag_mnt_per_cny, 1000);
    return { total: shelf, basis: 'frag', cargo, local, cost, margin: shelf - cost };
  }
  if (p.retail_usd > 0) {
    const retail = p.retail_usd * (s.usd_mnt_rate || 0);
    const duty = retail * (s.customs_duty_pct || 0) / 100;
    const vat = (retail + duty) * (s.vat_pct || 0) / 100;
    const extra = (retail + duty + vat) * (s.frag_fee_pct || 0) / 100;
    const shop = roundUp(retail + duty + vat + extra + local, 1000);
    if (shop >= total) return { total: shop, basis: 'retail', retail: Math.round(retail), duty: Math.round(duty), vat: Math.round(vat), extra: Math.round(extra), cargo, local, cost, margin: shop - cost };
  }
  return { total, basis: 'dewu', goods: Math.round(goods), china: Math.round(china), fee: Math.round(fee), cargo, local, cost, margin: total - cost };
}

async function gql(query) {
  const r = await fetch(HICARGO_GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://hicargo.mn' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error('HiCargo ' + r.status);
  const j = await r.json();
  if (j.errors) throw new Error('HiCargo: ' + j.errors.map(e => e.message).join('; '));
  return j.data;
}

/** Pull live rates for Ereen → branchId. Mirrors HiCargo's SDK: base rate + warehouse surcharges. */
export async function fetchHicargoRates(branchId = 1) {
  const d = await gql('query{ currency(where:{id:1}){ yuan kg m3 } res: fullListWarehouses { id name kg m3 type area_type is_active } }');
  const base = { yuan: +d.currency.yuan, kg: +d.currency.kg, m3: +d.currency.m3 };
  const adj = w => ({ kg: w.kg > 2000 ? w.kg - base.kg : w.kg, m3: w.m3 > 300 ? w.m3 - base.m3 : w.m3 });
  const from = d.res.find(w => +w.id === EREEN_ID), to = d.res.find(w => +w.id === +branchId);
  if (!from || !to) throw new Error('HiCargo warehouse not found');
  const a = adj(from), b = adj(to);
  const branches = d.res.filter(w => w.is_active && w.type !== 'china' && w.area_type === 1).map(w => ({ id: +w.id, name: w.name }));
  return { yuan: base.yuan, kg: base.kg + a.kg + b.kg, m3: base.m3 + a.m3 + b.m3, branch: to.name, branches };
}
