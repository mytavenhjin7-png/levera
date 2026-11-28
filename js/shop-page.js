/* LEVERA — shop page: brand rail, filters (category, type, price, brand, search), sort, load-more, URL state */
(function () {
  const LV = window.LV, { $, T, esc, fill } = LV;
  const PAGE = 36;
  const PRICES = [[0, 150000], [150000, 500000], [500000, 1500000], [1500000, 5000000], [5000000, Infinity]];
  const CATS = ['apparel', 'footwear', 'bags', 'accessories', 'fragrance'];
  const params = new URLSearchParams(location.search);
  const st = {
    brand: params.get('brand') || '', cat: params.get('cat') || '', type: params.get('type') || '',
    price: params.get('price') || '', min: +params.get('min') || 0, max: +params.get('max') || 0, sale: params.get('sale') === '1' ? '1' : '', q: params.get('q') || '', sort: params.get('sort') || 'feat', shown: PAGE
  };
  $('#fq').value = st.q;

  function syncUrl() {
    const p = new URLSearchParams();
    for (const k of ['brand', 'cat', 'type', 'price', 'min', 'max', 'sale', 'q']) if (st[k]) p.set(k, st[k]);
    if (st.sort !== 'feat') p.set('sort', st.sort);
    history.replaceState(null, '', 'shop.html' + (p.toString() ? '?' + p : ''));
  }
  const inPrice = (p, i) => { const r = PRICES[i]; return p.price >= r[0] && p.price < r[1]; };
  // every filter except `skip`, so each group's counts reflect the other active filters
  function pass(p, skip) {
    if (skip !== 'brand' && st.brand && p.b !== st.brand) return false;
    if (skip !== 'cat' && st.cat && p.cat !== st.cat) return false;
    if (skip !== 'type' && st.type && p.type !== st.type) return false;
    if (skip !== 'price' && st.price !== '' && !inPrice(p, +st.price)) return false;
    if (skip !== 'price' && st.min && p.price < st.min) return false;
    if (skip !== 'price' && st.max && p.price > st.max) return false;
    if (skip !== 'sale' && st.sale && !p.off) return false;
    return true;
  }
  function results() {
    const base = st.q ? (LV.find(st.q) || []) : LV.products;
    const out = LV.uniq(base.filter(p => pass(p)));
    const s = st.sort;
    if (s === 'low') out.sort((a, b) => a.price - b.price);
    else if (s === 'high') out.sort((a, b) => b.price - a.price);
    else if (s === 'name') out.sort((a, b) => (a.brand + LV.nm(a)).localeCompare(b.brand + LV.nm(b)));
    else if (s === 'best') out.sort((a, b) => ((b.sold || 0) - (a.sold || 0)) || ((b.rv ? b.rv[1] : 0) - (a.rv ? a.rv[1] : 0)) || (b.feat - a.feat));
    else if (st.sale) out.sort((a, b) => (b.off - a.off) || (a.price - b.price));   // biggest discount first
    else if (!st.q) {
      // featured: interleave houses so the first screen is varied unless one brand is chosen
      if (st.brand) out.sort((a, b) => (b.feat - a.feat) || (a.sort - b.sort));
      else if (st.cat === 'fragrance' || st.type === 'perfume') {
        // fragrances: the world's best-known bottles first (one size each), then the rest mixed by house
        const fame = LV.fame;
        const seen = new Set(), top = [], rest = [];
        out.map(p => [fame(p), p]).sort((a, b) => a[0] - b[0]).forEach(([f, p]) => { if (f < 999 && !seen.has(f)) { seen.add(f); top.push(p); } else rest.push(p); });
        const by = {}; rest.forEach(p => (by[p.b] ||= []).push(p)); const lists = Object.values(by), mixed = []; for (let i = 0; mixed.length < rest.length; i++) lists.forEach(l => { if (l[i]) mixed.push(l[i]); });
        out.splice(0, out.length, ...top, ...mixed);
      } else { const by = {}; out.forEach(p => (by[p.b] ||= []).push(p)); const lists = Object.values(by), mixed = []; for (let i = 0; mixed.length < out.length; i++) lists.forEach(l => { if (l[i]) mixed.push(l[i]); }); out.splice(0, out.length, ...mixed); }
    }
    return out;
  }
  const base = () => st.q ? (LV.find(st.q) || []) : LV.products;
  const radio = (name, val, label, n, on) => '<label class="opt' + (n ? '' : ' zero') + '"><input type="radio" name="' + name + '" value="' + esc(val) + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + '</span><i>' + n + '</i></label>';

  function renderSide() {
    const t = T(), b = base();
    const cnt = (skip, fn) => LV.uniq(b.filter(p => pass(p, skip) && fn(p))).length;
    $('#fSale').innerHTML = radio('sale', '', t.f_all, cnt('sale', () => true), !st.sale) + radio('sale', '1', t.sale_only, cnt('sale', p => !!p.off), !!st.sale);
    $('#fCat').innerHTML = radio('cat', '', t.f_all, cnt('cat', () => true), !st.cat) + CATS.map(c => radio('cat', c, t['f_' + c], cnt('cat', p => p.cat === c), st.cat === c)).join('');
    const types = Object.keys(LV.types).filter(k => !st.cat || LV.types[k].cat === st.cat).map(k => [k, cnt('type', p => p.type === k)]).filter(x => x[1] || x[0] === st.type);
    $('#fType').innerHTML = radio('type', '', t.f_all, cnt('type', () => true), !st.type) + types.map(([k, n]) => radio('type', k, LV.typeLabel(k), n, st.type === k)).join('');
    // your own budget: from / to in ₮ (Enter or the button applies it); the ranges below are quick picks
    $('#fPrice').innerHTML = '<form class="pr-range" id="prRange" novalidate><label><span class="mono">' + t.pr_min + '</span><input name="min" inputmode="numeric" placeholder="0" value="' + (st.min ? st.min.toLocaleString('en-US') : '') + '"></label><span aria-hidden="true">–</span>' +
      '<label><span class="mono">' + t.pr_max + '</span><input name="max" inputmode="numeric" placeholder="∞" value="' + (st.max ? st.max.toLocaleString('en-US') : '') + '"></label><button type="submit" class="btn-s">' + t.pr_go + '</button></form>' +
      radio('price', '', t.price_any, cnt('price', () => true), st.price === '' && !st.min && !st.max) + PRICES.map((r, i) => radio('price', String(i), t['pr_' + (i + 1)], cnt('price', p => inPrice(p, i)), st.price === String(i) && !st.min && !st.max)).join('');
    $('#fBrand').innerHTML = radio('brand', '', t.all_brands, cnt('brand', () => true), !st.brand) + LV.brands.map(br => radio('brand', br.slug, br.name, cnt('brand', p => p.b === br.slug), st.brand === br.slug)).join('');
    $('#sort').innerHTML = ['feat', 'best', 'low', 'high', 'name'].map(k => '<option value="' + k + '"' + (st.sort === k ? ' selected' : '') + '>' + t['sort_' + k] + '</option>').join('');
  }
  function renderRail() {
    const t = T();
    $('#rail').innerHTML = '<a href="shop.html" data-brand=""' + (!st.brand ? ' aria-current="true"' : '') + '>' + t.all_brands + '</a>' +
      LV.brands.map(b => '<a href="shop.html?brand=' + b.slug + '" data-brand="' + b.slug + '"' + (st.brand === b.slug ? ' aria-current="true"' : '') + '>' + esc(b.name) + '</a>').join('');
    const cur = $('#rail [aria-current]'); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  // brand page header: logo tile, name, links (products, reviews, share) and the return notices
  // brand page: a dark editorial band — the logo large in white (or the name as a wordmark when there is no logo),
  // the brand's own products blurred behind it, one quiet meta row, and the return terms folded into one line
  function brandCard(b) {
    const t = T(), el = $('#bcard'), mn = LV.lang === 'mn';
    const own = LV.products.filter(p => p.b === b.slug);
    const frag = own.every(p => p.cat === 'fragrance');
    const kind = (window.LV_LOGOS || {})[b.slug];
    const bg = own.filter(p => p.img).slice(0, 3).map((p, i) => '<i style="background-image:url(' + JSON.stringify(p.img).slice(1, -1) + ')" class="bc-bg' + i + '"></i>').join('');
    const mark = kind
      ? '<div class="bc-mark" role="heading" aria-level="1"><img class="bc-img ' + (kind === 'm' ? 'mono' : 'col') + '" src="assets/logos/' + b.slug + '.png" alt="' + esc(b.name) + '"></div>'
      : '<div class="bc-mark bc-word" role="heading" aria-level="1">' + esc(b.name) + '</div>';
    const ico = d => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    const cover = (window.LV_COVERS || []).includes(b.slug);
    el.innerHTML = '<div class="bc-band' + (cover ? ' has-cover' : '') + '">' +
      (cover ? '<i class="bc-cover" aria-hidden="true" style="background-image:url(assets/covers/' + b.slug + '.jpg)"></i>' : '<div class="bc-bgs" aria-hidden="true">' + bg + '</div>') + '<div class="bc-in">' +
      '<div class="bc-k">' + esc(mn ? b.city_mn : b.city_en) + '<span></span>' + b.count + ' ' + t.bc_products.toLowerCase() + '</div>' + mark +
      '<div class="bc-acts"><a href="#grid" class="bc-pill solid">' + t.bc_shop_all + ' <span aria-hidden="true">↓</span></a>' +
      '<a href="reviews.html?brand=' + b.slug + '" class="bc-pill">' + ico('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>') + t.bc_reviews + '</a>' +
      '<button type="button" class="bc-pill" id="bcShare">' + ico('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5"/>') + '<span>' + t.bc_share + '</span></button></div>' +
      '</div></div>' +
      '<details class="bc-terms"><summary>' + ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>') + t.bc_terms + '</summary><p>' + t.bc_n1 + '</p><p>' + (frag ? t.bc_n_frag : t.bc_n2) + '</p></details>';
    $('#bcShare').addEventListener('click', async e => { const u = location.origin + location.pathname + '?brand=' + b.slug, s = e.currentTarget.querySelector('span');
      try { if (navigator.share) await navigator.share({ title: b.name + ' — LEVERA', url: u }); else { await navigator.clipboard.writeText(u); s.textContent = t.bc_copied; } } catch (x) {} });
  }
  function renderHead() {
    $('#bcard').hidden = !(st.brand && LV.brandMap.get(st.brand)); document.querySelector('.shop-hero').classList.toggle('is-brand', !$('#bcard').hidden);
    const t = T(), b = st.brand && LV.brandMap.get(st.brand);
    if (b) {
      $('#shK').textContent = (LV.lang === 'mn' ? b.city_mn : b.city_en) + ' · ' + fill(t.brand_n, { n: b.count });
      $('#shH').innerHTML = '<span class="bh">' + esc(b.name) + '</span>';
      $('#shP').textContent = LV.lang === 'mn' ? b.blurb_mn : b.blurb_en;
      document.title = b.name + ' — LEVERA';
      brandCard(b);
    } else if (st.sale) {
      $('#shK').textContent = t.sale_k;
      $('#shH').innerHTML = t.sale_h;
      $('#shP').textContent = t.sale_p;
      document.title = t.sale_k + ' — LEVERA';
    } else {
      $('#shK').textContent = st.cat ? t['f_' + st.cat] : t.shop_k;
      $('#shH').innerHTML = st.cat ? '<span>' + esc(t['f_' + st.cat]) + '</span>' : t.shop_h;
      $('#shP').textContent = t.shop_p;
      document.title = (st.cat ? t['f_' + st.cat] : t.shop_k) + ' — LEVERA';
    }
  }
  function renderChips() {
    const t = T(), chips = [];
    if (st.q) chips.push(['q', '“' + st.q + '”']);
    if (st.cat) chips.push(['cat', t['f_' + st.cat]]);
    if (st.type) chips.push(['type', LV.typeLabel(st.type)]);
    if (st.price !== '') chips.push(['price', t['pr_' + (+st.price + 1)]]);
    if (st.min || st.max) chips.push(['range', (st.min ? LV.money(st.min) : '₮0') + ' – ' + (st.max ? LV.money(st.max) : '∞')]);
    if (st.sale) chips.push(['sale', t.sale_k]);
    $('#active').innerHTML = chips.map(([k, l]) => '<button type="button" class="chip-x" data-clear="' + k + '">' + esc(l) + '<span aria-hidden="true">×</span></button>').join('');
  }
  let drawn = 0, lastList = null;
  function renderGrid(append) {
    const t = T(), list = append && lastList ? lastList : results(); lastList = list;
    $('#count').textContent = fill(t.results, { n: list.length.toLocaleString('en-US') });
    // "more" adds the next page under what is already there instead of redrawing the whole grid
    if (append && drawn) $('#grid').insertAdjacentHTML('beforeend', list.slice(drawn, st.shown).map(LV.card).join(''));
    else $('#grid').innerHTML = list.slice(0, st.shown).map(LV.card).join('');
    drawn = Math.min(st.shown, list.length);
    $('#empty').hidden = !!list.length; $('#empty').textContent = t.s_none;
    $('#more').hidden = list.length <= st.shown;
    $('#showing').textContent = list.length ? fill(t.showing, { a: Math.min(st.shown, list.length), b: list.length.toLocaleString('en-US') }) : '';
  }
  // the scent finder, offered wherever fragrance is being browsed
  function renderScent() {
    const box = $('#scentCta'); if (!box) return; const t = T();
    box.innerHTML = (st.cat === 'fragrance' || st.type === 'perfume') ? '<a class="sq-cta" href="scent.html"><div><b>' + t.sq_cta_h + '</b><span>' + t.sq_cta_p + '</span></div><i aria-hidden="true">→</i></a>' : '';
  }
  function render() { if (!LV.products) return; renderScent(); renderHead(); renderRail(); renderSide(); renderChips(); renderGrid(); syncUrl(); }
  function set(k, v) {
    if (k === 'range') { st.min = 0; st.max = 0; st.shown = PAGE; render(); return; }
    if (k === 'price') { st.min = 0; st.max = 0; }                    // a quick pick replaces your own range
    st[k] = v; if (k === 'cat' && st.type && LV.types[st.type] && LV.types[st.type].cat !== v && v) st.type = ''; st.shown = PAGE; render(); }

  $('#side').addEventListener('change', e => { const i = e.target; if (i.type === 'radio') set(i.name, i.value); });
  const num = v => Math.max(0, Math.round(+String(v || '').replace(/[^0-9]/g, '')) || 0);
  $('#side').addEventListener('submit', e => {
    if (e.target.id !== 'prRange') return; e.preventDefault();
    let a = num(e.target.elements.min.value), b = num(e.target.elements.max.value);
    if (a && b && a > b) [a, b] = [b, a];
    Object.assign(st, { min: a, max: b, price: '', shown: PAGE }); render();
  });
  // type 150000 and see 150,000 as you go
  $('#side').addEventListener('input', e => { const i = e.target; if (!i.closest || !i.closest('#prRange')) return; const n = num(i.value); i.value = n ? n.toLocaleString('en-US') : ''; });
  let qt = 0; $('#fq').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => set('q', e.target.value.trim()), 180); });
  $('#sort').addEventListener('change', e => set('sort', e.target.value));
  $('#more').addEventListener('click', () => { st.shown += PAGE; renderGrid(true); });
  // keep filling the page as the shopper scrolls near the end
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !$('#more').hidden) { st.shown += PAGE; renderGrid(true); } }, { rootMargin: '900px 0px' }).observe($('#more'));
  $('#active').addEventListener('click', e => { const b = e.target.closest('[data-clear]'); if (!b) return; if (b.dataset.clear === 'q') $('#fq').value = ''; set(b.dataset.clear, ''); });
  $('#clearAll').addEventListener('click', () => { Object.assign(st, { brand: '', cat: '', type: '', price: '', min: 0, max: 0, sale: '', q: '', shown: PAGE }); $('#fq').value = ''; render(); });
  $('#rail').addEventListener('click', e => { const a = e.target.closest('[data-brand]'); if (!a) return; e.preventDefault(); set('brand', a.dataset.brand); scrollTo({ top: 0, behavior: 'smooth' }); });

  // phone: filters slide in as a sheet
  const side = $('#side'), back = $('#sideBack');
  const openSide = () => { side.classList.add('open'); back.hidden = false; document.documentElement.style.overflow = 'hidden'; };
  const closeSide = () => { side.classList.remove('open'); back.hidden = true; document.documentElement.style.overflow = ''; };
  $('#openSide').addEventListener('click', openSide);
  // "Show" also applies a price range typed without pressing its own button
  $('#sideApply').addEventListener('click', () => {
    const f = $('#prRange'); if (!f) return;
    if (num(f.elements.min.value) !== st.min || num(f.elements.max.value) !== st.max) f.requestSubmit();
  });
  [$('#sideClose'), back, $('#sideApply')].forEach(el => el.addEventListener('click', closeSide));

  document.addEventListener('lv:catalog', render);
  document.addEventListener('lv:lang', render);
})();
