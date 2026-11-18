/* LEVERA — gift card page: choose an amount, pay with QPay, get the code (order number + phone unlock it). */
(function () {
  const LV = window.LV, { $, T, esc, money, fill } = LV;
  const AMOUNTS = [10000, 20000, 30000, 50000, 100000, 150000, 200000];
  const st = { amount: 50000, order: null, msg: '', code: null };
  function page() {
    const t = T(), box = $('#gift'); if (!box) return;
    document.title = t.gc_k + ' — LEVERA';
    if (st.order) {
      const o = st.order.order, q = st.order.qpay;
      box.innerHTML = '<div class="gc-card"><div class="eyebrow">' + t.gc_k + ' · ' + esc(o.no) + '</div><h1>' + money(o.total) + '</h1>' +
        (q && q.qr_image ? '<img class="qr" alt="QPay QR" src="data:image/png;base64,' + esc(q.qr_image) + '">' : '<p class="cd-demo">' + t.gc_demo + '</p>') +
        (st.code ? '<p class="gc-hint">' + t.gc_code + '</p><p class="gc-code mono">' + esc(st.code) + '</p><p class="gc-hint">' + t.gc_use + '</p>' :
          '<button type="button" class="btn ink" id="gcCheck"><span>' + t.gc_get + '</span></button><p class="gc-msg" role="status">' + esc(st.msg) + '</p>') + '</div>';
      return;
    }
    box.innerHTML = '<div class="gc-card"><div class="eyebrow">' + t.gc_k + '</div><h1>' + t.gc_h + '</h1><p class="gc-hint">' + t.gc_p + '</p>' +
      '<div class="gc-amts" role="group" aria-label="' + esc(t.gc_k) + '">' + AMOUNTS.map(a => '<button type="button" data-amt="' + a + '" aria-pressed="' + (a === st.amount) + '">' + money(a) + '</button>').join('') + '</div>' +
      '<form id="gcForm" class="acct-form" novalidate><label><span class="mono">' + t.co_name + '</span><input name="name" autocomplete="name" maxlength="80" value="' + esc(LV.me ? LV.me.name : '') + '"></label>' +
      '<label><span class="mono">' + t.co_phone + '</span><input name="phone" inputmode="tel" maxlength="12" placeholder="99112233" value="' + esc(LV.me ? LV.me.phone : '') + '"></label>' +
      (st.msg ? '<p class="rv-msg err" role="alert">' + esc(st.msg) + '</p>' : '') +
      '<button type="submit" class="btn ink"><span>' + fill(t.gc_buy, { a: money(st.amount) }) + '</span><span aria-hidden="true">→</span></button></form>' +
      '<form id="gcFind" class="gc-find" novalidate><p class="gc-hint">' + t.gc_find + '</p><input name="no" placeholder="LV-26-0000" maxlength="20"><input name="phone" inputmode="tel" placeholder="99112233" maxlength="12"><button type="submit" class="btn"><span>' + t.gc_get + '</span></button></form></div>';
  }
  async function code(no, phone) {
    const t = T();
    try { const r = await LV.api('/api/giftcards/code', { method: 'POST', body: JSON.stringify({ no, phone }) });
      if (r.paid && r.code) { st.code = r.code; st.msg = ''; } else st.msg = r.paid ? t.gc_void : t.gc_wait;
    } catch (e) { st.msg = e.status === 404 ? t.gc_nf : e.status === 429 ? t.acc_err_busy : t.co_err_net; }
  }
  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-amt]'); if (a) { st.amount = +a.dataset.amt; page(); return; }
    if (e.target.closest('#gcCheck')) { await code(st.order.order.no, st.phone); page(); }
  });
  document.addEventListener('submit', async e => {
    const t = T();
    if (e.target.id === 'gcForm') {
      e.preventDefault();
      const name = e.target.elements.name.value.trim(), phone = e.target.elements.phone.value.replace(/\D/g, '');
      if (!name || phone.length < 8) { st.msg = t.co_err_req; page(); return; }
      try { st.order = await LV.api('/api/giftcards', { method: 'POST', body: JSON.stringify({ amount: st.amount, name, phone }) }); st.phone = phone; st.msg = ''; }
      catch (err) { st.msg = err.status === 429 ? t.acc_err_busy : t.co_err_net; }
      page();
    }
    if (e.target.id === 'gcFind') {
      e.preventDefault();
      const no = e.target.elements.no.value.trim().toUpperCase(), phone = e.target.elements.phone.value.replace(/\D/g, '');
      await code(no, phone);
      if (st.code) { st.order = { order: { no, total: 0 }, qpay: null }; } else alert(st.msg);
      page();
    }
  });
  document.addEventListener('lv:lang', page);
  LV.ready.then(async () => { if (LV.meReady) await LV.meReady; page(); });
})();
