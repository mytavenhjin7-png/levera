/* LEVERA — shared store runtime for every page: catalogue from the API, language switch, product cards,
   search overlay, bag drawer (with sizes), toast and scroll reveals. */
(function () {
  const LV = window.LV;
  const API = (window.LEVERA_API || '').replace(/\/$/, '');
  const $ = (s, r = document) => r.querySelector(s);
  const T = () => LV.t[LV.lang];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₮' + Math.round(n || 0).toLocaleString('en-US');
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  Object.assign(LV, { $, T, esc, money, fill });

  /* ---------- API + catalogue ---------- */
  LV.api = async (path, opts = {}) => {
    const r = await fetch(API + path, { credentials: 'include', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(data.error || r.status); e.status = r.status; throw e; }
    return data;
  };
  LV.byId = new Map(); LV.brandMap = new Map();
  LV.nm = p => LV.lang === 'mn' ? p.mn : p.en;
  LV.brandName = p => (LV.brandMap.get(p.b) || {}).name || p.b;
  LV.typeLabel = t => { const x = (LV.types || {})[t]; return x ? (LV.lang === 'mn' ? x.mn : x.en) : t; };
  LV.catLabel = c => T()['f_' + c] || c;
  LV.ready = (async () => {
    let data;
    try { data = await LV.api('/api/catalog'); }
    catch (e) { data = await (await fetch('assets/catalog.json')).json(); data.offline = true; }   // static hosting fallback
    LV.brands = data.brands; LV.settings = data.settings; LV.types = data.types || {}; LV.offline = !!data.offline;
    LV.brands.forEach(b => LV.brandMap.set(b.slug, b));
    LV.products = data.products; LV.products.forEach(p => { p.brand = LV.brandName(p); LV.byId.set(p.id, p); });
    // a perfume in several sizes is one piece with an ml choice: each size stays its own product (own price, own bag line)
    LV.fam = new Map();
    LV.products.forEach(p => { const m = p.type === 'perfume' && /, (\d+) ml$/.exec(p.en); if (!m) return; p.ml = +m[1]; const k = p.b + '|' + p.line; if (!LV.fam.has(k)) LV.fam.set(k, []); LV.fam.get(k).push(p); });
    LV.fam.forEach(l => l.sort((a, b) => a.ml - b.ml));
    LV.houses = LV.brands.map(b => [b.name, b.city_en, b.city_mn, b.slug, b.count]);
    document.dispatchEvent(new CustomEvent('lv:catalog'));
    return LV;
  })();

  /* ---------- product card ---------- */
  const initials = b => b.replace(/[’']/g, '').split(/\s+/).map(w => w[0]).join('').slice(0, 3);
  LV.url = p => 'product.html?id=' + encodeURIComponent(p.id);
  LV.sizesOf = p => (p.ml && LV.fam.get(p.b + '|' + p.line)) || [];
  // one entry per perfume in a list: its smallest size in that list, so the card shows the entry price
  LV.uniq = list => { const best = new Map(); for (const p of list) if (p.ml) { const k = p.b + '|' + p.line, c = best.get(k); if (!c || p.ml < c.ml) best.set(k, p); } return list.filter(p => !p.ml || best.get(p.b + '|' + p.line) === p); };
  LV.base = p => (p.ml ? LV.nm(p).replace(/, \d+ (ml|мл)$/, '') : LV.nm(p));
  LV.card = (p, i = 99) => {
    const t = T(), sized = p.sizes.length > 1;
    return '<article class="card ' + ((LV.brandMap.get(p.b) || {}).tier === 'street' ? 't-street' : 't-lux') + '" data-id="' + esc(p.id) + '">' +
      '<div class="frame">' +
        '<span class="ph"><b>' + esc(initials(p.brand)) + '</b></span>' +
        '<a class="frame-link" href="' + LV.url(p) + '" tabindex="-1" aria-hidden="true"><img loading="' + (i < 8 ? 'eager' : 'lazy') + '" decoding="async" alt="" src="' + esc(p.img) + '" onload="this.classList.add(\'ready\')"></a>' +
        (p.off ? '<span class="tag sale">−' + p.off + '%</span>' : p.feat ? '<span class="tag">' + t.isNew + '</span>' : '') +
        '<button type="button" class="fav" data-fav="' + esc(p.id) + '" aria-pressed="' + !!(LV.isSaved && LV.isSaved(p.id)) + '" aria-label="' + esc(t.fav_add || 'Save') + '"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg></button>' +
        '<span class="eta">' + t.days + '</span>' +
        '<div class="quick-wrap">' +
          (sized ? '<div class="sizes" role="group" aria-label="' + t.p_size + '">' + p.sizes.map(s => '<button type="button" data-add="' + esc(p.id) + '" data-size="' + esc(s) + '">' + esc(s) + '</button>').join('') + '</div>' : '') +
          '<button class="quick" type="button" ' + (sized ? 'data-pick' : 'data-add="' + esc(p.id) + '"') + '>' + (sized ? t.p_size + ' · ' + t.quick : t.quick) + '</button>' +
        '</div>' +
      '</div>' +
      '<a class="meta" href="' + LV.url(p) + '"><div style="min-width:0"><div class="brand">' + esc(p.brand) + '</div><div class="title">' + esc(LV.base(p)) + '</div>' +
        (LV.sizesOf(p).length ? '<div class="mls">' + LV.sizesOf(p).map(x => x.id === p.id ? '<b>' + x.ml + '</b>' : x.ml).join(' · ') + ' ml</div>' : '') +
        (p.rv ? '<div class="rv-mini" aria-label="' + esc(LV.fill(t.rv_stars, { n: p.rv[0] })) + '"><span aria-hidden="true">★</span> ' + p.rv[0].toFixed(1) + ' <span>(' + p.rv[1] + ')</span></div>' : '') + '</div>' +
      '<div class="price' + (p.off ? ' on-sale' : '') + '">' + (p.off ? '<s class="was">' + money(p.was) + '</s>' : '') + money(p.price) + '<span class="incl">' + t.incl + '</span></div></a>' +
    '</article>';
  };
  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick) { const c = pick.closest('.card'); document.querySelectorAll('.card.picking').forEach(x => x !== c && x.classList.remove('picking')); c.classList.toggle('picking'); return; }
    const b = e.target.closest('[data-add]'); if (!b) return;
    LV.bag.add(b.dataset.add, b.dataset.size || null);
    const c = b.closest('.card'); if (c) { c.classList.remove('picking'); const q = c.querySelector('.quick'); if (q) { const old = q.textContent; q.textContent = T().added; setTimeout(() => { q.textContent = old; }, 1300); } }
  });

  /* ---------- injected chrome: search, bag, toast ---------- */
  const SEARCH_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  if (!$('#searchOv')) document.body.insertAdjacentHTML('beforeend',
    '<div class="ov" id="searchOv" hidden><div class="ov-back" data-close></div><div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="sTitle"><div class="wrap">' +
    '<div class="s-top"><h2 id="sTitle" class="sr-only" data-i18n="s_title">Хайлт</h2>' + SEARCH_ICON +
    '<input id="sInput" type="search" autocomplete="off" spellcheck="false" data-i18n-ph="s_ph" aria-controls="sResults"><span class="s-kbd" aria-hidden="true">ESC</span><button type="button" class="s-close" data-close data-i18n="close">Хаах</button></div>' +
    '<div class="s-body"><div class="s-side"><div class="mono" data-i18n="s_pop">Түгээмэл хайлт</div><div class="s-pills" id="sPop"></div><div class="mono" data-i18n="s_brands">Брэндүүд</div><div class="s-pills" id="sBrands"></div></div>' +
    '<div><div class="s-count mono" id="sCount" role="status" aria-live="polite"></div><div class="s-grid" id="sResults"></div><a class="s-all btn ink" id="sAll" href="shop.html"></a></div></div></div></div></div>');
  if (!$('#bagOv')) document.body.insertAdjacentHTML('beforeend',
    '<div class="ov" id="bagOv" hidden><div class="ov-back" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="bTitle">' +
    '<div class="d-head"><h2 id="bTitle"><span data-i18n="b_title" class="d-t">Сагс</span><span id="bCount">(0)</span></h2><button type="button" class="d-x" data-close aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg></button></div>' +
    '<div class="d-body" id="bItems"></div>' +
    '<div class="d-foot" id="bFoot" hidden><div class="d-row"><span data-i18n="b_total">Нийт</span><span id="bTotal">₮0</span></div><p class="d-note" id="bNote"></p>' +
    '<div class="d-final"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><path d="M10 5.5v5.5M10 13.6v.4"/></svg><div><b data-i18n="b_final_h"></b><span data-i18n="b_final_p"></span></div></div>' +
    '<a class="d-pay" href="checkout.html"><span data-i18n="b_checkout">Захиалга хийх</span><span aria-hidden="true">→</span></a></div></aside></div>');
  if (!$('#toast')) document.body.insertAdjacentHTML('beforeend', '<div class="toast" id="toast" role="status" aria-live="polite"><span id="toastMsg"></span><button type="button" id="toastBtn" data-i18n="b_view">Сагс үзэх</button></div>');

  // concierge chat markup (index.html has it inline; other pages get it here, before chat.js runs)
  if (!$('#cc')) document.body.insertAdjacentHTML('beforeend', "<button type=\"button\" class=\"cc-launch\" id=\"ccOpen\" aria-controls=\"cc\" aria-expanded=\"false\" aria-label=\"Ask LEVERA AI\"><span class=\"cc-av\" aria-hidden=\"true\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"8\" width=\"16\" height=\"11\" rx=\"3.5\"/><path d=\"M12 8V5\"/><circle cx=\"12\" cy=\"4\" r=\"1.2\"/><circle cx=\"9\" cy=\"13.5\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"13.5\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M2 12.5v2.5M22 12.5v2.5\"/></svg></span><span class=\"lbl\">Ask</span></button>\n<section class=\"cc\" id=\"cc\" role=\"dialog\" aria-labelledby=\"ccTitle\" aria-hidden=\"true\">\n  <div class=\"cc-head\">\n    <span class=\"cc-av\" aria-hidden=\"true\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"8\" width=\"16\" height=\"11\" rx=\"3.5\"/><path d=\"M12 8V5\"/><circle cx=\"12\" cy=\"4\" r=\"1.2\"/><circle cx=\"9\" cy=\"13.5\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"13.5\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M2 12.5v2.5M22 12.5v2.5\"/></svg></span>\n    <div><h2 id=\"ccTitle\">LEVERA AI</h2><span class=\"st\" data-i18n=\"cc_status\">AI туслах · Онлайн</span></div>\n    <button type=\"button\" class=\"cc-x\" id=\"ccClose\" aria-label=\"Close\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 14 14\" stroke=\"currentColor\" stroke-width=\"1.4\" aria-hidden=\"true\"><path d=\"M1 1l12 12M13 1L1 13\"/></svg></button>\n  </div>\n  <div class=\"cc-log\" id=\"ccLog\" aria-live=\"polite\"></div>\n  <div class=\"cc-sugs\" id=\"ccSugs\"></div>\n  <form class=\"cc-form\" id=\"ccForm\">\n    <label for=\"ccIn\" class=\"sr-only\" data-i18n=\"cc_ph\">Асуултаа бичнэ үү…</label>\n    <input id=\"ccIn\" type=\"text\" autocomplete=\"off\" data-i18n-ph=\"cc_ph\" placeholder=\"Асуултаа бичнэ үү…\">\n    <button type=\"submit\" class=\"cc-send\" id=\"ccSend\" aria-label=\"Send\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" aria-hidden=\"true\"><path d=\"M2 8h11M9 3.5 13.5 8 9 12.5\"/></svg></button>\n  </form>\n  <p class=\"cc-note\" data-i18n=\"cc_note\">AI туслах алдаа гаргаж болно. Яаралтай бол 9993 5918.</p>\n</section>");

  /* ---------- overlays ---------- */
  let openOv = null, lastFocus = null;
  function openO(ov, focusEl) {
    if (openOv && openOv !== ov) closeO(true);
    lastFocus = document.activeElement; ov.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('on')));
    document.documentElement.style.overflow = 'hidden'; openOv = ov;
    setTimeout(() => { if (focusEl) focusEl.focus(); }, 80);
  }
  function closeO(silent) {
    const ov = openOv; if (!ov) return;
    ov.classList.remove('on'); openOv = null; document.documentElement.style.overflow = '';
    setTimeout(() => { if (!ov.classList.contains('on')) ov.hidden = true; }, 600);
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', e => { if (openOv && e.target.closest('[data-close]')) closeO(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openOv) { e.preventDefault(); closeO(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Tab' && openOv) {
      const f = [...openOv.querySelectorAll('button:not([disabled]),input,select,a[href],[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- search ---------- */
  const sOv = $('#searchOv'), sIn = $('#sInput'), sRes = $('#sResults'), sCount = $('#sCount');
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`.]/g, '').replace(/°/g, 'o');
  const hayCache = new Map();
  const hay = p => { let h = hayCache.get(p.id); if (!h) { h = norm([p.brand, p.en, p.mn, p.line, LV.t.mn['f_' + p.cat], LV.t.en['f_' + p.cat], LV.typeLabel(p.type), (LV.types[p.type] || {}).en].join(' ')); hayCache.set(p.id, h); } return h; };
  LV.find = q => { const toks = norm(q).split(/\s+/).filter(Boolean); if (!toks.length) return null; return (LV.products || []).filter(p => { const h = hay(p); return toks.every(t => h.includes(t)); }); };
  function sCard(p) {
    const s = p.sizes.length > 1;
    return '<article class="s-card"><a class="s-thumb" href="' + LV.url(p) + '"><img alt="" loading="lazy" src="' + esc(p.img) + '"></a>' +
      '<a href="' + LV.url(p) + '"><div class="s-brand">' + esc(p.brand) + '</div><div class="s-name">' + esc(LV.nm(p)) + '</div><div class="s-price">' + money(p.price) + '</div></a>' +
      (s ? '<a class="s-add" href="' + LV.url(p) + '">' + T().p_size + ' →</a>' : '<button type="button" class="s-add" data-add="' + esc(p.id) + '">' + T().quick + '</button>') + '</article>';
  }
  function renderSearch() {
    if (!LV.products) { sCount.textContent = '…'; return; }
    const t = T(), q = sIn.value.trim(), res = LV.find(q), list = LV.uniq(res === null ? LV.products.filter(p => p.feat).concat(LV.products.filter(p => !p.feat)).slice(0, 40) : res).slice(0, res === null ? 12 : 24);
    sCount.textContent = res === null ? t.s_new : fill(t.s_count, { n: res.length, q });
    sRes.innerHTML = list.length ? list.slice(0, 24).map(sCard).join('') : '<p class="s-empty">' + t.s_none + '</p>';
    const all = $('#sAll'); all.hidden = !(res && res.length > 24);
    all.href = 'shop.html?q=' + encodeURIComponent(q); all.textContent = fill(t.view_all, { n: res ? res.length : 0 });
    const bq = norm(q);
    const brands = LV.brands.filter(b => !bq || norm(b.name).includes(bq) || bq.split(/\s+/).some(w => w && norm(b.name).includes(w)));
    $('#sBrands').innerHTML = (brands.length ? brands : LV.brands).slice(0, 16).map(b => '<a class="s-pill" href="shop.html?brand=' + b.slug + '">' + esc(b.name) + '</a>').join('');
    $('#sPop').innerHTML = ['Kobe', 'Moncler', 'Sauvage', 'Box Logo', 'Love', 'Samba', 'Chuck 70', '501', t.f_fragrance, t.f_bags].map(b => '<button type="button" class="s-pill" data-q="' + esc(b) + '">' + esc(b) + '</button>').join('');
  }
  sIn.addEventListener('input', renderSearch);
  sIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); location.href = 'shop.html?q=' + encodeURIComponent(sIn.value.trim()); } });
  sOv.addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (q) { sIn.value = q.dataset.q; renderSearch(); sIn.focus(); } });
  function openSearch() { renderSearch(); openO(sOv, sIn); }
  LV.openSearch = openSearch;
  document.addEventListener('lv:catalog', () => { if (openOv === sOv) renderSearch(); });

  /* ---------- bag ---------- */
  const KEY = 'lv-bag2', bOv = $('#bagOv'), bItems = $('#bItems'), bFoot = $('#bFoot');
  let bag = [];
  try { bag = (JSON.parse(localStorage.getItem(KEY) || '[]') || []).filter(x => x && x.id && x.q > 0); } catch (e) { bag = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) {} };
  const live = () => bag.filter(x => LV.byId.has(x.id));
  const count = () => bag.reduce((a, x) => a + x.q, 0);
  const total = () => live().reduce((a, x) => a + LV.byId.get(x.id).price * x.q, 0);
  const same = (x, id, size) => x.id === id && (x.size || null) === (size || null);
  function add(id, size, qty = 1) {
    const p = LV.byId.get(id); if (!p) return;
    if (p.sizes.length > 1 && !size) { location.href = LV.url(p); return; }
    if (p.sizes.length === 1) size = p.sizes[0];
    const it = bag.find(x => same(x, id, size));
    if (it) it.q = Math.min(9, it.q + qty); else bag.push({ id, size: size || null, q: qty });
    save(); renderBag(); toast(p, size); bump();
  }
  function setQ(i, q) { const it = bag[i]; if (!it) return; it.q = Math.max(0, Math.min(9, q)); bag = bag.filter(x => x.q > 0); save(); renderBag(); }
  function bump() { const c = $('#bagCount'); if (!c) return; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  function renderBag() {
    const t = T(), n = count();
    const bc = $('#bagCount'); if (bc) bc.textContent = n;
    $('#bCount').textContent = '(' + n + ')';
    const ob = $('#openBag'); if (ob) ob.setAttribute('aria-label', t.b_title + ' (' + n + ')');
    if (!LV.products) return;
    if (!bag.length) {
      bItems.innerHTML = '<div class="d-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><h3>' + t.b_empty_h + '</h3><p>' + t.b_empty_p + '</p><a class="btn ink" href="shop.html">' + t.cta + ' <span aria-hidden="true">→</span></a></div>';
    } else {
      bItems.innerHTML = bag.map((x, i) => {
        const p = LV.byId.get(x.id); if (!p) return '';
        return '<div class="d-item"><a class="d-thumb" href="' + LV.url(p) + '"><img alt="" src="' + esc(p.img) + '"></a>' +
          '<div class="d-meta"><div class="d-brand">' + esc(p.brand) + '</div><a class="d-name" href="' + LV.url(p) + '">' + esc(LV.nm(p)) + '</a>' +
          (x.size && p.sizes.length > 1 ? '<div class="d-size mono">' + fill(t.b_size, { s: esc(x.size) }) + '</div>' : '') +
          '<div class="d-qty" role="group" aria-label="' + t.b_qty + '"><button type="button" data-dec="' + i + '" aria-label="−">−</button><span>' + x.q + '</span><button type="button" data-inc="' + i + '" aria-label="+">+</button></div>' +
          '<button type="button" class="d-rm" data-rm="' + i + '">' + t.b_rm + '</button></div>' +
          '<div class="d-price">' + money(p.price * x.q) + '</div></div>';
      }).join('');
    }
    $('#bTotal').textContent = money(total());
    $('#bNote').textContent = t.b_note;
    bFoot.hidden = !bag.length;
    document.dispatchEvent(new CustomEvent('lv:bag'));
  }
  bItems.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.inc) setQ(+b.dataset.inc, bag[+b.dataset.inc].q + 1);
    else if (b.dataset.dec) setQ(+b.dataset.dec, bag[+b.dataset.dec].q - 1);
    else if (b.dataset.rm) setQ(+b.dataset.rm, 0);
  });
  function openBag() { renderBag(); openO(bOv, bOv.querySelector('.d-x')); }
  LV.bag = { add, open: openBag, items: () => live().map(x => ({ ...x })), clear: () => { bag = []; save(); renderBag(); }, setQ, total };

  /* ---------- toast ---------- */
  const tEl = $('#toast'); let tTimer = 0;
  function toast(p, size) { $('#toastMsg').textContent = fill(T().b_added, { x: p.brand + ' · ' + LV.nm(p) + (size && p.sizes.length > 1 ? ' · ' + size : '') }); tEl.classList.add('on'); clearTimeout(tTimer); tTimer = setTimeout(() => tEl.classList.remove('on'), 3200); }
  $('#toastBtn').addEventListener('click', () => { tEl.classList.remove('on'); openBag(); });

  /* ---------- header ---------- */
  const os = $('#openSearch'); if (os) os.addEventListener('click', openSearch);
  const obg = $('#openBag'); if (obg) obg.addEventListener('click', openBag);

  /* ---------- language ---------- */
  LV.applyLang = () => {
    const t = T(); document.documentElement.lang = LV.lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (t[k] != null) el.textContent = t[k]; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { const k = el.dataset.i18nHtml; if (t[k] != null) el.innerHTML = t[k]; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const k = el.dataset.i18nPh; if (t[k] != null) el.placeholder = t[k]; });
    const mn = $('#l-mn'), en = $('#l-en');
    if (mn) mn.setAttribute('aria-pressed', LV.lang === 'mn'); if (en) en.setAttribute('aria-pressed', LV.lang === 'en');
    renderBag(); if (openOv === sOv) renderSearch();
    document.dispatchEvent(new CustomEvent('lv:lang'));
    if (window.LV_onLang) window.LV_onLang();
  };
  LV.setLang = l => { LV.lang = l; try { localStorage.setItem('lv-lang', l); } catch (e) {} LV.applyLang(); };
  try { const s = localStorage.getItem('lv-lang'); if (s === 'en' || s === 'mn') LV.lang = s; } catch (e) {}
  document.addEventListener('click', e => { const b = e.target.closest('#l-mn, #l-en'); if (b) LV.setLang(b.id === 'l-en' ? 'en' : 'mn'); });
  LV.applyLang();
  document.addEventListener('lv:catalog', renderBag);

  /* ---------- scroll reveal ---------- */
  LV.reveal = (root = document) => {
    const els = root.querySelectorAll('.rv.pre');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.remove('pre')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.remove('pre'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  };
  LV.reveal();
})();

/* phone menu: on narrow screens the header links are hidden, so a menu button opens them as a full-screen list */
(function () {
  const links = document.querySelector('.nav-links'), right = document.querySelector('.nav-right');
  if (!links || !right || document.getElementById('mMenuBtn')) return;
  right.insertAdjacentHTML('afterbegin', '<button class="icon-btn m-menu-btn" type="button" id="mMenuBtn" aria-label="Menu" aria-controls="mMenu" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>');
  document.body.insertAdjacentHTML('beforeend', '<nav class="m-menu" id="mMenu" aria-label="Menu" hidden><button class="m-menu-x" type="button" aria-label="Close"><svg width="16" height="16" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg></button><div class="m-menu-links">' + links.innerHTML + '</div>' +
    // on a phone the header keeps only menu, search and bag: account, saved pieces and language live here
    '<div class="m-menu-extra"><a href="account.html" data-i18n="acc_k">Миний бүртгэл</a><a href="saved.html" data-i18n="fav_page">Хадгалсан</a><a href="gift.html" data-i18n="gc_k">Бэлгийн карт</a></div>' +
    '<div class="m-menu-lang" role="group" aria-label="Language"><button type="button" data-setlang="mn">MN</button><button type="button" data-setlang="en">EN</button></div></nav>');
  const btn = document.getElementById('mMenuBtn'), menu = document.getElementById('mMenu');
  const set = open => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); document.documentElement.classList.toggle('m-menu-on', open); if (open) menu.querySelector('a').focus(); else btn.focus(); };
  btn.addEventListener('click', () => set(menu.hidden));
  const syncLang = () => menu.querySelectorAll('[data-setlang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setlang === (window.LV && LV.lang))));
  menu.addEventListener('click', e => {
    const l = e.target.closest('[data-setlang]'); if (l) { LV.setLang(l.dataset.setlang); syncLang(); return; }
    if (e.target.closest('.m-menu-x') || e.target.closest('a')) set(false);
  });
  document.addEventListener('lv:lang', syncLang); syncLang();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) set(false); });
  if (window.LV && LV.applyLang) LV.applyLang();   // translate the copied links
})();
