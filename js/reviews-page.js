/* LEVERA — Reviews page: every customer review in one place.
   Filters: house, stars, sort; ?product=<id> narrows it to one piece. "Write a review" picks the piece
   (fixed when ?product= is set, otherwise searched from the catalogue). Sample reviews are labelled. */
(function () {
  const LV = window.LV, { $, T, esc, fill } = LV;
  const qs = new URLSearchParams(location.search);
  const st = { product: qs.get('product') || '', brand: qs.get('brand') || '', rating: 0, sort: 'recent', page: 1,
    list: [], total: 0, summary: null, samples: 0, offline: false,
    open: qs.get('write') === '1', pick: qs.get('product') || '', stars: 0, msg: '', ok: false, busy: false, find: '' };

  async function load(reset) {
    if (reset) { st.page = 1; st.list = []; }
    const p = new URLSearchParams({ page: st.page, sort: st.sort });
    if (st.product) p.set('product', st.product);
    if (st.brand) p.set('brand', st.brand);
    if (st.rating) p.set('rating', st.rating);
    try {
      const r = await LV.api('/api/reviews?' + p);
      st.list = reset ? r.reviews : st.list.concat(r.reviews);
      st.total = r.total; st.summary = r.summary; st.samples = r.samples; st.offline = false;
    } catch (e) { st.offline = true; }
    render();
  }

  const nm = x => (LV.lang === 'mn' ? x.mn || x.en : x.en);
  function render() {
    const t = T(), s = st.summary;
    document.title = t.rv_h + ' — LEVERA';
    if (st.offline) { $('#rvpList').innerHTML = '<li class="rvp-empty">' + t.rv_offline + '</li>'; return; }
    if (!s) return;
    // summary: real, published reviews only
    $('#rvpSum').innerHTML = s.count
      ? '<div class="rv-score"><b>' + s.avg.toFixed(1) + '</b><div>' + LV.stars(s.avg, true) + '<span class="mono">' + LV.rvCount(s.count) + '</span></div></div>' +
        '<ul class="rv-dist">' + [5, 4, 3, 2, 1].map(n => '<li><span class="mono">' + n + '</span>' + LV.STAR.replace('<svg', '<svg class="mini"') + '<span class="bar"><i style="width:' + (s.dist[n] / s.count * 100) + '%"></i></span><span class="mono n">' + s.dist[n] + '</span></li>').join('') + '</ul>'
      : '<p class="rv-none">' + t.rv_none_all + '</p>';
    // the piece, when filtered to one
    const prod = st.product && LV.byId.get(st.product);
    $('#rvpProduct').hidden = !prod;
    if (prod) $('#rvpProduct').innerHTML = '<a href="' + LV.url(prod) + '"><img src="' + esc(prod.img) + '" alt=""><span><span class="mono">' + esc(prod.brand) + '</span><b>' + esc(LV.nm(prod)) + '</b></span></a><button type="button" class="d-link" data-clear>' + t.rv_all + '</button>';
    $('#rvpNote').hidden = !st.samples;
    $('#rvpNote').textContent = fill(t.rv_sample_note, { n: st.samples });
    // filters
    $('#rvpBar').innerHTML =
      (st.product ? '' : '<label class="mono"><span class="sr-only">' + t.f_brand + '</span><select id="rvpBrand"><option value="">' + t.all_brands + '</option>' + LV.brands.map(b => '<option value="' + b.slug + '"' + (st.brand === b.slug ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('') + '</select></label>') +
      '<div class="rvp-chips" role="group" aria-label="' + t.rv_rating + '">' + [0, 5, 4, 3, 2, 1].map(n => '<button type="button" data-r="' + n + '" aria-pressed="' + (st.rating === n) + '">' + (n ? n + ' ★' : t.rv_any) + '</button>').join('') + '</div>' +
      '<label class="mono"><span class="sr-only">' + t.sort + '</span><select id="rvpSort">' + [['recent', t.rv_sort_recent], ['high', t.rv_sort_high], ['low', t.rv_sort_low]].map(([k, l]) => '<option value="' + k + '"' + (st.sort === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
      (st.open ? '' : '<button type="button" class="btn ink rv-write" id="rvpWrite"><span>' + t.rv_write + '</span><span aria-hidden="true">+</span></button>');
    $('#rvpForm').innerHTML = (st.ok ? '<p class="rv-msg ok" role="status">' + t.rv_thanks + '</p>' : '') + (st.open ? form() : '');
    $('#rvpList').innerHTML = st.list.length ? st.list.map(item).join('') : '<li class="rvp-empty">' + t.rv_none_filter + '</li>';
    $('#rvpMore').innerHTML = st.list.length < st.total ? '<button type="button" class="btn" id="rvpNext"><span>' + t.rv_more + '</span><span class="mono">' + st.list.length + ' / ' + st.total + '</span></button>' : '';
  }

  function item(r) {
    const t = T(), fit = r.fit ? t['fit_' + r.fit] : '', p = r.product;
    return '<li class="rvp-item">' +
      '<a class="rvp-thumb" href="product.html?id=' + encodeURIComponent(p.id) + '"><img src="' + esc(p.img) + '" alt="" loading="lazy" decoding="async"></a>' +
      '<div class="rvp-body">' +
        '<a class="rvp-prod" href="product.html?id=' + encodeURIComponent(p.id) + '"><span class="mono">' + esc(p.brand) + '</span> ' + esc(nm(p)) + '</a>' +
        '<div class="rv-top">' + LV.stars(r.rating) + (r.verified ? '<span class="rv-ver">' + t.rv_verified + '</span>' : '') + (r.sample ? '<span class="rv-sample">' + t.rv_sample + '</span>' : '') + '<time class="mono">' + esc(LV.rvDate(r.created_at)) + '</time></div>' +
        (r.title ? '<h3>' + esc(r.title) + '</h3>' : '') + '<p>' + esc(r.body) + '</p>' +
        '<div class="rv-meta"><b>' + esc(r.name) + '</b>' + (r.size ? '<span>' + t.rv_size + ': ' + esc(r.size) + '</span>' : '') + (fit ? '<span>' + fit + '</span>' : '') + '</div>' +
      '</div></li>';
  }

  /* ---------- write a review ---------- */
  function form() {
    const t = T(), p = st.pick && LV.byId.get(st.pick);
    const sized = p && p.sizes.length > 1, fitted = p && ['apparel', 'footwear'].includes(p.cat);
    const hits = !p && st.find.trim().length > 1 ? (LV.find ? LV.find(st.find) : LV.products.filter(x => (x.brand + ' ' + x.en).toLowerCase().includes(st.find.toLowerCase()))).slice(0, 6) : [];
    return '<form class="rv-form" id="rvForm" novalidate>' +
      '<fieldset><legend class="mono">' + t.rv_piece + '</legend>' + (p
        ? '<div class="rvp-picked"><img src="' + esc(p.img) + '" alt=""><span><span class="mono">' + esc(p.brand) + '</span><b>' + esc(LV.nm(p)) + '</b></span>' + (st.product ? '' : '<button type="button" class="d-link" data-unpick>' + t.rv_change + '</button>') + '</div>'
        : '<input id="rvFind" type="search" autocomplete="off" placeholder="' + esc(t.rv_find) + '" value="' + esc(st.find) + '"><div class="rvp-hits">' + hits.map(x => '<button type="button" data-pick="' + esc(x.id) + '"><img src="' + esc(x.img) + '" alt=""><span><span class="mono">' + esc(x.brand) + '</span>' + esc(LV.nm(x)) + '</span></button>').join('') + '</div>') +
      '</fieldset>' +
      '<fieldset class="rv-rate"><legend class="mono">' + t.rv_rating + '</legend><div class="rate">' +
        [1, 2, 3, 4, 5].map(n => '<button type="button" data-rate="' + n + '" aria-pressed="' + (st.stars >= n) + '" aria-label="' + fill(t.rv_stars, { n }) + '">' + LV.STAR + '</button>').join('') + '</div></fieldset>' +
      '<div class="rv-row"><label><span class="mono">' + t.rv_name + '</span><input name="name" maxlength="60" autocomplete="given-name" required></label>' +
        (sized ? '<label><span class="mono">' + t.rv_size + '</span><select name="size"><option value="">' + t.rv_any_size + '</option>' + p.sizes.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></label>' : '') + '</div>' +
      (fitted ? '<fieldset class="rv-fitq"><legend class="mono">' + t.rv_fit_q + '</legend>' + ['small', 'true', 'large'].map(k => '<label><input type="radio" name="fit" value="' + k + '"><span>' + t['fit_' + k] + '</span></label>').join('') + '</fieldset>' : '') +
      '<label><span class="mono">' + t.rv_title + '</span><input name="title" maxlength="120"></label>' +
      '<label><span class="mono">' + t.rv_body + '</span><textarea name="body" rows="5" maxlength="2000" required placeholder="' + esc(t.rv_body_ph) + '"></textarea></label>' +
      '<details class="rv-verify"><summary>' + t.rv_verify + '</summary><div class="rv-row"><label><span class="mono">' + t.rv_order + '</span><input name="order_no" placeholder="LV-26-0000" maxlength="20" autocomplete="off"></label><label><span class="mono">' + t.rv_phone + '</span><input name="phone" inputmode="tel" maxlength="20" autocomplete="tel"></label></div></details>' +
      (st.msg ? '<p class="rv-msg err" role="alert">' + esc(st.msg) + '</p>' : '') +
      '<div class="rv-actions"><button type="submit" class="btn ink"' + (st.busy ? ' disabled' : '') + '><span>' + t.rv_submit + '</span><span aria-hidden="true">→</span></button><button type="button" class="d-link" id="rvCancel">' + t.rv_cancel + '</button></div></form>';
  }
  // re-render without losing what the customer typed
  function keep() {
    const f = $('#rvForm'), vals = f ? Object.fromEntries(new FormData(f)) : {}, openV = f && f.querySelector('.rv-verify').open;
    const focusFind = document.activeElement && document.activeElement.id === 'rvFind';
    render();
    const nf = $('#rvForm'); if (!nf) return;
    for (const [k, v] of Object.entries(vals)) { const el = nf.elements[k]; if (!el) continue; if (el instanceof RadioNodeList) { for (const r of el) r.checked = r.value === v; } else el.value = v; }
    nf.querySelector('.rv-verify').open = !!openV;
    if (focusFind) { const i = $('#rvFind'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    const er = nf.querySelector('.rv-msg.err'); if (er) er.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  async function submit(f) {
    const t = T(), d = Object.fromEntries(new FormData(f));
    if (!st.pick) { st.msg = t.rv_err_piece; return keep(); }
    if (!st.stars) { st.msg = t.rv_err_rating; return keep(); }
    if (!String(d.name || '').trim() || String(d.body || '').trim().length < 10) { st.msg = t.rv_err_fields; return keep(); }
    st.busy = true; st.msg = ''; keep();
    try {
      await LV.api('/api/products/' + encodeURIComponent(st.pick) + '/reviews', { method: 'POST', body: JSON.stringify({ ...d, rating: st.stars, lang: LV.lang }) });
      Object.assign(st, { open: false, ok: true, stars: 0, busy: false, sort: 'recent', find: '' });
      if (!st.product) st.pick = '';
      await load(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      st.busy = false;
      st.msg = e.status === 429 ? t.rv_err_busy : e.status === 409 ? t.rv_err_dup : /order not found/.test(e.message) ? t.rv_err_order : fill(t.rv_err, { e: e.message });
      keep();
    }
  }

  document.addEventListener('click', e => {
    const r = e.target.closest('[data-r]'); if (r) { st.rating = +r.dataset.r; load(true); return; }
    if (e.target.closest('#rvpNext')) { st.page++; load(false); return; }
    if (e.target.closest('[data-clear]')) { st.product = ''; st.pick = ''; history.replaceState(null, '', 'reviews.html'); load(true); return; }
    if (e.target.closest('#rvpWrite')) { st.open = true; st.ok = false; st.msg = ''; render(); $('#rvForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (e.target.closest('#rvCancel')) { st.open = false; st.msg = ''; render(); return; }
    const pk = e.target.closest('[data-pick]'); if (pk) { st.pick = pk.dataset.pick; keep(); return; }
    if (e.target.closest('[data-unpick]')) { st.pick = ''; keep(); return; }
    const rate = e.target.closest('[data-rate]');
    if (rate) { st.stars = +rate.dataset.rate; document.querySelectorAll('[data-rate]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.rate <= st.stars))); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'rvpBrand') { st.brand = e.target.value; load(true); }
    if (e.target.id === 'rvpSort') { st.sort = e.target.value; load(true); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'rvFind') { st.find = e.target.value; keep(); } });
  document.addEventListener('submit', e => { if (e.target.id === 'rvForm') { e.preventDefault(); submit(e.target); } });
  document.addEventListener('lv:lang', () => (st.open ? keep() : render()));
  LV.ready.then(() => load(true));
})();
