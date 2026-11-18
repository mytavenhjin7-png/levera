/* LEVERA — checkout: recipient form, bag summary (with size fixes), order → QPay invoice, payment check */
(function () {
  const LV = window.LV, { $, T, esc, money, fill } = LV;
  const form = $('#coForm'), ack = $('#coAck'), submit = $('#coSubmit'), errEl = $('#coErr');
  let placing = false;
  // keep what the customer typed if they leave and come back
  const DRAFT = 'lv-co-draft';
  try { const d = JSON.parse(localStorage.getItem(DRAFT) || '{}'); for (const k of ['name', 'phone', 'address', 'note']) if (d[k]) form.elements[k].value = d[k]; if (d.district) form.dataset.district = d.district; } catch (e) {}
  form.addEventListener('input', () => { try { localStorage.setItem(DRAFT, JSON.stringify({ name: form.elements.name.value, phone: form.elements.phone.value, address: form.elements.address.value, note: form.elements.note.value, district: form.elements.district.value })); } catch (e) {} });

  function renderDistricts() {
    const sel = $('#coDistrict'), cur = sel.value || form.dataset.district || '';
    const list = T().districts, other = LV.t[LV.lang === 'mn' ? 'en' : 'mn'].districts;
    const idx = Math.max(0, Math.max(list.indexOf(cur), other.indexOf(cur)));
    sel.innerHTML = list.map((d, i) => '<option' + (i === idx ? ' selected' : '') + '>' + esc(d) + '</option>').join('');
  }
  function renderSummary() {
    if (!LV.products) return;
    const t = T(), items = LV.bag.items();
    if (!items.length && $('#coDone').hidden) {
      $('#coGrid').innerHTML = '<div class="d-empty"><h3>' + t.co_empty + '</h3><a class="btn ink" href="shop.html">' + t.co_continue + ' <span aria-hidden="true">→</span></a></div>';
      return;
    }
    $('#coItems').innerHTML = items.map((x, i) => {
      const p = LV.byId.get(x.id), sized = p.sizes.length > 1;
      return '<div class="co-item"><img src="' + esc(p.img) + '" alt=""><div><div class="d-brand">' + esc(p.brand) + '</div><div class="d-name">' + esc(LV.nm(p)) + '</div>' +
        '<div class="co-line mono">' + (sized ? '<label>' + t.p_size + ' <select data-size="' + i + '"' + (x.size ? '' : ' aria-invalid="true"') + '><option value="">—</option>' + p.sizes.map(s => '<option' + (s === x.size ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label> · ' : '') + '× ' + x.q + '</div></div>' +
        '<div class="d-price">' + money(p.price * x.q) + '</div></div>';
    }).join('');
    drawTotals(); refreshQuote();
  }
  // totals come from the server: rank discount and gift card are never worked out here
  let quote = null, giftCode = '', giftMsg = '';
  function drawTotals() {
    const t = T(), q = quote;
    $('#coTot').innerHTML = '<div><dt>' + t.co_delivery + '</dt><dd>' + t.co_included + '</dd></div>' +
      (q && q.rank_off ? '<div><dt>' + fill(t.rk_off, { r: t['rk_' + q.rank.key], p: q.rank.pct }) + '</dt><dd>−' + money(q.rank_off) + '</dd></div>' : '') +
      (q && q.gift_used ? '<div><dt>' + t.gc_k + '</dt><dd>−' + money(q.gift_used) + '</dd></div>' : '') +
      '<div class="sum"><dt>' + t.b_total + '</dt><dd>' + money(q ? q.total : LV.bag.total()) + '</dd></div>';
    let g = $('#coGift');
    if (!g) { $('#coTot').insertAdjacentHTML('afterend', '<div class="co-gift" id="coGift"><label class="mono" for="coGiftIn"></label><div><input id="coGiftIn" maxlength="24" autocomplete="off" placeholder="LV-XXXX-XXXX-XXXX"><button type="button" class="btn" id="coGiftGo"><span></span></button></div><p role="status"></p></div>'); g = $('#coGift'); }
    g.querySelector('label').textContent = t.gc_have; g.querySelector('button span').textContent = t.gc_apply; g.querySelector('p').textContent = giftMsg;
  }
  async function refreshQuote() {
    const items = LV.bag.items(); if (!items.length) return;
    try {
      const q = await LV.api('/api/checkout/quote', { method: 'POST', body: JSON.stringify({ items: items.map(x => ({ id: x.id, qty: x.q })), gift_code: giftCode }) });
      quote = q;
      if (giftCode) { if (!q.gift_ok) { giftMsg = T().gc_bad; giftCode = ''; } else giftMsg = fill(T().gc_left, { a: money(q.gift_balance - q.gift_used) }); }
      drawTotals();
    } catch (e) { if (e.status === 429) { giftMsg = T().acc_err_busy; drawTotals(); } }
  }
  document.addEventListener('click', e => { if (e.target.closest('#coGiftGo')) { giftCode = $('#coGiftIn').value.trim(); giftMsg = ''; refreshQuote(); } });
  document.addEventListener('lv:me', refreshQuote);
  // size changes from the summary write back to the bag
  $('#coItems').addEventListener('change', e => {
    const sel = e.target.closest('[data-size]'); if (!sel) return;
    const items = LV.bag.items(), x = items[+sel.dataset.size];
    LV.bag.setQ(+sel.dataset.size, 0); if (sel.value) LV.bag.add(x.id, sel.value, x.q); else LV.bag.add(x.id, null, x.q);
  });
  ack.addEventListener('change', () => { submit.disabled = !ack.checked || placing; });
  const showErr = m => { errEl.textContent = m; errEl.hidden = !m; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const t = T(), items = LV.bag.items();
    const name = form.elements.name.value.trim(), phone = form.elements.phone.value.replace(/\D/g, ''), address = form.elements.address.value.trim();
    if (!name || phone.length < 8 || address.length < 5) { showErr(t.co_err_req); return; }
    if (items.some(x => LV.byId.get(x.id).sizes.length > 1 && !x.size)) { showErr(t.co_err_size); return; }
    showErr(''); placing = true; submit.disabled = true; submit.classList.add('busy');
    try {
      const r = await LV.api('/api/orders', { method: 'POST', body: JSON.stringify({
        name, phone, address, district: form.elements.district.value, note: form.elements.note.value.trim(), ack: true, lang: LV.lang, gift_code: giftCode,
        items: items.map(x => ({ id: x.id, size: x.size, qty: x.q }))
      }) });
      LV.bag.clear(); try { localStorage.removeItem(DRAFT); } catch (e2) {}
      done(r);
    } catch (err) { showErr(err.status && err.status < 500 && err.message ? err.message : t.co_err_net); }
    finally { placing = false; submit.classList.remove('busy'); submit.disabled = !ack.checked; }
  });

  let order = null;
  function done(r) {
    order = r; $('#coGrid').hidden = true; $('#coDone').hidden = false; document.querySelector('.co-head').hidden = true;
    renderDone(); scrollTo({ top: 0 });
  }
  function renderDone() {
    if (!order) return;
    const t = T(), o = order.order, q = order.qpay;
    $('#coDone').innerHTML =
      '<div class="cd-head"><div class="eyebrow">' + t.co_done_k + '</div><h1>' + fill(t.co_done_h, { no: esc(o.no) }) + '</h1><p>' + t.co_done_p + '</p></div>' +
      '<div class="cd-grid"><div class="cd-pay">' + (o.payment === 'paid' ? '<h2>' + t.co_paid + '</h2>' : '<div class="mono" style="color:var(--accent)">QPay</div><h2>' + t.co_pay_h + '</h2><p>' + t.co_pay_p + '</p>' +
        (q && q.qr_image ? '<img class="qr" alt="QPay QR" src="data:image/png;base64,' + esc(q.qr_image) + '">' : '<canvas class="qr" id="qrC" width="240" height="240" aria-label="QR"></canvas>') +
        '<div class="amt">' + money(o.total) + '</div>') +
        (q && q.urls && q.urls.length ? '<div class="cd-banks">' + q.urls.slice(0, 12).map(u => '<a href="' + esc(u.link) + '" rel="noopener"><img alt="" src="' + esc(u.logo) + '"><span>' + esc(u.description || u.name) + '</span></a>').join('') + '</div>' : '') +
        (o.payment === 'paid' ? '' : order.demo ? '<p class="cd-demo">' + t.co_demo + '</p>' : '<button type="button" class="btn ink" id="cdCheck"><span>' + t.co_check + '</span></button><p class="cd-status" id="cdStatus" role="status"></p>') +
      '</div>' +
      '<div class="cd-items"><h2 class="mono">' + t.co_summary + ' · ' + esc(o.no) + '</h2>' + o.items.map(i => '<div class="co-item"><img src="' + esc(i.img) + '" alt=""><div><div class="d-brand">' + esc(i.brand) + '</div><div class="d-name">' + esc(LV.lang === 'mn' ? i.name_mn : i.name) + '</div><div class="co-line mono">' + (i.size && i.size !== 'One size' ? i.size + ' · ' : '') + '× ' + i.qty + '</div></div><div class="d-price">' + money(i.price * i.qty) + '</div></div>').join('') +
        '<dl class="co-tot"><div class="sum"><dt>' + t.b_total + '</dt><dd>' + money(o.total) + '</dd></div></dl>' +
        '<a class="btn" href="index.html?order=' + encodeURIComponent(o.no) + '#track"><span>' + t.co_track + '</span><span aria-hidden="true">→</span></a></div></div>';
    const c = $('#qrC'); if (c) drawDemoQR(c, o.no);
  }
  document.addEventListener('click', async e => {
    if (!e.target.closest('#cdCheck') || !order) return;
    const st = $('#cdStatus'), t = T();
    try { const r = await LV.api('/api/orders/' + encodeURIComponent(order.order.no) + '/check', { method: 'POST' }); st.textContent = r.payment === 'paid' ? t.co_paid : t.co_unpaid; }
    catch (err) { st.textContent = t.co_err_net; }
  });
  // illustrative QR for demo mode (not scannable)
  function drawDemoQR(c, seedStr) {
    const g = c.getContext('2d'), N = 29, s = c.width / N; let x = [...seedStr].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483647 || 7;
    const rnd = () => (x = x * 16807 % 2147483647) / 2147483647;
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#16171A';
    const inFinder = (i, j) => (i < 8 && j < 8) || (i > N - 9 && j < 8) || (i < 8 && j > N - 9);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!inFinder(i, j) && rnd() > .52) g.fillRect(i * s, j * s, s + .3, s + .3);
    const finder = (i, j) => { g.fillRect(i * s, j * s, 7 * s, 7 * s); g.fillStyle = '#fff'; g.fillRect((i + 1) * s, (j + 1) * s, 5 * s, 5 * s); g.fillStyle = '#16171A'; g.fillRect((i + 2) * s, (j + 2) * s, 3 * s, 3 * s); };
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  }

  document.addEventListener('lv:bag', renderSummary);
  document.addEventListener('lv:catalog', renderSummary);
  document.addEventListener('lv:lang', () => { renderDistricts(); renderSummary(); renderDone(); });
  renderDistricts();
})();
