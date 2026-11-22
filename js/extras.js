/* LEVERA — shopping extras, on every store page (after store.js):
   ♡ saved pieces (this browser), recently viewed, product rails on the home page (signature basketball,
   winter), size guide and share on the product page. Everything is kept in localStorage; nothing is sent. */
(function () {
  const LV = window.LV, { $, T, esc, fill } = LV;
  const read = k => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';

  /* ---------- ♡ saved ---------- */
  let saved = read('lv-saved');
  LV.isSaved = id => saved.includes(id);
  LV.saved = () => saved.slice();
  function syncSaved() {
    document.querySelectorAll('[data-fav]').forEach(b => { const on = LV.isSaved(b.dataset.fav); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? T().fav_remove : T().fav_add); });
    const c = $('#savedCount'); if (c) { c.textContent = saved.length; c.hidden = !saved.length; }
  }
  // replace the whole list (account.js: the account's saved pieces merged with this device's)
  LV.setSaved = list => { saved = [...new Set(list)].slice(0, 300); write('lv-saved', saved); syncSaved(); document.dispatchEvent(new CustomEvent('lv:saved')); };
  function toggleSaved(id) {
    saved = LV.isSaved(id) ? saved.filter(x => x !== id) : [id, ...saved].slice(0, 300);
    write('lv-saved', saved); syncSaved();
    document.dispatchEvent(new CustomEvent('lv:saved'));
  }
  // header: ♡ with a count, next to the bag
  const bagBtn = $('#openBag');
  if (bagBtn && !$('#savedLink')) {
    bagBtn.insertAdjacentHTML('beforebegin', '<a class="icon-btn saved-link" id="savedLink" href="saved.html" aria-label="' + esc(T().fav_page) + '">' + HEART.replace('width="18" height="18"', 'width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4"') + '<span class="count" id="savedCount" hidden>0</span></a>');
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); toggleSaved(b.dataset.fav);
  }, true);

  /* ---------- recently viewed ---------- */
  LV.markSeen = id => { write('lv-seen', [id, ...read('lv-seen').filter(x => x !== id)].slice(0, 16)); };
  const seenList = (except) => read('lv-seen').filter(x => x !== except).map(x => LV.byId.get(x)).filter(Boolean);

  /* ---------- product rails ---------- */
  function rail(id, eyebrow, title, items, link, linkLabel) {
    if (!items.length) return '';
    return '<section class="block rail-sec" id="' + id + '"><div class="wrap">' +
      '<div class="sec-head"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h2>' + title + '</h2></div>' + (link ? '<a class="btn ink" href="' + link + '"><span>' + esc(linkLabel) + '</span><span aria-hidden="true">→</span></a>' : '') + '</div>' +
      '<div class="prail" role="list">' + items.map(p => '<div role="listitem">' + LV.card(p, 99) + '</div>').join('') + '</div></div></section>';
  }
  const SIG = /^(KD |LeBron |Kobe |Book )/;
  const WINTER = new Set(['puffer', 'coat']);
  function homeRails() {
    const edit = $('#edit'); if (!edit) return;
    document.querySelectorAll('.rail-sec').forEach(s => s.remove());
    const t = T(), ps = LV.products;
    // one colourway per model, newest model numbers first
    // one shoe per model (LeBron XXIII and XXIII Elite count as one), then take turns between the
    // signature families so the rail reads Kobe → LeBron → KD → Book → Jokic → … instead of two of a kind
    const FAM = ['Kobe', 'LeBron', 'KD', 'Book', 'Jokic', 'Ja', 'Tatum', 'Sabrina', 'G.T. Cut', 'Luka', 'Giannis'];
    const famOf = p => FAM.find(f => (p.line || '').replace(/^(Air Zoom |WMNS |Nike )/, '').startsWith(f + ' '));
    const byFam = {}; const seenModel = new Set();
    for (const p of ps.filter(p => (p.b === 'nike' || /jokic/i.test(p.line || '')) && famOf(p)).sort((a, b) => (b.feat - a.feat) || (b.sort - a.sort))) {
      const f = famOf(p), model = (p.line || '').replace(/^(Air Zoom |WMNS |Nike )/, '').split(' ').slice(0, f.split(' ').length + (f === 'Jokic' ? 2 : 1)).join(' ');
      if (seenModel.has(model)) continue; seenModel.add(model); (byFam[f] ||= []).push(p);
    }
    const sig = [];
    for (let i = 0; sig.length < 40 && i < 30; i++) for (const f of FAM) if (byFam[f] && byFam[f][i]) sig.push(byFam[f][i]);
    // Columbia first (all of it), then other warm outerwear; no Acne Studios here
    const winter = ps.filter(p => p.b !== 'acne-studios' && (WINTER.has(p.type) || (p.type === 'jacket' && ['the-north-face', 'arcteryx', 'columbia'].includes(p.b)) || p.b === 'columbia')).sort((a, b) => (b.b === 'columbia') - (a.b === 'columbia'));
    const pickWinter = []; const perBrand = {};
    for (const p of winter) { perBrand[p.b] = (perBrand[p.b] || 0) + 1; if (p.b === 'columbia' || perBrand[p.b] <= 3) pickWinter.push(p); }
    const seen = seenList();
    // best sellers from real paid orders; until enough pieces have sold, an honestly-named featured pick
    const sold = ps.filter(p => p.sold > 0).sort((a, b) => b.sold - a.sold);
    const best = sold.length >= 4 ? sold.slice(0, 16) : ps.filter(p => p.feat > 0).concat(sig.slice(0, 6)).slice(0, 16);
    edit.insertAdjacentHTML('afterend',
      rail('bestRail', sold.length >= 4 ? t.best_k : t.pick_k, sold.length >= 4 ? t.best_h : t.pick_h, best, sold.length >= 4 ? 'shop.html?sort=best' : 'shop.html', t.best_all) +
      rail('sigRail', t.sig_k, t.sig_h, sig.slice(0, 24), 'shop.html?brand=nike&cat=footwear', t.sig_all) +
      rail('winterRail', t.win_k, t.win_h, pickWinter.slice(0, 16), 'shop.html?type=puffer', t.win_all) +
      (seen.length >= 2 ? rail('seenRail', t.seen_k, t.seen_h, seen.slice(0, 12)) : ''));
    syncSaved();
  }
  function productExtras() {
    const pid = new URLSearchParams(location.search).get('id'), rel = $('#related');
    if (!pid || !rel) return;
    const seen = seenList(pid);
    const old = $('#seenRail'); if (old) old.remove();
    if (seen.length) rel.insertAdjacentHTML('afterend', rail('seenRail', T().seen_k, T().seen_h, seen.slice(0, 12)));
    LV.markSeen(pid);
    syncSaved();
  }
  function savedPage() {
    const grid = $('#savedGrid'); if (!grid) return;
    const t = T(), list = saved.map(id => LV.byId.get(id)).filter(Boolean);
    document.title = t.fav_page + ' — LEVERA';
    $('#savedN').textContent = fill(t.results, { n: list.length });
    grid.innerHTML = list.length ? list.map((p, i) => LV.card(p, i)).join('') : '<div class="saved-empty"><p>' + t.fav_empty + '</p><a class="btn ink" href="shop.html"><span>' + t.cta + '</span><span aria-hidden="true">→</span></a></div>';
    syncSaved();
  }

  /* ---------- size guide ---------- */
  // approximate conversions (Nike men's chart); each house cuts a little differently, so the note says so
  const SHOES = [['36', '4', '3.5', '22.5'], ['37', '4.5', '4', '23'], ['38', '5.5', '5', '24'], ['39', '6.5', '5.5', '24.5'], ['40', '7', '6', '25'], ['41', '8', '7', '26'], ['42', '8.5', '7.5', '26.5'], ['43', '9.5', '8.5', '27.5'], ['44', '10', '9', '28'], ['45', '11', '10', '29'], ['46', '12', '11', '30']];
  const TOPS = [['XS', '84–88', '70–74'], ['S', '88–96', '74–80'], ['M', '96–104', '80–88'], ['L', '104–112', '88–96'], ['XL', '112–120', '96–104'], ['XXL', '120–128', '104–112']];
  const WAIST = [['28', '71'], ['29', '74'], ['30', '76'], ['31', '79'], ['32', '81'], ['33', '84'], ['34', '86'], ['36', '91']];
  function sizeGuide(cat) {
    const t = T();
    const table = (head, rows) => '<table class="sg-t"><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const body = cat === 'footwear'
      ? table(['EU', 'US', 'UK', t.sg_cm], SHOES) + '<p class="sg-note">' + t.sg_shoe_note + '</p>'
      : table([t.sg_size, t.sg_chest, t.sg_waist], TOPS) + '<h3>' + t.sg_jeans + '</h3>' + table([t.sg_waist_in, t.sg_waist_cm], WAIST) + '<p class="sg-note">' + t.sg_cloth_note + '</p>';
    let el = $('#sg');
    if (!el) { document.body.insertAdjacentHTML('beforeend', '<div class="sg" id="sg" role="dialog" aria-modal="true" aria-labelledby="sgH" hidden></div>'); el = $('#sg'); }
    el.innerHTML = '<div class="sg-card"><div class="sg-head"><h2 id="sgH">' + t.sg_h + '</h2><button type="button" class="sg-x" data-sg-close aria-label="' + (t.close || 'Close') + '"><svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg></button></div>' +
      '<p class="sg-how">' + (cat === 'footwear' ? t.sg_how_shoe : t.sg_how_cloth) + '</p>' + body + '<p class="sg-help">' + t.sg_help + '</p></div>';
    el.hidden = false; document.documentElement.classList.add('lb-on');
    el.querySelector('[data-sg-close]').focus();
  }
  const closeGuide = () => { const el = $('#sg'); if (el && !el.hidden) { el.hidden = true; document.documentElement.classList.remove('lb-on'); const b = $('[data-size-guide]'); if (b) b.focus(); } };
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-size-guide]'); if (g) { sizeGuide(g.dataset.sizeGuide); return; }
    if (e.target.closest('[data-sg-close]') || e.target.id === 'sg') closeGuide();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGuide(); });

  /* ---------- share ---------- */
  document.addEventListener('click', async e => {
    const s = e.target.closest('[data-share]'); if (!s) return;
    const url = location.href.split('#')[0], title = document.title;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      s.querySelector('span').textContent = T().share_done;
      setTimeout(() => { s.querySelector('span').textContent = T().share; }, 2200);
    } catch (err) { /* cancelled */ }
  });

  /* ---------- wire up ---------- */
  // the home rails sit below the first screen: draw them when the browser is idle, so the page answers taps first
  const idle = window.requestIdleCallback || (f => setTimeout(f, 300));
  function renderAll() { idle(homeRails, { timeout: 1500 }); savedPage(); syncSaved(); }
  LV.ready.then(() => { renderAll(); productExtras(); });
  document.addEventListener('lv:lang', () => { renderAll(); const s = $('#seenRail'); if (s && $('#related')) productExtras(); });
  document.addEventListener('lv:saved', savedPage);
  // cards drawn later by other scripts (shop grid, related) pick up the right ♡ state
  let syncQueued = false;   // at most once per frame, however many nodes change
  new MutationObserver(() => { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; syncSaved(); }); }).observe(document.body, { childList: true, subtree: true });
})();
