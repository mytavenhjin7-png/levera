/* footer behaviour: pointer light, drop sign-up, live order tracker, UB clock, copy, language, back to top */
(function(){
  const LV = window.LV, T = () => LV.t[LV.lang];
  const $ = s => document.querySelector(s);
  const footer = $('#footer'); if (!footer) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mark = $('#fMark');
  footer.addEventListener('pointermove', e => {
    const p = e.target.closest('.f-panel');
    if (p) { const r = p.getBoundingClientRect(); p.style.setProperty('--x', (e.clientX - r.left) + 'px'); p.style.setProperty('--y', (e.clientY - r.top) + 'px'); }
    const r = mark.getBoundingClientRect();
    mark.style.setProperty('--mx', (e.clientX - r.left) + 'px'); mark.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { mark.classList.add('in'); io.disconnect(); } }, { threshold: .2 });
    io.observe(mark);
  } else mark.classList.add('in');

  // drop sign-up with interests
  const ints = [...footer.querySelectorAll('[data-int]')];
  ints.forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
  const news = $('#news'), ok = $('#newsOk'); let subscribed = false;
  function renderOk() {
    if (!subscribed) return;
    const t = T(), list = ints.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => t['f_' + b.dataset.int]);
    ok.textContent = list.length ? t.news_ok_x.replace('{x}', list.join(', ')) : t.news_ok; ok.hidden = false;
  }
  news.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#email').value.trim(), interests = ints.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.int);
    try { await LV.api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email, interests, lang: LV.lang }) }); }
    catch (err) { if (err.status === 400) { ok.textContent = T().co_err_req.split('.')[0]; ok.hidden = false; return; } }
    subscribed = true; renderOk(); $('#email').value = '';
  });

  // order tracker: live status, the date each step happened, an arrival estimate, what was ordered,
  // the shopper's own recent orders (remembered on this device) and a direct line when something is off
  const steps = $('#trSteps'), err = $('#trErr'), inp = $('#orderNo'), FLOW = ['paid', 'ordered', 'ereen', 'ub', 'delivered'];
  const mine = () => { try { return JSON.parse(localStorage.getItem('lv-orders') || '[]'); } catch (e) { return []; } };
  let stage = 0, found = null;
  const day = s => { const d = new Date(String(s).replace(' ', 'T') + (/Z|+/.test(s) ? '' : 'Z')); return isNaN(d) ? '' : d.toLocaleDateString(LV.lang === 'mn' ? 'mn-MN' : 'en-GB', { month: 'short', day: 'numeric' }); };
  function renderSteps() {
    const t = T(), when = {}; if (found) (found.history || []).forEach(h => { when[h.status] = h.at; });
    steps.innerHTML = FLOW.map((k, i) => { const n = i + 1; return '<li class="' + (n < stage ? 'done' : n === stage ? 'done now' : '') + '"' + (n === stage ? ' aria-current="step"' : '') + '><span class="n">0' + n + '</span>' + t['st_' + k] + (when[k] ? ' <small class="mono">· ' + day(when[k]) + '</small>' : '') + '</li>'; }).join('');
    const note = $('#trNote'), box = $('#trMore');
    if (found) {
      note.textContent = found.no + ' · ' + t['st_' + found.status] + ' · ' + LV.money(found.total);
      const c = new Date(String(found.created_at).replace(' ', 'T') + 'Z'), eta = d => { const x = new Date(c); x.setDate(x.getDate() + d); return x.toLocaleDateString(LV.lang === 'mn' ? 'mn-MN' : 'en-GB', { month: 'short', day: 'numeric' }); };
      box.innerHTML = (found.status !== 'delivered' && found.status !== 'cancelled' && !isNaN(c) ? '<p class="tr-eta"><b>' + t.tr_eta + '</b> ' + eta(7) + ' – ' + eta(14) + '</p>' : '') +
        (found.status === 'pending' ? '<p class="tr-eta">' + t.tr_pending + '</p>' : '') +
        '<ul class="tr-items">' + (found.items || []).map(i => '<li><img src="' + LV.esc(i.img || '') + '" alt="" loading="lazy"><span>' + LV.esc(i.brand) + ' · ' + LV.esc(LV.lang === 'mn' ? (i.name_mn || i.name) : i.name) + (i.size && i.size !== 'One size' ? ' · ' + LV.esc(i.size) : '') + ' × ' + i.qty + '</span></li>').join('') + '</ul>' + help();
    } else box.innerHTML = '';
    const list = mine(); $('#trMine').innerHTML = list.length ? '<span class="f-label">' + t.tr_mine + '</span>' + list.map(n => '<button type="button" class="tr-chip mono" data-no="' + LV.esc(n) + '">' + LV.esc(n) + '</button>').join('') : '';
  }
  const help = () => '<p class="tr-help">' + T().tr_help + ' <a href="tel:+97699935918">9993 5918</a> · <a href="https://www.facebook.com/" target="_blank" rel="noopener">Facebook</a></p>';
  const showErr = msg => { err.innerHTML = LV.esc(msg) + ' ' + help(); err.hidden = false; inp.setAttribute('aria-invalid', 'true'); stage = 0; found = null; renderSteps(); };
  async function track(no) {
    try {
      found = await LV.api('/api/orders/' + encodeURIComponent(no));
      err.hidden = true; inp.removeAttribute('aria-invalid');
      stage = found.status === 'pending' || found.status === 'cancelled' ? 0 : FLOW.indexOf(found.status) + 1;
      try { const l = mine().filter(x => x !== found.no); l.unshift(found.no); localStorage.setItem('lv-orders', JSON.stringify(l.slice(0, 5))); } catch (e) {}
      renderSteps();
    } catch (e2) { showErr(e2.status === 404 ? T().tr_none : T().tr_offline); }
  }
  $('#trMine').addEventListener('click', e => { const b = e.target.closest('[data-no]'); if (b) { inp.value = b.dataset.no; track(b.dataset.no); } });
  $('#trackForm').addEventListener('submit', e => {
    e.preventDefault();
    const m = inp.value.trim().toUpperCase().replace(/s+/g, '').match(/^LV-?(d{2})-?(d{4})$/);
    if (!m) return showErr(T().tr_err);
    inp.value = 'LV-' + m[1] + '-' + m[2]; track(inp.value);
  });
  const qNo = new URLSearchParams(location.search).get('order') || mine()[0];
  if (qNo) { inp.value = qNo; track(qNo); }
  inp.addEventListener('input', () => { if (!err.hidden) { err.hidden = true; inp.removeAttribute('aria-invalid'); } });

  // live Ulaanbaatar clock + showroom status
  const timeEl = $('#ubTime'), st = $('#ubStatus'), OPEN = 10, CLOSE = 20;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  function tick() {
    const p = {}; fmt.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    const h = (+p.hour) % 24, open = h >= OPEN && h < CLOSE, t = T();
    timeEl.innerHTML = String(h).padStart(2, '0') + ':' + p.minute + '<small>' + p.second + '</small>';
    st.classList.toggle('open', open);
    st.querySelector('span').textContent = open ? t.cg_open + ' · ' + t.cg_closes + ' ' + CLOSE + ':00' : t.cg_closed + ' · ' + t.cg_opens + ' ' + OPEN + ':00';
  }
  tick(); setInterval(tick, 1000);

  // copy with a selection fallback
  footer.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const done = () => { b.textContent = T().copied; b.classList.add('ok'); setTimeout(() => { b.textContent = T().copy; b.classList.remove('ok'); }, 1600); };
    const fallback = () => { const s = b.previousElementSibling, r = document.createRange(); r.selectNodeContents(s); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); done(); };
    try { navigator.clipboard.writeText(b.dataset.copy).then(done, fallback); } catch (_) { fallback(); }
  });

  // columns open on desktop, accordions on phones
  const cols = footer.querySelectorAll('.f-col'), mq = matchMedia('(min-width: 761px)');
  const sync = () => cols.forEach(d => { d.open = mq.matches; });
  sync(); mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);

  // language, kept in step with the header switch
  const langBtns = footer.querySelectorAll('[data-lang]');
  langBtns.forEach(b => b.addEventListener('click', () => { const h = document.getElementById('l-' + b.dataset.lang); if (h) h.click(); }));
  function syncLang() { langBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LV.lang))); renderSteps(); renderOk(); tick(); }
  new MutationObserver(syncLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  syncLang();

  // back to top with a scroll-progress ring
  const top = $('#toTop'), prog = top.querySelector('.prog'), C = 2 * Math.PI * 24;
  prog.style.strokeDasharray = C;
  let raf = 0;
  const upd = () => { raf = 0; const max = document.documentElement.scrollHeight - innerHeight; prog.style.strokeDashoffset = C * (1 - (max > 0 ? scrollY / max : 0)); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true }); upd();
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
})();
