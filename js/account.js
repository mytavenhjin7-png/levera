/* LEVERA — customer account on every page: header icon, saved pieces kept with the account, checkout prefilled,
   and the account page (sign in / register, profile, default address, password, order history). */
(function () {
  const LV = window.LV, { $, T, esc, money, fill } = LV;
  LV.me = null;
  const PERSON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';

  // header: person icon before the ♡
  const anchor = $('#savedLink') || $('#openBag');
  if (anchor && !$('#acctLink')) anchor.insertAdjacentHTML('beforebegin', '<a class="icon-btn acct-link" id="acctLink" href="account.html" aria-label="' + esc(T().acc_k) + '">' + PERSON + '</a>');
  function syncHeader() {
    const a = $('#acctLink'); if (!a) return;
    a.classList.toggle('on', !!LV.me);
    a.setAttribute('aria-label', LV.me ? fill(T().acc_hi, { n: LV.me.name }) : T().acc_signin);
    a.title = LV.me ? LV.me.name : '';
  }

  // saved pieces: the account's list merged with this device's
  let pushing = false, pushTimer = 0;
  function useAccountSaved(list) {
    if (!LV.setSaved) return;
    pushing = true; LV.setSaved([...new Set([...(list || []), ...(LV.saved ? LV.saved() : [])])]); pushing = false;
    pushSaved();
  }
  function pushSaved() {
    if (!LV.me || pushing) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { LV.api('/api/account/saved', { method: 'PUT', body: JSON.stringify({ ids: LV.saved ? LV.saved() : [] }) }).catch(() => {}); }, 400);
  }
  document.addEventListener('lv:saved', pushSaved);

  LV.meReady = LV.api('/api/account/me').then(r => {
    LV.me = r.customer; syncHeader();
    if (LV.me) useAccountSaved(r.saved);
    document.dispatchEvent(new CustomEvent('lv:me'));
    return LV.me;
  }).catch(() => null);

  /* ---------- checkout: prefill from the account ---------- */
  async function checkout() {
    const f = $('#coForm'); if (!f) return;
    await LV.meReady;
    const t = T();
    let note = $('#coAcct');
    if (!note) { f.insertAdjacentHTML('afterbegin', '<p class="co-acct" id="coAcct"></p>'); note = $('#coAcct'); }
    if (LV.me) {
      const set = (id, v) => { const el = $(id); if (el && !el.value && v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } };
      set('#coName', LV.me.name); set('#coPhone', LV.me.phone); set('#coAddress', LV.me.address);
      if (LV.me.district) { const d = $('#coDistrict'); if (d && [...d.options].some(o => o.value === LV.me.district)) d.value = LV.me.district; }
      note.innerHTML = fill(t.acc_co_in, { n: '<b>' + esc(LV.me.name) + '</b>' });
    } else {
      note.innerHTML = '<a href="account.html?next=checkout.html">' + t.acc_co_out + '</a>';
    }
  }

  /* ---------- account page ---------- */
  const acc = { tab: new URLSearchParams(location.search).get('tab') === 'register' ? 'register' : 'login', msg: '', busy: false, orders: null, saved: '' };
  const STATUS = () => ({ pending: T().st_pending, paid: T().st_paid, ordered: T().st_ordered, ereen: T().st_ereen, ub: T().st_ub, delivered: T().st_delivered, cancelled: T().st_cancelled });
  function page() {
    const box = $('#acct'); if (!box) return;
    const t = T();
    document.title = (LV.me ? t.acc_k : t.acc_signin) + ' — LEVERA';
    if (!LV.me) {
      box.innerHTML = '<div class="acct-auth"><div class="eyebrow">' + t.acc_k + '</div><h1>' + (acc.tab === 'login' ? t.acc_signin : t.acc_register) + '</h1>' +
        '<div class="acct-tabs" role="tablist"><button type="button" role="tab" data-acct-tab="login" aria-selected="' + (acc.tab === 'login') + '">' + t.acc_signin + '</button><button type="button" role="tab" data-acct-tab="register" aria-selected="' + (acc.tab === 'register') + '">' + t.acc_register + '</button></div>' +
        '<form class="acct-form" id="acctForm" novalidate>' +
          (acc.tab === 'register' ? '<label><span class="mono">' + t.co_name + '</span><input name="name" autocomplete="name" maxlength="80" required></label>' : '') +
          '<label><span class="mono">' + t.co_phone + '</span><input name="phone" inputmode="tel" autocomplete="tel" maxlength="12" required placeholder="99112233"></label>' +
          '<label><span class="mono">' + t.acc_pw + '</span><input name="password" type="password" autocomplete="' + (acc.tab === 'login' ? 'current-password' : 'new-password') + '" minlength="8" required></label>' +
          (acc.tab === 'register' ? '<p class="acct-hint">' + t.acc_pw_hint + '</p>' : '') +
          (acc.msg ? '<p class="rv-msg err" role="alert">' + esc(acc.msg) + '</p>' : '') +
          '<button type="submit" class="btn ink"' + (acc.busy ? ' disabled' : '') + '><span>' + (acc.tab === 'login' ? t.acc_signin : t.acc_register) + '</span><span aria-hidden="true">→</span></button>' +
          (acc.tab === 'login' ? '<p class="acct-hint">' + t.acc_forgot + '</p>' : '') +
        '</form><ul class="acct-why"><li>' + t.acc_why1 + '</li><li>' + t.acc_why2 + '</li><li>' + t.acc_why3 + '</li></ul></div>';
      return;
    }
    const m = LV.me, S = STATUS();
    const orders = acc.orders == null ? '<p class="muted">…</p>' : !acc.orders.length ? '<p class="acct-empty">' + t.acc_no_orders + ' <a href="shop.html">' + t.cta + ' →</a></p>' :
      acc.orders.map(o => '<article class="acct-order"><div class="ao-head"><b class="mono">' + esc(o.no) + '</b><span class="ao-st st-' + esc(o.status) + '">' + esc(S[o.status] || o.status) + '</span><span class="mono ao-date">' + esc(LV.rvDate ? LV.rvDate(o.created_at) : o.created_at) + '</span><b class="ao-total">' + money(o.total) + '</b></div>' +
        '<div class="ao-items">' + o.items.map(i => '<a href="product.html?id=' + encodeURIComponent(i.id) + '" title="' + esc(i.brand + ' ' + (LV.lang === 'mn' && i.name_mn ? i.name_mn : i.name)) + '"><img src="' + esc(i.img) + '" alt=""><span>' + esc(i.brand) + '<br>' + esc(LV.lang === 'mn' && i.name_mn ? i.name_mn : i.name) + (i.size ? ' · ' + esc(i.size) : '') + ' × ' + i.qty + '</span></a>').join('') + '</div>' +
        '<a class="d-link" href="index.html?order=' + encodeURIComponent(o.no) + '#track">' + t.acc_track + '</a></article>').join('');
    box.innerHTML = '<div class="acct-head"><div><div class="eyebrow">' + t.acc_k + '</div><h1>' + fill(t.acc_hi, { n: esc(m.name) }) + '</h1><p class="mono acct-phone">' + esc(m.phone) + '</p></div><button type="button" class="btn" id="acctOut"><span>' + t.acc_out + '</span></button></div>' +
      '<div class="acct-grid"><section><h2>' + t.acc_orders + '</h2>' + orders + '</section>' +
      '<aside class="acct-side"><section class="acct-card"><h2>' + t.acc_profile + '</h2><form id="acctProfile" novalidate>' +
        '<label><span class="mono">' + t.co_name + '</span><input name="name" value="' + esc(m.name) + '" maxlength="80"></label>' +
        '<label><span class="mono">' + t.co_district + '</span><input name="district" value="' + esc(m.district) + '" maxlength="60"></label>' +
        '<label><span class="mono">' + t.co_address + '</span><textarea name="address" rows="3" maxlength="400">' + esc(m.address) + '</textarea></label>' +
        '<button type="submit" class="btn ink"><span>' + t.acc_save + '</span></button><p class="acct-ok" id="acctOk" role="status"></p></form></section>' +
        '<section class="acct-card"><h2>' + t.acc_pw_change + '</h2><form id="acctPw" novalidate>' +
        '<label><span class="mono">' + t.acc_pw_now + '</span><input name="password" type="password" autocomplete="current-password"></label>' +
        '<label><span class="mono">' + t.acc_pw_new + '</span><input name="new_password" type="password" autocomplete="new-password" minlength="8"></label>' +
        '<button type="submit" class="btn"><span>' + t.acc_save + '</span></button><p class="acct-ok" id="acctPwOk" role="status"></p></form></section>' +
        rankCard(t) + '<a class="acct-saved" href="gift.html">🎁 ' + t.gc_k + '</a>' + '<a class="acct-saved" href="saved.html">♡ ' + t.fav_page + ' <b>' + (LV.saved ? LV.saved().length : 0) + '</b></a></aside></div>';
  }
  // member rank: from paid orders, worked out by the server
  function rankCard(t) {
    const r = acc.rank; if (!r) return '';
    const name = r.rank ? t['rk_' + r.rank.key] : t.rk_none, pct = r.next ? Math.min(100, Math.round(r.spent / r.next.from * 100)) : 100;
    return '<section class="acct-card rk-card rk-' + (r.rank ? r.rank.key : 'none') + '"><h2>' + t.rk_h + '</h2><p class="rk-name">' + name + (r.rank ? ' · −' + r.rank.pct + '%' : '') + '</p>' +
      '<div class="rk-bar"><i style="width:' + pct + '%"></i></div><p class="acct-hint">' + (r.next ? fill(t.rk_next, { a: money(r.to_next), r: t['rk_' + r.next.key], p: r.next.pct }) : t.rk_top) + '</p></section>';
  }
  async function loadRank() { try { acc.rank = await LV.api('/api/account/rank'); page(); } catch (e) {} }
  const errText = (e, t) => e.status === 401 ? t.acc_err_login : e.status === 409 ? t.acc_err_taken : e.status === 429 ? t.acc_err_busy : /8 characters/.test(e.message) ? t.acc_pw_hint : /phone/.test(e.message) ? t.acc_err_phone : /current password/.test(e.message) ? t.acc_err_pw : e.message;
  async function loadOrders() { try { acc.orders = await LV.api('/api/account/orders'); } catch (e) { acc.orders = []; } page(); }
  document.addEventListener('click', async e => {
    const tb = e.target.closest('[data-acct-tab]'); if (tb) { acc.tab = tb.dataset.acctTab; acc.msg = ''; page(); return; }
    if (e.target.closest('#acctOut')) { await LV.api('/api/account/logout', { method: 'POST' }).catch(() => {}); LV.me = null; acc.orders = null; syncHeader(); page(); }
  });
  document.addEventListener('submit', async e => {
    const t = T();
    if (e.target.id === 'acctForm') {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      acc.busy = true; acc.msg = ''; page();
      try {
        const r = await LV.api('/api/account/' + (acc.tab === 'login' ? 'login' : 'register'), { method: 'POST', body: JSON.stringify({ ...d, saved: LV.saved ? LV.saved() : [] }) });
        LV.me = r.customer; acc.busy = false; syncHeader(); useAccountSaved(r.saved);
        const next = new URLSearchParams(location.search).get('next');
        if (next && /^[\w-]+\.html$/.test(next)) { location.href = next; return; }
        page(); loadOrders();
      } catch (err) {
        acc.busy = false; acc.msg = errText(err, t); page();
        const f = $('#acctForm'); for (const [k, v] of Object.entries(d)) if (f.elements[k] && k !== 'password') f.elements[k].value = v;
      }
    }
    if (e.target.id === 'acctProfile' || e.target.id === 'acctPw') {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target)), ok = $(e.target.id === 'acctPw' ? '#acctPwOk' : '#acctOk');
      try { const r = await LV.api('/api/account/me', { method: 'PATCH', body: JSON.stringify(d) }); LV.me = r.customer; ok.className = 'acct-ok'; ok.textContent = t.acc_saved; if (e.target.id === 'acctPw') e.target.reset(); syncHeader(); }
      catch (err) { ok.className = 'acct-ok err'; ok.textContent = errText(err, t); }
    }
  });
  document.addEventListener('lv:lang', () => { syncHeader(); page(); checkout(); });
  LV.ready.then(async () => { await LV.meReady; page(); if (LV.me && $('#acct')) { loadOrders(); loadRank(); } checkout(); });
})();
