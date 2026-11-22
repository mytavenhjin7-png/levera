/* LEVERA — admin panel: dashboard, products, orders, reviews, cargo rates & settings, import */
(function () {
  const API = (window.LEVERA_API || '').replace(/\/$/, '');
  const app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₮' + Math.round(n || 0).toLocaleString('en-US');
  let token = ''; try { token = localStorage.getItem('lv-admin') || ''; } catch (e) {}
  const STATUS = { pending: 'Төлбөр хүлээгдэж байна', paid: 'Төлбөр орсон', ordered: 'Захиалсан', ereen: 'Эрээнд ирсэн', ub: 'УБ-д ирсэн', delivered: 'Хүргэгдсэн', cancelled: 'Цуцалсан' };
  const CATS = { apparel: 'Хувцас', footwear: 'Гутал', bags: 'Цүнх', accessories: 'Дагалдах', fragrance: 'Сүрчиг' };

  async function api(path, opts = {}) {
    const r = await fetch(API + path, { ...opts, headers: { Authorization: 'Bearer ' + token, ...(opts.body && !(opts.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { logout(); throw new Error('Нэвтрэх шаардлагатай'); }
    if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
    return d;
  }
  function logout() { token = ''; try { localStorage.removeItem('lv-admin'); } catch (e) {} renderLogin(); }

  /* ---------- login ---------- */
  function renderLogin(msg = '') {
    app.innerHTML = '<form class="login" id="lf"><div class="logo" style="text-align:center">LEVERA</div><div class="mono muted" style="text-align:center">Admin</div>' +
      '<label class="mono muted" for="tk">Admin token</label><input id="tk" type="password" autocomplete="current-password" required>' +
      '<button class="btn-s" type="submit">Нэвтрэх</button><p class="muted" style="font-size:12px;margin:0">Token нь серверийг асаахад terminal дээр гарна (data/admin-token.txt).</p>' +
      (msg ? '<p class="msg err">' + esc(msg) + '</p>' : '') + '</form>';
    document.getElementById('lf').addEventListener('submit', async e => {
      e.preventDefault(); token = document.getElementById('tk').value.trim();
      try { await api('/api/admin/me'); try { localStorage.setItem('lv-admin', token); } catch (e2) {} shell(); } catch (err) { renderLogin('Token буруу байна.'); }
    });
  }

  /* ---------- shell ---------- */
  const TABS = [['dash', 'Хянах самбар'], ['products', 'Бараа'], ['new', '+ Шинэ бараа'], ['orders', 'Захиалга'], ['gift', 'Бэлгийн карт'], ['settings', 'Карго ба үнэ'], ['reviews', 'Сэтгэгдэл'], ['customers', 'Хэрэглэгч'], ['import', 'Үнэ импорт']];
  let tab = location.hash.slice(1) || 'dash';
  function shell() {
    app.innerHTML = '<header class="a-top"><a class="logo" href="index.html">LEVERA</a><nav class="tabs" role="tablist">' +
      TABS.map(([k, l]) => '<button role="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + l + '</button>').join('') +
      '</nav><span class="sp"></span><a class="mono muted" href="shop.html" target="_blank">Дэлгүүр ↗</a><button class="btn-s ghost" id="lo">Гарах</button></header><main class="a-main" id="main"></main>';
    app.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; location.hash = tab; shell(); });
    document.getElementById('lo').addEventListener('click', logout);
    ({ dash, products, orders, reviews, settings, importer, customers, new: newProduct, gift: giftCards })[tab === 'import' ? 'importer' : tab]();
  }
  const main = () => document.getElementById('main');

  /* ---------- dashboard ---------- */
  async function dash() {
    main().innerHTML = '<h1 class="a-h">Хянах самбар</h1><p class="muted">Ачаалж байна…</p>';
    const s = await api('/api/admin/stats');
    const st = (k, v, sub = '') => '<div class="stat"><span class="mono">' + k + '</span><b>' + v + '</b><span class="muted" style="font-size:12px">' + sub + '</span></div>';
    main().innerHTML = '<h1 class="a-h">Хянах самбар</h1><div class="stats">' +
      st('Бараа', s.products.active + ' / ' + s.products.n, 'идэвхтэй / нийт') +
      st('Бодит үнэтэй', s.products.live, 'бусад нь тооцоолсон үнэ') +
      st('Бодит зурагтай', s.products.photos, 'бусад нь 3D дүрслэл') +
      st('Захиалга', s.orders.n, (s.orders.paid || 0) + ' төлбөр орсон') +
      st('Орлого', money(s.orders.revenue), 'төлбөр орсон захиалгууд') +
      st('Drop бүртгэл', s.subscribers, 'имэйл') +
      st('Сэтгэгдэл', s.reviews.n || 0, s.reviews.n ? 'дундаж ' + (Math.round(s.reviews.avg * 10) / 10) + ' ★ · ' + (s.reviews.published || 0) + ' нийтлэгдсэн' : 'одоогоор алга') + '</div>' +
      '<div class="grid2"><div class="card-a"><h2>Холболтууд</h2><p>QPay: <b>' + (s.qpay ? 'холбогдсон' : 'жишээ горим') + '</b><br>Telegram мэдэгдэл: <b>' + (s.telegram ? 'асаалттай' : 'унтраалттай') + '</b><br>AI чат (Gemini): <b>' + (s.chat ? 'асаалттай · ' + esc(s.chatModel) : 'бэлэн хариулт') + '</b><br>Database: <b>' + esc(s.db) + '</b></p>' +
      '<p class="muted" style="font-size:13px">Тохируулах: <code>server/.env</code> файлд QPAY_*, TELEGRAM_*, GEMINI_API_KEY бичээд серверийг дахин асаана.</p>' + (s.telegram ? '<button class="btn-s ghost" id="tn">Telegram туршилт</button>' : '') + '</div>' +
      '<div class="card-a"><h2>Карго тариф</h2><p>' + s.settings.cargo_kg.toLocaleString('en-US') + '₮/кг · ¥' + s.settings.cargo_m3 + '/м³ · ¥1 = ' + s.settings.cargo_yuan + '₮<br><span class="muted">Салбар: ' + esc(s.settings.hicargo_branch) + ' · сүүлд шинэчилсэн: ' + esc(s.settings.rates_synced_at ? new Date(s.settings.rates_synced_at).toLocaleString() : '—') + '</span></p>' +
      '<p class="muted" style="font-size:13px">Сервер 6 цаг тутам тарифыг автоматаар шинэчилж, өөрчлөгдвөл бүх үнийг дахин бодно.</p></div>' +
      '<div class="card-a"><h2>Захиалгын төлөв</h2>' + (s.byStatus.length ? s.byStatus.map(x => '<div>' + esc(STATUS[x.status] || x.status) + ': <b>' + x.n + '</b></div>').join('') : '<p class="muted">Захиалга алга.</p>') + '</div></div>';
    const tn = document.getElementById('tn'); if (tn) tn.addEventListener('click', async () => { try { await api('/api/admin/test-notify', { method: 'POST' }); tn.textContent = 'Илгээлээ ✓'; } catch (e) { tn.textContent = e.message; } });
  }

  /* ---------- products ---------- */
  const pq = { q: '', brand: '', cat: '', source: '', page: 1 };
  let brands = [];
  async function products() {
    if (!brands.length) { try { brands = (await (await fetch(API + '/api/catalog')).json()).brands; } catch (e) {} }
    main().innerHTML = '<h1 class="a-h">Бараа</h1><div class="bar">' +
      '<input id="pq" type="search" placeholder="Нэр, ID хайх" value="' + esc(pq.q) + '">' +
      '<select id="pb"><option value="">Бүх брэнд</option>' + brands.map(b => '<option value="' + b.slug + '"' + (pq.brand === b.slug ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('') + '</select>' +
      '<select id="pc"><option value="">Бүх ангилал</option>' + Object.entries(CATS).map(([k, v]) => '<option value="' + k + '"' + (pq.cat === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>' +
      '<select id="ps"><option value="">Бүх үнэ</option><option value="estimate"' + (pq.source === 'estimate' ? ' selected' : '') + '>Тооцоолсон</option><option value="dewu"' + (pq.source === 'dewu' ? ' selected' : '') + '>Импортолсон</option><option value="manual"' + (pq.source === 'manual' ? ' selected' : '') + '>Гараар</option><option value="official"' + (pq.source === 'official' ? ' selected' : '') + '>Албан ёсны үнэ</option></select>' +
      '<span class="muted" id="ptotal"></span></div>' +
      '<div class="card-a" style="padding:14px 18px"><b>Хямдрал</b> <span class="muted" style="font-size:13px">— дээрх шүүлтүүрийн брэнд/ангиллын бүх бараанд жинхэнэ хямдрал тавина (үнэ бодитоор буурна, хуучин үнэ зураастай харагдана). 0% = хямдрал цуцлах.</span><div class="bar" style="margin:10px 0 0"><input id="dp" type="number" min="0" max="90" step="5" value="30" style="width:90px"> %<button class="btn-s" id="dgo">Хямдрал тавих</button><span class="muted" id="dout"></span></div></div>' +
      '<p class="muted" style="font-size:13px;margin:0 0 12px">Барааны үнэ (¥), жин, хайрцгийн хэмжээг засаад <b>Хадгалах</b> дарахад карго болон эцсийн үнэ шууд дахин бодогдоно. Зураг дээр дарж бодит зураг оруулна.</p>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Зураг</th><th>Бараа</th><th>Үнэ ¥</th><th>Жин кг</th><th>Хайрцаг см (У×Ө×Г)</th><th>Эх сурвалжийн холбоос</th><th>Карго</th><th>Хямдрал %</th><th title="Бодит үлдэгдэл. 1–5 бол «Сүүлийн N ширхэг» гэж харагдана">Үлдэгдэл</th><th>Үнэ</th><th>Идэвх</th><th></th></tr></thead><tbody id="pt"></tbody></table></div>' +
      '<div class="pager"><button class="btn-s ghost" id="pp">←</button><span class="mono" id="pn"></span><button class="btn-s ghost" id="pnx">→</button></div>' +
      '<input type="file" id="pf" accept="image/jpeg,image/png,image/webp" hidden>';
    let qt = 0;
    document.getElementById('pq').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { pq.q = e.target.value.trim(); pq.page = 1; loadProducts(); }, 250); });
    for (const [id, k] of [['pb', 'brand'], ['pc', 'cat'], ['ps', 'source']]) document.getElementById(id).addEventListener('change', e => { pq[k] = e.target.value; pq.page = 1; loadProducts(); });
    document.getElementById('dgo').addEventListener('click', async () => {
      const pct = Number(document.getElementById('dp').value), out = document.getElementById('dout');
      if (!pq.brand && !pq.cat) { out.textContent = 'Эхлээд брэнд эсвэл ангилал сонгоно уу.'; return; }
      if (!confirm((pq.brand || '') + ' ' + (pq.cat ? CATS[pq.cat] : '') + ' — бүх бараанд ' + pct + '% хямдрал тавих уу?')) return;
      try { const r = await api('/api/admin/discounts', { method: 'POST', body: JSON.stringify({ pct, brand: pq.brand || undefined, cat: pq.cat || undefined }) }); out.textContent = r.updated + ' бараа шинэчлэгдлээ.'; loadProducts(); } catch (e) { out.textContent = e.message; }
    });
    document.getElementById('pp').addEventListener('click', () => { if (pq.page > 1) { pq.page--; loadProducts(); } });
    document.getElementById('pnx').addEventListener('click', () => { pq.page++; loadProducts(); });
    loadProducts();
  }
  function prow(p) {
    return '<tr data-id="' + esc(p.id) + '"><td><button class="ph-btn" data-photo title="Зураг солих" style="border:0;padding:0;background:none;cursor:pointer"><img src="' + esc(p.photo || p.img) + '" alt=""></button>' + (p.photo ? '<button class="mono muted" data-unphoto style="border:0;background:none;cursor:pointer;font-size:9px">устгах</button>' : '') + '</td>' +
      '<td><div style="font-weight:600">' + esc(p.name_en) + '</div><div class="muted" style="font-size:12px">' + esc(p.brand_slug) + ' · ' + esc(p.type) + ' · <span class="tag ' + p.price_source + '">' + esc(p.price_source) + '</span>' + (p.photo_src ? ' · <a href="' + esc(p.photo_src) + '" target="_blank" rel="noopener" title="Зургийн эх сурвалж">зураг ↗</a>' : '') + '</div></td>' +
      '<td><input data-k="cny" type="number" min="0" step="1" value="' + p.cny + '" title="Dewu ¥">' + (p.cat === 'fragrance' ? '<div style="margin-top:4px;font-size:11px" class="muted">$ албан<input data-k="retail_usd" type="number" min="0" step="1" value="' + (p.retail_usd || '') + '" title="Албан ёсны үнэ (US$) — гааль + НӨАТ-тай үнэ бодно" style="width:70px"></div>' : '') + '</td>' +
      '<td><input class="w" data-k="weight_kg" type="number" min="0" step="0.05" value="' + p.weight_kg + '"></td>' +
      '<td style="white-space:nowrap"><input class="w" data-k="len_cm" type="number" min="0" value="' + p.len_cm + '">×<input class="w" data-k="wid_cm" type="number" min="0" value="' + p.wid_cm + '">×<input class="w" data-k="hei_cm" type="number" min="0" value="' + p.hei_cm + '"></td>' +
      '<td><input class="url" data-k="dewu_url" type="url" placeholder="https://…" value="' + esc(p.dewu_url || '') + '"></td>' +
      '<td class="num">' + money(p.cargo_mnt) + '</td><td><input class="w" data-k="discount_pct" type="number" min="0" max="90" step="5" value="' + (p.discount_pct || 0) + '"></td><td><input class="w" data-k="stock_left" type="number" min="0" step="1" value="' + (p.stock_left || 0) + '"></td>' +
      '<td class="num"><b>' + money(p.price_mnt) + '</b>' + (p.discount_pct > 0 ? '<div class="muted" style="font-size:11px;text-decoration:line-through">' + money(p.list_mnt) + '</div>' : '') + '</td>' +
      '<td><input data-k="active" type="checkbox"' + (p.active ? ' checked' : '') + ' style="width:auto"></td>' +
      '<td><button class="btn-s" data-save disabled>Хадгалах</button></td></tr>';
  }
  async function loadProducts() {
    const p = new URLSearchParams(Object.entries(pq).filter(([, v]) => v !== ''));
    const d = await api('/api/admin/products?' + p);
    const pages = Math.max(1, Math.ceil(d.total / d.per)); if (pq.page > pages) { pq.page = pages; return loadProducts(); }
    document.getElementById('ptotal').textContent = d.total + ' бараа';
    document.getElementById('pn').textContent = pq.page + ' / ' + pages;
    const tb = document.getElementById('pt'); tb.innerHTML = d.rows.map(prow).join('');
    tb.oninput = tb.onchange = e => { const tr = e.target.closest('tr'); if (tr && e.target.dataset.k) { tr.classList.add('dirty'); tr.querySelector('[data-save]').disabled = false; } };
    tb.onclick = async e => {
      const tr = e.target.closest('tr'); if (!tr) return; const id = tr.dataset.id;
      if (e.target.closest('[data-save]')) {
        const body = {}; tr.querySelectorAll('[data-k]').forEach(i => { body[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
        try { const p2 = await api('/api/admin/products/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(body) }); tr.outerHTML = prow(p2); }
        catch (err) { alert(err.message); }
      }
      if (e.target.closest('[data-photo]')) {
        const f = document.getElementById('pf'); f.value = '';
        f.onchange = async () => { const file = f.files[0]; if (!file) return; try { await api('/api/admin/products/' + encodeURIComponent(id) + '/photo', { method: 'POST', body: file, headers: { 'Content-Type': file.type } }); loadProducts(); } catch (err) { alert(err.message); } };
        f.click();
      }
      if (e.target.closest('[data-unphoto]') && confirm('Бодит зургийг устгах уу? 3D дүрслэл буцаж харагдана.')) { await api('/api/admin/products/' + encodeURIComponent(id) + '/photo', { method: 'DELETE' }); loadProducts(); }
    };
  }

  /* ---------- orders ---------- */
  let ofilter = '';
  async function orders() {
    main().innerHTML = '<h1 class="a-h">Захиалга</h1><div class="bar"><select id="of"><option value="">Бүх төлөв</option>' + Object.entries(STATUS).map(([k, v]) => '<option value="' + k + '"' + (ofilter === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><button class="btn-s ghost" id="or">Шинэчлэх</button></div><div id="ol"><p class="muted">Ачаалж байна…</p></div>';
    document.getElementById('of').addEventListener('change', e => { ofilter = e.target.value; loadOrders(); });
    document.getElementById('or').addEventListener('click', loadOrders);
    loadOrders();
  }
  function orow(o) {
    return '<details class="order" data-no="' + esc(o.no) + '"><summary><b>' + esc(o.no) + '</b><span class="muted">' + esc(new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleString()) + '</span><span>' + esc(o.name) + ' · ' + esc(o.phone) + '</span><span class="num"><b>' + money(o.total) + '</b></span><span class="tag ' + o.payment + '">' + (o.payment === 'paid' ? 'төлсөн' : 'төлөөгүй') + '</span>' +
      '<select data-status>' + Object.entries(STATUS).map(([k, v]) => '<option value="' + k + '"' + (o.status === k ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></summary>' +
      '<div class="body"><p><b>Хаяг:</b> ' + esc((o.district ? o.district + ', ' : '') + o.address) + (o.note ? '<br><b>Тэмдэглэл:</b> ' + esc(o.note) : '') + '</p>' +
      o.items.map(i => '<div class="it"><img src="' + esc(i.img) + '" alt="" style="width:46px;height:58px;object-fit:cover"><div><b>' + esc(i.brand) + '</b> — ' + esc(i.name) + (i.size ? ' · <b>' + esc(i.size) + '</b>' : '') + ' × ' + i.qty + '<div class="muted" style="font-size:12px">Үнэ: ¥' + i.cny + ' · карго ' + money(i.cargo) + (i.dewu_url ? ' · <a href="' + esc(i.dewu_url) + '" target="_blank" rel="noopener">Эх сурвалж ↗</a>' : '') + '</div></div><div class="num">' + money(i.price * i.qty) + '</div></div>').join('') +
      '<p class="muted" style="font-size:12px">' + o.history.map(h => esc(STATUS[h.status] || h.status) + ' — ' + esc(new Date(h.at).toLocaleString())).join(' · ') + '</p>' +
      (o.payment !== 'paid' ? '<button class="btn-s" data-paid>Төлбөр орсон гэж тэмдэглэх</button>' : '') + '</div></details>';
  }
  async function loadOrders() {
    const list = await api('/api/admin/orders' + (ofilter ? '?status=' + ofilter : ''));
    const ol = document.getElementById('ol');
    ol.innerHTML = list.length ? list.map(orow).join('') : '<p class="muted">Захиалга алга.</p>';
    ol.onchange = async e => { const s = e.target.closest('[data-status]'); if (!s) return; const no = s.closest('[data-no]').dataset.no; try { await api('/api/admin/orders/' + encodeURIComponent(no), { method: 'PATCH', body: JSON.stringify({ status: s.value }) }); } catch (err) { alert(err.message); } };
    ol.onclick = async e => {
      if (e.target.closest('select')) { e.preventDefault(); return; }
      const b = e.target.closest('[data-paid]'); if (!b) return;
      const no = b.closest('[data-no]').dataset.no;
      await api('/api/admin/orders/' + encodeURIComponent(no), { method: 'PATCH', body: JSON.stringify({ payment: 'paid' }) }); loadOrders();
    };
  }

  /* ---------- new product ---------- */
  const TYPE_GROUPS = { footwear: 'Гутал', apparel: 'Хувцас', bags: 'Цүнх', accessories: 'Дагалдах', fragrance: 'Сүрчиг, гоо сайхан' };
  async function newProduct() {
    let cat = {}; try { cat = await (await fetch(API + '/api/catalog')).json(); } catch (e) {}
    brands = cat.brands || brands;
    const types = cat.types || {};
    const typeOpts = Object.entries(TYPE_GROUPS).map(([g, gl]) => '<optgroup label="' + gl + '">' + Object.entries(types).filter(([, v]) => v.cat === g).map(([k, v]) => '<option value="' + k + '">' + esc(v.mn + ' · ' + v.en) + '</option>').join('') + '</optgroup>').join('');
    main().innerHTML = '<h1 class="a-h">Шинэ бараа нэмэх</h1>' +
      '<p class="muted" style="max-width:720px;font-size:14px">Бараа нэмэхэд сайтад шууд гарна. Үнэ = барааны үнэ (¥) × ханш + карго + үйлчилгээ — «Карго ба үнэ» тохиргоогоор автоматаар бодогдоно. Зургийг 1–8 ширхэг сонгоно: эхнийх нь үндсэн зураг (цагаан дэвсгэртэй, бүтэн харагдах зураг сайн).</p>' +
      '<form class="card-a" id="np" style="max-width:820px">' +
        '<div class="fields">' +
          '<label>Брэнд<select name="brand_slug" id="npBrand"><option value="">— сонгох —</option>' + brands.map(b => '<option value="' + b.slug + '">' + esc(b.name) + '</option>').join('') + '<option value="__new">+ Шинэ брэнд…</option></select></label>' +
          '<label>Төрөл<select name="type" id="npType" required><option value="">— сонгох —</option>' + typeOpts + '</select></label>' +
        '</div>' +
        '<div class="fields" id="npNewBrand" hidden>' +
          '<label>Шинэ брэндийн нэр<input name="nb_name" placeholder="жишээ нь: Stüssy"></label>' +
          '<label>Хот (англи)<input name="nb_city_en" placeholder="Los Angeles"></label>' +
          '<label>Хот (монгол)<input name="nb_city_mn" placeholder="Лос-Анжелес"></label>' +
          '<label>Ангилал<select name="nb_tier"><option value="street">Спорт / стрийт (энгийн фонт)</option><option value="luxury">Люкс (тансаг фонт)</option></select></label>' +
        '</div>' +
        '<div class="fields">' +
          '<label>Загварын нэр<input name="model" required placeholder="жишээ нь: Kobe 6 Protro"></label>' +
          '<label>Өнгө / хэмжээ (англи)<input name="colour" placeholder="Grinch · 100 ml · Black"></label>' +
          '<label>Өнгө (монгол, заавал биш)<input name="colour_mn" placeholder="Ногоон"></label>' +
        '</div>' +
        '<div class="fields">' +
          '<label>Барааны үнэ ¥ (Dewu)<input name="cny" type="number" min="1" step="1" required></label>' +
          '<label>Сүрчиг: албан ёсны үнэ $ (заавал биш)<input name="retail_usd" type="number" min="0" step="1" placeholder="жишээ нь: 135"></label>' +
          '<label>Жин кг (хоосон = төрлийн дундаж)<input name="weight_kg" type="number" min="0" step="0.05"></label>' +
          '<label>Хэмжээнүүд (таслалаар, хоосон = стандарт)<input name="sizes" placeholder="40, 41, 42, 43"></label>' +
        '</div>' +
        '<label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--ink);margin-bottom:12px"><input type="checkbox" name="featured" style="width:auto"> Нүүр хуудсанд онцлох</label>' +
        '<label style="display:block;font-size:12px;color:var(--mute)">Зураг (JPG, PNG, WEBP · 1–8 ширхэг)<input type="file" id="npFiles" accept="image/jpeg,image/png,image/webp,image/avif" multiple style="display:block;margin-top:6px"></label>' +
        '<div id="npPrev" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"></div>' +
        '<button class="btn-s" type="submit" id="npGo">Бараа нэмэх</button> <span class="msg" id="npMsg"></span>' +
      '</form>';
    const f = document.getElementById('np');
    document.getElementById('npBrand').addEventListener('change', e => { document.getElementById('npNewBrand').hidden = e.target.value !== '__new'; });
    document.getElementById('npFiles').addEventListener('change', e => {
      document.getElementById('npPrev').innerHTML = [...e.target.files].slice(0, 8).map((file, i) => '<figure style="margin:0;text-align:center;font-size:11px"><img src="' + URL.createObjectURL(file) + '" style="width:80px;height:100px;object-fit:contain;background:#fff;border:1px solid var(--line)"><figcaption>' + (i ? i + 1 : 'Үндсэн') + '</figcaption></figure>').join('');
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f)), msg = document.getElementById('npMsg'), btn = document.getElementById('npGo');
      const files = [...document.getElementById('npFiles').files].slice(0, 8);
      if (!files.length && !confirm('Зураггүйгээр нэмэх үү? Зураггүй бараа сайт дээр хоосон харагдана.')) return;
      const body = { brand_slug: d.brand_slug === '__new' ? '' : d.brand_slug, type: d.type, model: d.model, colour: d.colour, colour_mn: d.colour_mn, cny: d.cny, retail_usd: d.retail_usd, weight_kg: d.weight_kg, featured: !!d.featured,
        sizes: d.sizes ? d.sizes.split(',').map(x => x.trim()).filter(Boolean) : [] };
      if (d.brand_slug === '__new') body.new_brand = { name: d.nb_name, city_en: d.nb_city_en, city_mn: d.nb_city_mn, tier: d.nb_tier };
      btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Нэмж байна…';
      try {
        const p = await api('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
        for (const [i, file] of files.entries()) {
          msg.textContent = 'Зураг ' + (i + 1) + ' / ' + files.length + '…';
          await api('/api/admin/products/' + encodeURIComponent(p.id) + '/photo' + (i ? '?append=1' : ''), { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
        }
        msg.className = 'msg ok';
        msg.innerHTML = 'Нэмэгдлээ: <b>' + esc(p.name_en) + '</b> — ' + money(p.price_mnt) + ' · <a href="product.html?id=' + encodeURIComponent(p.id) + '" target="_blank">сайт дээр харах ↗</a>';
        f.reset(); document.getElementById('npPrev').innerHTML = ''; document.getElementById('npNewBrand').hidden = true; brands = [];
      } catch (err) { msg.className = 'msg err'; msg.textContent = err.message; }
      btn.disabled = false;
    });
  }

  /* ---------- gift cards ---------- */
  async function giftCards() {
    const list = await api('/api/admin/giftcards');
    const st = { pending: 'Төлөгдөөгүй', active: 'Идэвхтэй', void: 'Хүчингүй' };
    main().innerHTML = '<h1 class="a-h">Бэлгийн карт</h1><p class="muted" style="font-size:14px">Захиалга төлөгдсөн гэж тэмдэглэхэд карт идэвхжинэ. Захиалгыг цуцлахад карт хүчингүй болно. Карт ашигласан захиалгыг цуцлахад үлдэгдэл буцна.</p>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Код</th><th>Дүн</th><th>Үлдэгдэл</th><th>Төлөв</th><th>Утас</th><th>Захиалга</th></tr></thead><tbody>' +
      (list.length ? list.map(c => '<tr><td class="mono">' + esc(c.code) + '</td><td class="num">' + money(c.amount) + '</td><td class="num">' + money(c.balance) + '</td><td>' + esc(st[c.status] || c.status) + '</td><td class="mono">' + esc(c.buyer_phone) + '</td><td class="mono">' + esc(c.order_no) + '</td></tr>').join('') : '<tr><td colspan="6" class="muted">Бэлгийн карт алга.</td></tr>') + '</tbody></table></div>';
  }

  /* ---------- customers ---------- */
  let cq = '';
  async function customers() {
    main().innerHTML = '<h1 class="a-h">Хэрэглэгч</h1><div class="bar"><input id="cq" type="search" placeholder="Нэр, утас хайх" value="' + esc(cq) + '"><span class="muted" style="font-size:13px">Нууц үгээ мартсан хэрэглэгчид «Нууц үг шинэчлэх» дарж түр нууц үг өгнө.</span></div>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Нэр</th><th>Утас</th><th>Дүүрэг</th><th>Захиалга</th><th>Төлсөн</th><th>Бүртгүүлсэн</th><th>Сүүлд нэвтэрсэн</th><th></th></tr></thead><tbody id="ct"><tr><td colspan="8" class="muted">Ачаалж байна…</td></tr></tbody></table></div>';
    let qt = 0;
    document.getElementById('cq').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { cq = e.target.value.trim(); loadCustomers(); }, 250); });
    loadCustomers();
  }
  const when = s => s ? esc(new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString()) : '—';
  async function loadCustomers() {
    const list = await api('/api/admin/customers' + (cq ? '?q=' + encodeURIComponent(cq) : ''));
    const ct = document.getElementById('ct');
    ct.innerHTML = list.length ? list.map(c => '<tr data-cid="' + c.id + '"><td>' + esc(c.name) + '</td><td class="mono">' + esc(c.phone) + '</td><td>' + esc(c.district || '') + '</td><td class="num">' + c.orders + '</td><td class="num">' + money(c.spent) + '</td><td class="muted">' + when(c.created_at) + '</td><td class="muted">' + when(c.last_login) + '</td><td><button class="btn-s ghost" data-reset>Нууц үг шинэчлэх</button></td></tr>').join('') : '<tr><td colspan="8" class="muted">Хэрэглэгч алга.</td></tr>';
    ct.onclick = async e => {
      const b = e.target.closest('[data-reset]'); if (!b) return;
      const tr = b.closest('[data-cid]');
      const pw = Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6);
      if (!confirm('Энэ хэрэглэгчийн нууц үгийг шинэчлэх үү? Түр нууц үг: ' + pw)) return;
      try { await api('/api/admin/customers/' + tr.dataset.cid + '/password', { method: 'POST', body: JSON.stringify({ password: pw }) }); alert('Шинэ түр нууц үг: ' + pw + '\nХэрэглэгчид утсаар хэлээд, нэвтэрсний дараа солихыг сануулаарай.'); }
      catch (err) { alert(err.message); }
    };
  }

  /* ---------- reviews ---------- */
  let rfilter = '';
  async function reviews() {
    main().innerHTML = '<h1 class="a-h">Сэтгэгдэл</h1><div class="bar"><select id="rf"><option value="">Бүгд</option><option value="published"' + (rfilter === 'published' ? ' selected' : '') + '>Нийтлэгдсэн</option><option value="hidden"' + (rfilter === 'hidden' ? ' selected' : '') + '>Нуусан</option><option value="sample"' + (rfilter === 'sample' ? ' selected' : '') + '>Жишээ</option></select><span class="muted" style="font-size:13px">Худалдан авагчийн бичсэн сэтгэгдэл шууд нийтлэгдэнэ. Зохисгүйг нь нууж эсвэл устгана.</span></div><div class="tbl-wrap"><table><thead><tr><th>Бараа</th><th>Үнэлгээ</th><th>Сэтгэгдэл</th><th>Нэр</th><th>Огноо</th><th>Төлөв</th><th></th></tr></thead><tbody id="rt"><tr><td colspan="7" class="muted">Ачаалж байна…</td></tr></tbody></table></div>';
    document.getElementById('rf').addEventListener('change', e => { rfilter = e.target.value; loadReviews(); });
    loadReviews();
  }
  async function loadReviews() {
    const list = await api('/api/admin/reviews' + (rfilter ? '?status=' + rfilter : ''));
    const rt = document.getElementById('rt');
    rt.innerHTML = list.length ? list.map(r => '<tr data-rid="' + r.id + '"><td><a href="product.html?id=' + encodeURIComponent(r.product_id) + '" target="_blank" style="display:flex;gap:10px;align-items:center"><img src="' + esc(r.photo || r.img || '') + '" alt=""><span>' + esc(r.name_en || r.product_id) + '</span></a></td>' +
      '<td style="white-space:nowrap;color:#8A6A3D">' + '★'.repeat(r.rating) + '<span style="color:#ccc">' + '★'.repeat(5 - r.rating) + '</span></td>' +
      '<td style="max-width:420px">' + (r.title ? '<b>' + esc(r.title) + '</b><br>' : '') + esc(r.body) + '<div class="muted" style="font-size:12px">' + [r.size && 'хэмжээ ' + esc(r.size), r.fit && esc(r.fit), r.verified && '✓ ' + esc(r.order_no)].filter(Boolean).join(' · ') + '</div></td>' +
      '<td>' + esc(r.name) + '</td><td class="muted" style="white-space:nowrap">' + esc(new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleString()) + '</td>' +
      '<td><span class="tag ' + (r.status === 'published' ? 'paid' : 'unpaid') + '">' + ({ published: 'нийтлэгдсэн', sample: 'жишээ', hidden: 'нуусан' }[r.status] || r.status) + '</span></td>' +
      '<td style="white-space:nowrap"><button class="btn-s ghost" data-toggle="' + (r.status === 'published' ? 'hidden' : 'published') + '">' + (r.status === 'published' ? 'Нуух' : 'Нийтлэх') + '</button> <button class="btn-s ghost" data-del>Устгах</button></td></tr>').join('') : '<tr><td colspan="7" class="muted">Сэтгэгдэл алга.</td></tr>';
    rt.onclick = async e => {
      const tr = e.target.closest('[data-rid]'); if (!tr) return;
      const t = e.target.closest('[data-toggle]'), d = e.target.closest('[data-del]');
      try {
        if (t) await api('/api/admin/reviews/' + tr.dataset.rid, { method: 'PATCH', body: JSON.stringify({ status: t.dataset.toggle }) });
        else if (d) { if (!confirm('Энэ сэтгэгдлийг бүр мөсөн устгах уу?')) return; await api('/api/admin/reviews/' + tr.dataset.rid, { method: 'DELETE' }); }
        else return;
        loadReviews();
      } catch (err) { alert(err.message); }
    };
  }

  /* ---------- settings + cargo calculator ---------- */
  async function settings() {
    const s = await api('/api/admin/settings');
    const f = (k, l, step = 1) => '<label>' + l + '<input data-s="' + k + '" type="number" min="0" step="' + step + '" value="' + s[k] + '"></label>';
    main().innerHTML = '<h1 class="a-h">Карго ба үнэ</h1><div class="grid2">' +
      '<div class="card-a"><h2>Карго тариф</h2><p class="muted" style="font-size:13px">Эрээн агуулах → ' + esc(s.hicargo_branch) + '. Сүүлд шинэчилсэн: ' + esc(s.rates_synced_at ? new Date(s.rates_synced_at).toLocaleString() : '—') + '</p>' +
      '<div class="fields">' + f('cargo_kg', '₮ / кг') + f('cargo_m3', '¥ / м³') + f('cargo_yuan', '¥ ханш (₮)') + f('hicargo_branch_id', 'Салбар ID') + '</div>' +
      '<button class="btn-s ghost" id="sync">Тариф шинэчлэх</button> <span class="msg" id="syncMsg"></span></div>' +
      '<div class="card-a"><h2>Үнийн томьёо</h2><p class="muted" style="font-size:13px">Үнэ = Барааны үнэ ¥ × ханш + үйлчилгээний шимтгэл + (Хятад дотоод хүргэлт) + карго + Хүргэлт, 1,000₮ хүртэл дээш бүхэлдэнэ. Шимтгэл: эхний «босго» хүртэлх дүнд үндсэн %, түүнээс дээш хэсэгт люкс %, хамгийн багадаа доод дүн.</p>' +
      '<div class="fields">' + f('markup_pct', 'Нэмэгдэл % (өртөг дээр)', .1) + f('goods_cny_rate', 'Барааны ¥ ханш (₮)', .1) + f('service_fee_pct', 'Үйлчилгээний шимтгэл %', .5) + f('service_fee_high_pct', 'Люкс шимтгэл % (босгоос дээш)', .5) + f('service_fee_high_from_mnt', 'Босго ₮', 10000) + '</div>' +
      '<div class="fields">' + f('service_fee_min_mnt', 'Хамгийн бага шимтгэл ₮', 1000) + f('china_shipping_cny', 'Хятад дотоод хүргэлт ¥ / бараа') + f('local_delivery_mnt', 'Хүргэлт ₮ / бараа', 500) + '</div></div>' +
      '<div class="card-a"><h2>Сүрчиг, гоо сайхан</h2><p class="muted" style="font-size:13px"><b>Сүрчиг:</b> Үнэ = Dewu ¥ × «Сүрчиг ₮ / ¥» (бүх зардал багтсан; ¥478 → ₮470,000). Барааны ¥ үнийг Бараа хэсэгт засахад үнэ шууд өөрчлөгдөнө.<br><b>Уруулын будаг, гоо сайхан:</b> албан ёсны үнэ $ × ханш + гааль + НӨАТ + нэмэлт% + Хүргэлт.</p>' +
      '<div class="fields">' + f('frag_mnt_per_cny', 'Сүрчиг ₮ / ¥', .1) + '</div>' +
      '<div class="fields">' + f('usd_mnt_rate', '$1 ханш (₮)', 1) + f('customs_duty_pct', 'Гаалийн татвар %', .5) + f('vat_pct', 'НӨАТ %', .5) + f('frag_fee_pct', 'Нэмэлт %', .5) + '</div></div></div>' +
      '<button class="btn-s" id="saveS">Хадгалах ба бүх үнийг дахин бодох</button> <span class="msg" id="sMsg"></span>' +
      '<div class="card-a" style="margin-top:24px"><h2>Шинэ deploy-ийн мэдээлэл</h2><p class="muted" style="font-size:13px">Шинэ zip-ээр deploy хийсний дараа нэг удаа дарна: бараа, зураг, үнэ, брэнд, тохиргоог шинэ хувилбараар сольж, файлд байхгүй хуучин барааг нууна. Захиалга, хэрэглэгч, таны гараар нэмсэн бараа хэвээр үлдэнэ. Live дээр гараар зассан үнэ, зураг шинэ хувилбараар солигдоно.</p><button class="btn-s ghost" id="seedSync">Live мэдээллийг шинэчлэх</button> <span class="msg" id="seedMsg"></span></div>' +
      '<div class="card-a" style="margin-top:24px"><h2>Карго тооцоолуур</h2><p class="muted" style="font-size:13px">Жинг 0.5 кг хүртэл дээш бүхэлдэж ×₮/кг, эзлэхүүнийг ¥/м³ × ханшаар тооцож, аль их дүнг авна.</p>' +
      '<div class="fields"><label>Жин (кг)<input id="cw" type="number" min="0" step="0.1" value="1.6"></label><label>Урт (см)<input id="cl" type="number" value="36"></label><label>Өргөн (см)<input id="cwi" type="number" value="24"></label><label>Өндөр (см)<input id="ch" type="number" value="14"></label></div>' +
      '<button class="btn-s ghost" id="calc">Тооцоолох</button><p id="cOut" style="font-size:15px"></p></div>';
    document.getElementById('seedSync').addEventListener('click', async () => {
      const m = document.getElementById('seedMsg');
      if (!confirm('Бараа, зураг, үнэ, тохиргоог шинэ deploy-ийн хувилбараар солих уу? Захиалга, хэрэглэгч хэвээр үлдэнэ.')) return;
      m.className = 'msg'; m.textContent = 'Шинэчилж байна…';
      try { const r = await api('/api/admin/seed-sync', { method: 'POST' }); m.className = 'msg ok'; m.textContent = 'Боллоо: ' + r.products + ' бараа, ' + r.brands + ' брэнд.'; } catch (e) { m.className = 'msg err'; m.textContent = e.message; }
    });
    document.getElementById('saveS').addEventListener('click', async () => {
      const body = {}; document.querySelectorAll('[data-s]').forEach(i => { body[i.dataset.s] = Number(i.value); });
      const m = document.getElementById('sMsg');
      try { await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }); m.className = 'msg ok'; m.textContent = 'Хадгаллаа. Бүх барааны үнэ шинэчлэгдлээ.'; } catch (e) { m.className = 'msg err'; m.textContent = e.message; }
    });
    document.getElementById('sync').addEventListener('click', async () => {
      const m = document.getElementById('syncMsg');
      try { const r = await api('/api/admin/rates/sync', { method: 'POST' }); m.className = 'msg ok'; m.textContent = r.kg + '₮/кг · ¥' + r.m3 + '/м³ · ¥1=' + r.yuan + '₮' + (r.changed ? ' — үнэ шинэчлэгдлээ' : ' — өөрчлөлтгүй'); setTimeout(settings, 1200); }
      catch (e) { m.className = 'msg err'; m.textContent = e.message; }
    });
    document.getElementById('calc').addEventListener('click', async () => {
      const v = id => Number(document.getElementById(id).value);
      try {
        const r = await api('/api/cargo/quote', { method: 'POST', body: JSON.stringify({ weight_kg: v('cw'), dims: [v('cl'), v('cwi'), v('ch')] }) });
        document.getElementById('cOut').innerHTML = '<b>' + money(r.price) + '</b> — ' + (r.basis === 'weight' ? 'жингээр' : 'овроор') + ' · жин: ' + r.chargedKg + ' кг = ' + money(r.weightPrice) + ' · овор: ' + r.m3 + ' м³ = ¥' + r.volumeYuan + ' = ' + money(r.volumePrice);
      } catch (e) { document.getElementById('cOut').textContent = e.message; }
    });
  }

  /* ---------- price and image import ---------- */
  function importer() {
    main().innerHTML = '<h1 class="a-h">Үнэ импорт</h1><div class="card-a"><h2>Барааны үнэ, зураг оруулах</h2>' +
      '<p class="muted" style="font-size:13px">Барааны ID, үнэ, холбоос болон зургийн холбоосыг CSV мөрөөр эсвэл JSON массиваар оруулна. Зургийн холбоос өгвөл зураг серверт хадгалагдана. Импортолсон үнийн мэдээллийн дараа карго болон эцсийн үнийг дахин тооцно.</p>' +
      '<textarea id="imp" rows="12" placeholder="барааны-id, үнэ, эх-сурвалжийн-холбоос, зургийн-холбоос"></textarea>' +
      '<div class="bar" style="margin-top:12px"><button class="btn-s" id="go">Импортлох</button><a class="btn-s ghost" id="exp" href="#" style="display:inline-flex;align-items:center;text-decoration:none">Бүх барааг CSV-ээр татах</a></div><pre id="out" class="muted" style="white-space:pre-wrap;font-size:12px"></pre></div>';
    document.getElementById('go').addEventListener('click', async () => {
      const txt = document.getElementById('imp').value.trim(); let rows;
      try { rows = txt.startsWith('[') ? JSON.parse(txt) : txt.split(/\r?\n/).filter(Boolean).map(l => { const [id, cny, dewu_url, photo_url] = l.split(',').map(x => x.trim()); return { id, cny: Number(cny) || undefined, dewu_url, photo_url }; }); }
      catch (e) { document.getElementById('out').textContent = 'Формат буруу: ' + e.message; return; }
      document.getElementById('out').textContent = rows.length + ' мөр илгээж байна…';
      try { const r = await api('/api/admin/import', { method: 'POST', body: JSON.stringify(rows) }); document.getElementById('out').textContent = 'Шинэчилсэн: ' + r.updated + ' · зураг: ' + r.photos + (r.errors.length ? '\nАлдаа:\n' + r.errors.join('\n') : ''); }
      catch (e) { document.getElementById('out').textContent = e.message; }
    });
    document.getElementById('exp').addEventListener('click', async e => {
      e.preventDefault();
      const d = await api('/api/admin/products?per=200&page=1'); let rows = d.rows;
      for (let pg = 2; pg <= Math.ceil(d.total / 200); pg++) rows = rows.concat((await api('/api/admin/products?per=200&page=' + pg)).rows);
      const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = ['id,brand,name_en,name_mn,type,cny,weight_kg,box_cm,cargo_mnt,price_mnt,price_source,dewu_url'].concat(rows.map(p => [p.id, p.brand_slug, p.name_en, p.name_mn, p.type, p.cny, p.weight_kg, p.len_cm + 'x' + p.wid_cm + 'x' + p.hei_cm, p.cargo_mnt, p.price_mnt, p.price_source, p.dewu_url].map(q).join(','))).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'levera-products.csv'; a.click();
    });
  }

  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== tab && TABS.some(x => x[0] === h) && document.getElementById('main')) { tab = h; shell(); } });
  if (token) api('/api/admin/me').then(shell).catch(() => renderLogin()); else renderLogin();
})();
