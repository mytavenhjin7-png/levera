/* LEVERA — product page: photo gallery, size picker, add to bag / buy now, details, rating link, related pieces.
   Reviews live on their own page (reviews.html?product=<id>). */
(function () {
  const LV = window.LV, { $, T, esc, money, fill } = LV;
  const id = new URLSearchParams(location.search).get('id') || '';
  let p = null, size = null, err = false;
  let rating = null;   // { count, avg } of this piece's published reviews

  async function load() {
    await LV.ready;
    p = LV.byId.get(id) || null;
    if (!p) { err = true; return render(); }
    if (p.sizes.length === 1) size = p.sizes[0];
    render();
    // the full gallery isn't in the shop-wide catalogue: fetch this piece's record (it carries the review summary too)
    try { const r = await LV.api('/api/products/' + encodeURIComponent(id)); if (r.product && r.product.imgs) p.imgs = r.product.imgs; if (r.reviews) rating = r.reviews; render(); }
    catch (e) {   // static hosting without the server: the galleries are published as assets/gallery.json
      try { const g = await (await fetch('assets/gallery.json')).json(); if (g[id]) { p.imgs = g[id]; render(); } } catch (e2) {}
    }
  }

  // "Love Bracelet, Classic — White Gold" → model + colourway, so the name reads on two clean lines
  const split = name => { const i = name.lastIndexOf(' — '); return i < 0 ? [name, ''] : [name.slice(0, i), name.slice(i + 3)]; };
  const tier = x => ((LV.brandMap.get(x.b) || {}).tier === 'street' ? 't-street' : 't-lux');

  // what the perfume smells of: family, then top / heart / base notes
  function fragBlock(t) {
    const n = p.ml && LV.fragNotes && LV.fragNotes(p.line); if (!n) return '';
    return '<section class="pdp-notes"><h2 class="mono">' + t.fn_h + '</h2><p class="fn-fam">' + esc(n.family) + '</p>' + (LV.fragStory ? '<p class="fn-story">' + esc(LV.fragStory(p.line)) + '</p>' : '') + '<dl>' +
      '<div><dt>' + t.fn_top + '</dt><dd>' + esc(n.top) + '</dd></div><div><dt>' + t.fn_heart + '</dt><dd>' + esc(n.heart) + '</dd></div><div><dt>' + t.fn_base + '</dt><dd>' + esc(n.base) + '</dd></div></dl><a class="pdp-sq" href="scent.html">' + t.sq_pdp + '</a></section>';
  }

  function render() {
    const t = T();
    if (err) {
      $('#pdp').innerHTML = '<div class="pdp-missing"><h1>' + t.p_notfound + '</h1><a class="btn ink" href="shop.html">' + t.p_back + ' <span aria-hidden="true">→</span></a></div>';
      return;
    }
    if (!p) return;
    const br = LV.brandMap.get(p.b), [model, colour] = split(LV.base(p)), mls = LV.sizesOf(p);
    document.title = p.brand + ' ' + LV.nm(p) + ' — LEVERA';
    $('#crumbs').innerHTML = '<a href="shop.html">' + t.nav_shop + '</a><span aria-hidden="true">/</span><a href="shop.html?brand=' + p.b + '">' + esc(p.brand) + '</a><span aria-hidden="true">/</span><a href="shop.html?brand=' + p.b + '&cat=' + p.cat + '">' + esc(LV.catLabel(p.cat)) + '</a>';
    const sized = p.sizes.length > 1;
    const row = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const s = rating, rvUrl = 'reviews.html?product=' + encodeURIComponent(p.id);
    $('#pdp').className = 'pdp wrap ' + tier(p);
    $('#pdp').innerHTML =
      gallery(t) +
      '<div class="pdp-info">' +
        '<a class="pdp-brand" href="shop.html?brand=' + p.b + '">' + esc(p.brand) + '</a>' +
        '<h1 class="pdp-name">' + esc(model) + (colour ? '<span class="pdp-col">' + esc(colour) + '</span>' : '') + '</h1>' +
        '<div class="pdp-type mono">' + esc(LV.typeLabel(p.type)) + ' · ' + esc(LV.catLabel(p.cat)) + '</div>' +
        '<a class="pdp-rating" href="' + rvUrl + '">' + (s && s.count ? LV.stars(s.avg) + '<span>' + s.avg.toFixed(1) + '</span><span class="mono">' + LV.rvCount(s.count) + '</span>' : '<span class="mono">' + t.rv_be_first + '</span>') + '<span class="mono pdp-rv-go">' + t.rv_see + ' →</span></a>' +
        '<div class="pdp-price' + (p.off ? ' on-sale' : '') + '">' + money(p.price) + (p.off ? '<s class="was">' + money(p.was) + '</s><span class="sale-pill">−' + p.off + '%</span>' : '') + '</div>' +
        '<p class="pdp-incl mono">' + (p.cat === 'fragrance' ? t.p_incl_frag : t.p_incl) + '</p>' +
        (mls.length ? '<fieldset class="pdp-sizes pdp-mls"><legend class="mono">' + t.p_size + '</legend><div class="sz">' + mls.map(x => '<a href="' + LV.url(x) + '"' + (x.id === p.id ? ' aria-current="true"' : '') + '><b>' + x.ml + ' ml</b><span>' + money(x.price) + '</span></a>').join('') + '</div></fieldset>' : '') +
        (sized ? '<fieldset class="pdp-sizes"><legend class="mono">' + t.p_size + '</legend>' + (['footwear', 'apparel'].includes(p.cat) ? '<button type="button" class="d-link sg-link" data-size-guide="' + p.cat + '">' + t.sg_h + '</button>' : '') + '<div class="sz">' + p.sizes.map(x => '<button type="button" data-sz="' + esc(x) + '" aria-pressed="' + (x === size) + '">' + esc(x) + '</button>').join('') + '</div><p class="sz-err" id="szErr" role="alert" hidden>' + t.p_pick_size + '</p></fieldset>' : '') +
        '<div class="pdp-cta"><button type="button" class="btn ink" id="pAdd"><span>' + t.quick + '</span><span aria-hidden="true">+</span></button><button type="button" class="btn" id="pBuy"><span>' + t.p_buy + '</span><span aria-hidden="true">→</span></button></div>' +
        '<div class="pdp-actions"><button type="button" class="pdp-act fav-btn" data-fav="' + esc(p.id) + '" aria-pressed="' + !!(LV.isSaved && LV.isSaved(p.id)) + '"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg><span class="mono">' + t.fav_save + '</span></button>' +
          '<button type="button" class="pdp-act" data-share><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg><span class="mono">' + t.share + '</span></button></div>' +
        '<a class="pdp-call" href="tel:+97699935918"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg><span>' + t.p_call + '</span><b>9993 5918</b></a>' +
        '<ul class="pdp-trust"><li>' + t.p_eta_v + '</li><li>QPay</li></ul>' +
        '<div class="pdp-sticky" id="pSticky"><span class="ps-price">' + money(p.price) + '</span><button type="button" class="btn ink" id="pBuy2"><span>' + t.p_order + '</span><span aria-hidden="true">→</span></button></div>' +
        fragBlock(t) +
        '<dl class="pdp-facts">' +
          row(t.p_origin, esc(p.brand) + (br ? ' · ' + esc(LV.lang === 'mn' ? br.city_mn : br.city_en) : '')) +
          row(t.p_cat, esc(LV.typeLabel(p.type))) +
          (colour ? row(t.p_colour, esc(colour)) : '') +
          row(t.p_eta, t.p_eta_v) +
        '</dl>' +
      '</div>';
    const rel = LV.uniq(LV.products.filter(x => x.b === p.b && x.id !== p.id && !(p.ml && x.line === p.line)));
    const same = rel.filter(x => x.line === p.line), other = rel.filter(x => x.line !== p.line);
    $('#relK').textContent = p.brand;
    $('#relH').textContent = fill(t.p_related, { b: p.brand });
    $('#relAll').href = 'shop.html?brand=' + p.b;
    $('#relGrid').innerHTML = same.concat(other).slice(0, 8).map(LV.card).join('');
    $('#related').hidden = false;
  }

  /* ---------- photo gallery ---------- */
  let shot = 0;
  const imgs = () => (p.imgs && p.imgs.length ? p.imgs : [p.img]);
  function gallery(t) {
    const list = imgs(), n = list.length; if (shot >= n) shot = 0;
    const arrow = (dir, label, path) => '<button type="button" class="g-arrow g-' + dir + '" data-g="' + dir + '" aria-label="' + label + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="' + path + '"/></svg></button>';
    return '<div class="pdp-media"><div class="pdp-frame" id="gFrame">' +
        list.map((u, i) => '<img src="' + esc(u) + '" alt="' + esc(p.brand + ' ' + p.en + (n > 1 ? ' — ' + fill(t.p_gallery, { i: i + 1, n }) : '')) + '"' + (i === shot ? '' : ' hidden') + (i ? ' loading="lazy"' : '') + ' decoding="async" onerror="this.style.visibility=\'hidden\'">').join('') +
        (list[0].startsWith('uploads/') ? '' : '<span class="illus">' + t.p_illus + '</span>') +
        (n > 1 ? arrow('prev', t.p_prev, 'M15 5l-7 7 7 7') + arrow('next', t.p_next, 'M9 5l7 7-7 7') + '<span class="g-count mono" aria-live="polite">' + (shot + 1) + ' / ' + n + '</span>' : '') +
      '</div>' +
      (n > 1 ? '<div class="g-thumbs" role="group" aria-label="' + esc(p.brand + ' ' + p.en) + '">' + list.map((u, i) => '<button type="button" data-shot="' + i + '" aria-pressed="' + (i === shot) + '" aria-label="' + fill(t.p_gallery, { i: i + 1, n }) + '"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></button>').join('') + '</div>' : '') +
    '</div>';
  }
  function show(i) {
    const list = imgs(), n = list.length; if (n < 2) return;
    shot = (i + n) % n;
    document.querySelectorAll('#gFrame > img').forEach((im, k) => { im.hidden = k !== shot; });
    document.querySelectorAll('[data-shot]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.shot === shot)));
    const c = $('.g-count'); if (c) c.textContent = (shot + 1) + ' / ' + n;
  }
  // swipe between photos on touch screens
  let sx = null;
  document.addEventListener('touchstart', e => { if (e.target.closest('#gFrame')) sx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) show(shot + (dx < 0 ? 1 : -1)); });
  document.addEventListener('keydown', e => {
    if (!p || lbOpen || e.target.closest('input, textarea, select') || document.querySelector('.cc.on, [aria-modal="true"]:not([hidden])')) return;
    if (e.key === 'ArrowRight') show(shot + 1); else if (e.key === 'ArrowLeft') show(shot - 1);
  });

  /* ---------- full-screen viewer: the whole photo, large, with every photo of the piece below ---------- */
  let lbOpen = false, lbLast = null;
  function lightbox(i) {
    const t = T(), list = imgs(), n = list.length;
    shot = (i + n) % n; show(shot);
    let el = $('#lb');
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="lb" id="lb" role="dialog" aria-modal="true" hidden></div>'); el = $('#lb'); }
    el.setAttribute('aria-label', p.brand + ' ' + LV.nm(p));
    el.innerHTML = '<button type="button" class="lb-x" data-lb="close" aria-label="' + (t.close || 'Close') + '"><svg width="16" height="16" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg></button>' +
      '<div class="lb-stage">' + (n > 1 ? '<button type="button" class="lb-arrow" data-lb="prev" aria-label="' + t.p_prev + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' : '') +
        '<img id="lbImg" src="' + esc(list[shot]) + '" alt="' + esc(p.brand + ' ' + p.en + ' — ' + fill(t.p_gallery, { i: shot + 1, n })) + '">' +
        (n > 1 ? '<button type="button" class="lb-arrow" data-lb="next" aria-label="' + t.p_next + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' : '') + '</div>' +
      '<div class="lb-foot"><span class="mono lb-count">' + (shot + 1) + ' / ' + n + '</span><div class="lb-thumbs">' +
        list.map((u, k) => '<button type="button" data-lb-shot="' + k + '" aria-pressed="' + (k === shot) + '" aria-label="' + fill(t.p_gallery, { i: k + 1, n }) + '"><img src="' + esc(u) + '" alt=""></button>').join('') + '</div></div>';
    if (!lbOpen) { lbLast = document.activeElement; el.hidden = false; document.documentElement.classList.add('lb-on'); lbOpen = true; }
    el.querySelector('[data-lb="close"]').focus({ preventScroll: true });
  }
  function closeLightbox() {
    const el = $('#lb'); if (!el || !lbOpen) return;
    el.hidden = true; lbOpen = false; document.documentElement.classList.remove('lb-on');
    if (lbLast && lbLast.focus) lbLast.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    if (!p) return;
    if (e.target.closest('#gFrame > img')) { lightbox(shot); return; }
    if (!lbOpen) return;
    const k = e.target.closest('[data-lb-shot]'); if (k) { lightbox(+k.dataset.lbShot); return; }
    const a = e.target.closest('[data-lb]');
    if (a) { a.dataset.lb === 'close' ? closeLightbox() : lightbox(shot + (a.dataset.lb === 'next' ? 1 : -1)); return; }
    if (e.target.id === 'lb' || e.target.classList.contains('lb-stage')) closeLightbox();   // click on the backdrop
  });
  document.addEventListener('keydown', e => {
    if (!lbOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lightbox(shot + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); lightbox(shot - 1); }
  }, true);

  document.addEventListener('click', e => {
    const z = e.target.closest('[data-sz]');
    if (z) { size = z.dataset.sz; document.querySelectorAll('[data-sz]').forEach(b => b.setAttribute('aria-pressed', String(b === z))); const er = $('#szErr'); if (er) er.hidden = true; return; }
    const g = e.target.closest('[data-g], [data-shot]');
    if (g) { show(g.dataset.shot != null ? +g.dataset.shot : shot + (g.dataset.g === 'next' ? 1 : -1)); return; }
    const add = e.target.closest('#pAdd, #pBuy, #pBuy2'); if (!add || !p) return;
    if (p.sizes.length > 1 && !size) { const er = $('#szErr'); er.hidden = false; er.closest('fieldset').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    LV.bag.add(p.id, size);
    if (add.id !== 'pAdd') location.href = 'checkout.html';
  });
  document.addEventListener('lv:lang', render);
  load();
})();
