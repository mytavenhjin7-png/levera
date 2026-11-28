/* LEVERA — home page: brand marquee + list, the featured edit with category filters, live pricing explainer */
(function () {
  const LV = window.LV, { $, T, esc, money, fill } = LV;
  const marquee = $('#marquee');
  // marquee and corridor start from the hero list so the page looks complete before the API answers
  const names = LV.corridor.map(c => c.name);
  marquee.innerHTML = names.concat(names).map(n => '<span>' + esc(n) + '</span>').join('');

  let filter = 'all';
  const cats = ['all', 'apparel', 'footwear', 'bags', 'accessories', 'fragrance'];
  function renderFilters() { $('#filters').innerHTML = cats.map(c => '<button type="button" data-f="' + c + '" aria-pressed="' + (c === filter) + '">' + T()['f_' + c] + '</button>').join(''); }
  $('#filters').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.f; renderFilters(); renderGrid(); });
  document.addEventListener('click', e => { const a = e.target.closest('[data-filter]'); if (!a) return; filter = a.dataset.filter; renderFilters(); renderGrid(); });

  function edit() {
    // featured pieces first, then one piece per house in rotation so the grid stays varied
    const pool = LV.uniq(LV.products.filter(p => filter === 'all' || p.cat === filter));
    const feat = pool.filter(p => p.feat).sort((a, b) => b.feat - a.feat);
    const byBrand = new Map(); pool.filter(p => !p.feat).forEach(p => { if (!byBrand.has(p.b)) byBrand.set(p.b, []); byBrand.get(p.b).push(p); });
    // always whole rows: 12 pieces, rounded up to what the grid shows per row at this width
    const cols = getComputedStyle($('#grid')).gridTemplateColumns.split(' ').length || 4, want = Math.ceil(12 / cols) * cols;
    // one colourway per model, so the same sneaker never shows twice
    const seen = new Set(), add = p => { const k = p.b + '|' + (p.line || LV.base(p)); if (seen.has(k) || out.length >= want) return; seen.add(k); out.push(p); };
    const out = [];
    // fragrances: the best-known bottles first
    if (filter === 'fragrance') pool.map(p => [LV.fame(p), p]).filter(x => x[0] < 999).sort((x, y) => x[0] - y[0]).forEach(x => add(x[1]));
    // the 'all' view mixes categories in a fixed rhythm so the first screen shows a multi-brand store, not a sneaker shop:
    // fragrance, clothing, footwear, fragrance, bags/accessories, clothing, footwear, ...
    if (filter === 'all') {
      const q = {}, take = c => { const l = q[c]; while (l && l.length) { const p = l.shift(); const before = out.length; add(p); if (out.length > before) return true; } return false; };
      for (const c of ['fragrance', 'apparel', 'footwear', 'bags', 'accessories']) {
        const inCat = pool.filter(p => p.cat === c), rot = [], bb = new Map();
        inCat.filter(p => !p.feat).forEach(p => { if (!bb.has(p.b)) bb.set(p.b, []); bb.get(p.b).push(p); });
        for (let r = 0; r < 40; r++) for (const l of bb.values()) if (l[r]) rot.push(l[r]);
        const famous = c === 'fragrance' ? inCat.filter(p => LV.fame(p) >= 16 && LV.fame(p) < 999).sort((x, y) => LV.fame(x) - LV.fame(y)) : [];
        q[c] = [...famous, ...inCat.filter(p => p.feat).sort((x, y) => y.feat - x.feat), ...rot];
      }
      const rhythm = ['fragrance', 'apparel', 'footwear', 'fragrance', 'bags', 'apparel', 'footwear', 'accessories'];
      for (let i = 0; out.length < want && i < want * 4; i++) take(rhythm[i % rhythm.length]) || take('fragrance') || take('apparel') || take('footwear');
      return out.slice(0, want);
    }
    feat.forEach(add); let round = 0;
    while (out.length < want && round < 60) { for (const list of byBrand.values()) if (list[round]) add(list[round]); round++; }
    return out.slice(0, want);
  }
  function renderGrid() {
    if (!LV.products) return;
    $('#grid').innerHTML = edit().map(LV.card).join('');
    const n = filter === 'all' ? LV.products.length : LV.products.filter(p => p.cat === filter).length;
    const more = $('#editMore'); more.href = 'shop.html' + (filter === 'all' ? '' : '?cat=' + filter);
    more.querySelector('span').textContent = fill(T().view_all, { n: n.toLocaleString('en-US') });
  }
  function renderHouses() {
    if (!LV.brands) return;
    $('#houseList').innerHTML = LV.brands.map((b, i) =>
      '<a class="house" href="shop.html?brand=' + b.slug + '" style="--i:' + i + '"><span class="n mono">' + String(i + 1).padStart(2, '0') + '</span><span class="name">' + esc(b.name) + '</span><span class="cat mono">' + esc(LV.lang === 'mn' ? b.city_mn : b.city_en) + ' · ' + b.count + '</span><span class="arr" aria-hidden="true">→</span></a>').join('');
    const fb = $('#fBrands'); if (fb) fb.innerHTML = LV.brands.map(b => '<li><a href="shop.html?brand=' + b.slug + '">' + esc(b.name) + '</a></li>').join('');
  }
  function renderAll() { renderFilters(); renderGrid(); renderHouses(); }
  let lastW = innerWidth;
  addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 80) { lastW = innerWidth; renderGrid(); } }, { passive: true });
  document.addEventListener('lv:lang', renderAll);
  document.addEventListener('lv:catalog', () => {
    const all = LV.brands.map(b => b.name);
    marquee.innerHTML = all.concat(all).map(n => '<span>' + esc(n) + '</span>').join('');
    $('#statCount').textContent = LV.products.length.toLocaleString('en-US');
    renderAll();
  });
  renderFilters();

  const nav = $('#nav'), hero = document.getElementById('hero');
  const onScroll = () => { nav.classList.toggle('solid', window.scrollY > (hero.offsetHeight - innerHeight * 1.4)); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
