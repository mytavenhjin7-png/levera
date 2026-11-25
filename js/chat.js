/* LEVERA Concierge: AI customer chat. Answers come from Gemini through the store server (/api/chat), which builds
   the assistant's instructions and product knowledge from the database. If the server has no GEMINI_API_KEY or is
   unreachable, it falls back to built-in answers about delivery, payment, returns, contact and matching pieces. */
(function(){
  const LV = window.LV, T = () => LV.t[LV.lang];
  const $ = s => document.querySelector(s);
  const box = $('#cc'), log = $('#ccLog'), form = $('#ccForm'), inp = $('#ccIn'), sendBtn = $('#ccSend'), sugs = $('#ccSugs'), launch = $('#ccOpen');
  let sample = null, ctl = null, busy = false, greeted = false;
  const turns = [];
  try { if (window.claude && window.claude.use) window.claude.use('sample').then(s => { sample = s; }).catch(() => {}); } catch (e) {}

  const SEND_ICON = sendBtn.innerHTML;
  const STOP_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor"/></svg>';

  function knowledge(q) {
    const ps = LV.products || [], hits = (q && LV.find ? (LV.find(q) || []) : []).slice(0, 15);
    const range = c => { const xs = ps.filter(p => p.cat === c).map(p => p.price); return xs.length ? '₮' + Math.min(...xs).toLocaleString('en-US') + '–₮' + Math.max(...xs).toLocaleString('en-US') : ''; };
    return [
      'You are "LEVERA AI", the customer assistant of LEVERA, a multi-brand online store based in Ulaanbaatar, Mongolia.',
      'Always reply in the language the customer writes in (Mongolian in Cyrillic, or English). Be warm, polished and brief: at most about 90 words, plain text, no headings or tables.',
      'Use ONLY these facts. If something is not covered, say you are not sure and give the phone numbers.',
      '- Delivery: 7–14 days from order to the customer\'s door in Ulaanbaatar. Cargo and delivery are already included in every listed price.',
      '- Payment: QPay with any Mongolian bank app (Khan Bank, Golomt, TDB, State Bank, XacBank and others). No card needed.',
      '- Returns: every purchase is final. No returns or exchanges once an order is confirmed, because each piece is sourced to order. Invite customers to ask about size, fit or colour before ordering.',
      '- Authenticity: luxury pieces are authenticated and inspected at the warehouse before they ship.',
      '- Contact: phone 9993 5918 or 9022 060, email leverastore6@gmail.com. Showroom hours Mon–Sun 10:00–20:00 Ulaanbaatar time.',
      '- Order tracking: order numbers look like LV-26-0000; the tracker is in the site footer. You cannot see real orders.',
      '- Brands: ' + (LV.brands || LV.corridor).map(c => c.name).join(', ') + '.',
      '- Pricing: all prices are in MNT and final, with LEVERA service and delivery included; fragrance and beauty prices also include Mongolian customs duty and VAT. Do not talk about cargo, weights or shipping rates.',
      '- Catalogue: ' + ps.length + ' pieces. Price ranges: ' + ['apparel','footwear','bags','accessories','fragrance'].map(c => c + ' ' + range(c)).join('; ') + '. The shop page is shop.html.',
      hits.length ? '- Pieces matching the question (MNT, all in): ' + hits.map(p => p.brand + ' ' + p.en + ' ₮' + p.price.toLocaleString('en-US')).join('; ') + '.' : '',
      'Never say you placed an order, took a payment, reserved stock or checked a real order. Never invent prices, stock or discounts.'
    ].join('\n');
  }

  function fallback(q) {
    const mn = /[Ѐ-ӿ]/.test(q) || LV.lang === 'mn';
    const s = q.toLowerCase();
    const A = mn ? {
      ship: 'Захиалга таны үүдэнд 7–14 хоногт хүрнэ. Хүргэлтийн зардал үнэд аль хэдийн багтсан.',
      ret: 'Бараа бүрийг таны захиалгаар тусгайлан авчирдаг тул захиалга баталгаажсаны дараа буцаалт, солилт хийх боломжгүй. Хэмжээ, загвараа эргэлзэж байвал захиалахаасаа өмнө 9993 5918 дугаараар зөвлөгөө аваарай.',
      pay: 'Төлбөрийг QPay-ээр, дурын банкны аппаар (Хаан, Голомт, ХХБ, Төрийн банк, Хас г.м.) уншуулж төлнө. Карт шаардлагагүй.',
      auth: 'Люкс бараа бүр илгээгдэхээсээ өмнө жинхэнэ эсэхийн баталгаажуулалт болон манай агуулахын шалгалтаар дамждаг.',
      contact: 'Бидэнтэй 9993 5918 эсвэл 9022 060 дугаараар холбогдоорой. Шоурум Даваа–Ням 10:00–20:00 ажиллана.',
      brand: 'Манай брэндүүд: ' + (LV.brands || LV.corridor).map(c => c.name).join(', ') + '.',
      def: 'Хүргэлт, төлбөр, буцаалт, брэндийн талаар асууж болно. Бусад асуултаар 9993 5918 дугаарт залгаарай.'
    } : {
      ship: 'Orders reach your door in Ulaanbaatar in 7–14 days, Delivery is already included in the price.',
      ret: 'Every piece is sourced to order for you, so once an order is confirmed we can’t accept returns or exchanges. Unsure about a size or fit? Call 9993 5918 before you order and we’ll help.',
      pay: 'You pay with QPay by scanning with any Mongolian bank app (Khan Bank, Golomt, TDB, State Bank, XacBank and more). No card needed.',
      auth: 'Every luxury piece is authenticated and inspected at our warehouse before it ships.',
      contact: 'Call us on 9993 5918 or 9022 060. The showroom is open Mon–Sun, 10:00–20:00.',
      brand: 'Our houses: ' + (LV.brands || LV.corridor).map(c => c.name).join(', ') + '.',
      def: 'I can help with delivery, payment, returns and our brands. For anything else, call 9993 5918.'
    };
    // product questions work without the server too: match the catalogue already loaded in the page
    const STOP = /^(une|хэд|вэ|бэ|үнэ|байна|байгаа|юу|уу|үү|hed|ve|bga|price|how|much|is|the|do|you|have|a|an|of|for)$/;
    const words = s.replace(/[’']/g, '').split(/[^\p{L}\p{N}]+/u).filter(w => w && !STOP.test(w));
    if (words.some(w => w.length > 1) && LV.products) {
      const hits = LV.uniq(LV.products).map(p => {
        const hay = (p.brand + ' ' + p.en + ' ' + p.mn).toLowerCase().replace(/[’']/g, ''), toks = new Set(hay.split(/[^\p{L}\p{N}]+/u));
        let sc = 0; for (const w of words) if (toks.has(w)) sc += 3; else if (w.length > 2 && hay.includes(w)) sc += 1;
        return [sc - LV.fame(p) / 1000, p];
      }).filter(x => x[0] >= 3).sort((a, b) => b[0] - a[0]).slice(0, 4).map(x => x[1]);
      if (hits.length) return (mn ? 'Манайд байгаа:\n' : 'In stock with us:\n') + hits.map(p => '• ' + p.brand + ' — ' + LV.nm(p) + ' · ' + LV.money(p.price) + '\n  product.html?id=' + p.id).join('\n') + (mn ? '\nҮнэд карго, хүргэлт багтсан. 7–14 хоногт хүргэнэ.' : '\nCargo and delivery included. Arrives in 7–14 days.');
    }
    if (/хүрг|хоног|ирэх|deliver|ship|cargo|карго|days|how long/.test(s)) return A.ship;
    if (/буца|соли|return|exchange|refund/.test(s)) return A.ret;
    if (/qpay|төл|pay|банк|bank|card|карт/.test(s)) return A.pay;
    if (/жинхэнэ|хуурамч|оригинал|fake|authentic|real|original/.test(s)) return A.auth;
    if (/утас|холбо|хаяг|цаг|phone|call|contact|address|hours|open/.test(s)) return A.contact;
    if (/брэнд|brand/.test(s)) return A.brand;
    const hit = (LV.products || []).filter(p => s.includes(p.brand.toLowerCase().replace(/[’']/g, '')) || s.includes(p.brand.toLowerCase()));
    if (hit.length) return hit.slice(0, 4).map(p => p.brand + ' — ' + (mn ? p.mn : p.en) + ': ₮' + p.price.toLocaleString('en-US')).join('\n');
    return A.def;
  }

  const clean = t => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '');
  function bubble(who, text) {
    const d = document.createElement('div'); d.className = 'msg ' + who;
    if (text == null) { d.classList.add('wait'); d.innerHTML = '<i></i><i></i><i></i>'; } else d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function fill(d, text) { d.classList.remove('wait'); d.textContent = clean(text); log.scrollTop = log.scrollHeight; }
  function renderSugs() {
    const t = T();
    sugs.innerHTML = [t.cc_s1, t.cc_s2, t.cc_s3, t.cc_s4].map(q => '<button type="button" class="cc-sug">' + q + '</button>').join('');
  }
  function setBusy(b) { busy = b; sendBtn.innerHTML = b ? STOP_ICON : SEND_ICON; sendBtn.setAttribute('aria-label', b ? 'Stop' : 'Send'); }

  async function ask(text) {
    text = text.trim(); if (!text) return;
    if (busy) return;
    sugs.hidden = true; box.classList.add('chatting');
    bubble('me', text); turns.push({ role: 'user', content: text });
    const d = bubble('bot', null); setBusy(true);
    const endpoint = window.LEVERA_CHAT_ENDPOINT;
    if (endpoint) {
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: turns.slice(-12), product: /product\.html/.test(location.pathname) ? new URLSearchParams(location.search).get('id') : null }) });
        if (!r.ok) throw new Error(r.status);
        const data = await r.json(); const a = String(data.reply || '').trim() || T().cc_err;
        fill(d, a); turns.push({ role: 'assistant', content: a });
      } catch (e) { const a = fallback(text); fill(d, a); turns.push({ role: 'assistant', content: a }); }
      setBusy(false); return;
    }
    if (!sample) {
      await new Promise(r => setTimeout(r, 650));
      const a = fallback(text); fill(d, a); turns.push({ role: 'assistant', content: a }); setBusy(false); return;
    }
    ctl = new AbortController();
    try {
      const { text: ans } = await sample([{ role: 'user', content: knowledge(text) }, ...turns.slice(-12)], {
        modelTier: 'quick', cache: false, signal: ctl.signal,
        onText: ({ text }) => fill(d, text)
      });
      fill(d, ans); turns.push({ role: 'assistant', content: ans });
    } catch (e) {
      const code = e && e.code;
      if (code === 'cancelled') { if (e.text) turns.push({ role: 'assistant', content: e.text }); else d.remove(); }
      else if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'refused'].includes(code)) {
        if (code !== 'refused') sample = null;
        const a = fallback(text); fill(d, a); turns.push({ role: 'assistant', content: a });
      }
      else if (code === 'rate_limited') fill(d, (e.text ? e.text + '\n\n' : '') + T().cc_busy);
      else fill(d, (e && e.text) ? e.text : T().cc_err);
    } finally { setBusy(false); ctl = null; }
  }

  function open() {
    box.classList.add('on'); box.setAttribute('aria-hidden', 'false'); launch.setAttribute('aria-expanded', 'true'); launch.classList.add('hide');
    // first view: the welcome panel with a big question box and common questions; the chat log takes over once they ask
    if (!greeted) { greeted = true; bubble('bot', T().cc_hi); }
    setTimeout(() => (box.classList.contains('chatting') ? inp : $('#ccBigIn')).focus(), 120);
  }
  function close() { box.classList.remove('on'); box.setAttribute('aria-hidden', 'true'); launch.setAttribute('aria-expanded', 'false'); launch.classList.remove('hide'); launch.focus(); }
  launch.addEventListener('click', open);
  $('#ccClose').addEventListener('click', close);
  $('#ccMin').addEventListener('click', close);
  $('#ccBig').addEventListener('submit', e => { e.preventDefault(); const v = $('#ccBigIn').value; $('#ccBigIn').value = ''; ask(v); setTimeout(() => inp.focus(), 50); });
  $('#ccBigIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ccBig').requestSubmit(); } });
  $('#ccHome').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) { ask(T()[b.dataset.q] || b.textContent); setTimeout(() => inp.focus(), 50); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('on')) close(); });
  form.addEventListener('submit', e => { e.preventDefault(); if (busy) { if (ctl) ctl.abort(); return; } const v = inp.value; inp.value = ''; ask(v); });
  sugs.addEventListener('click', e => { const b = e.target.closest('.cc-sug'); if (b) ask(b.textContent); });
  new MutationObserver(() => { if (!sugs.hidden) renderSugs(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
