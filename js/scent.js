/* LEVERA — scent finder: 10 questions, then the perfume from the shop that fits best, with the reasons why.
   Each perfume gets a profile from its notes (js/frag-notes.js), so a new perfume joins the quiz on its own. */
(function () {
  const LV = window.LV, { $, esc } = LV;
  const money = n => '₮' + Math.round(n || 0).toLocaleString('en-US');
  const mn = () => LV.lang === 'mn';
  const L = (m, e) => (mn() ? m : e);

  /* ---------- scent dimensions ---------- */
  const DIMS = ['F', 'C', 'S', 'W', 'A', 'L', 'R'];
  const DIM_TXT = {
    F: ['шинэлэг, цитрус', 'fresh, citrus'], C: ['цэвэрхэн, ургамлын', 'clean, aromatic'], S: ['амтлаг, ваниль', 'sweet, vanilla'],
    W: ['модлог', 'woody'], A: ['дулаан, халуун ногоот', 'warm, spicy'], L: ['цэцэгсийн', 'floral'], R: ['жимсний', 'fruity']
  };
  const NOTE_DIM = {
    F: ['bergamot', 'lemon', 'mandarin', 'grapefruit', 'orange', 'lime', 'mint', 'sea notes', 'marine', 'yuzu', 'bitter orange', 'blood orange', 'citron', 'neroli', 'seaweed', 'salt', 'mineral notes'],
    C: ['lavender', 'sage', 'geranium', 'juniper', 'cotton flower', 'musk', 'white musk', 'ambroxan', 'aldehydes', 'basil', 'rosemary', 'artemisia', 'ambrette', 'coriander', 'violet leaf', 'tea', 'green tea', 'thyme', 'angelica', 'ambrox', 'clary', 'petitgrain'],
    S: ['vanilla', 'bourbon vanilla', 'tonka bean', 'caramel', 'toffee', 'honey', 'praline', 'cacao', 'chocolate', 'coffee', 'almond', 'bitter almond', 'benzoin', 'meringue', 'brown sugar', 'rum', 'cognac', 'toffee', 'marshmallow'],
    W: ['cedar', 'sandalwood', 'vetiver', 'oud', 'patchouli', 'guaiac wood', 'oakmoss', 'cypress', 'cashmere wood', 'cashmeran', 'birch', 'wood', 'woods', 'moss', 'akigalawood', 'rosewood', 'guaiac', 'oak', 'amberwood'],
    A: ['cardamom', 'black pepper', 'pepper', 'pink pepper', 'cinnamon', 'clove', 'ginger', 'incense', 'amber', 'leather', 'myrrh', 'opoponax', 'saffron', 'tobacco', 'nutmeg', 'palo santo', 'white tobacco', 'whisky', 'cade', 'saffron', 'labdanum', 'ambergris', 'cumin', 'elemi', 'turmeric', 'sichuan pepper', 'styrax', 'spices', 'smoke', 'suede', 'frankincense', 'olibanum'],
    L: ['jasmine', 'rose', 'peony', 'orange blossom', 'tuberose', 'iris', 'violet', 'ylang-ylang', 'lily of the valley', 'lily', 'datura', 'carnation', 'magnolia', 'freesia', 'frangipani', 'heliotrope', 'osmanthus', 'orris', 'orchid', 'gardenia', 'white flowers'],
    R: ['apple', 'green apple', 'pear', 'pineapple', 'strawberry', 'raspberry', 'plum', 'black currant', 'blackberry', 'peach', 'apricot', 'fig', 'coconut', 'cherry', 'banana', 'passionfruit', 'blackberries', 'william pear', 'dragon fruit', 'red berries', 'lychee', 'dried fruit', 'black cherry', 'sour cherry']
  };
  const DIM_OF = {}; for (const d of DIMS) for (const n of NOTE_DIM[d]) DIM_OF[n] = d;
  const FAM_DIM = { fresh: 'F', citrus: 'F', aquatic: 'F', aromatic: 'C', woody: 'W', chypre: 'W', amber: 'A', leather: 'A', gourmand: 'S', floral: 'L', fruity: 'R' };

  /* ---------- the questions: v = scent pull, i = strength wanted, g = who it's for, no = dislike, max = budget ---------- */
  const Q = [
    { q: ['Үнэртэй усаа хэнд зориулж байна вэ?', 'Who is the fragrance for?'], o: [
      { t: ['Эрэгтэй', 'Him'], s: ['Илүү эр хүний хэв маягтай', 'A more masculine style'], g: 'm' },
      { t: ['Эмэгтэй', 'Her'], s: ['Илүү эмэгтэйлэг хэв маягтай', 'A more feminine style'], g: 'f' },
      { t: ['Хамаагүй', 'Either'], s: ['Хүйс харгалзахгүй, үнэр нь чухал', 'Only the scent matters'], g: null }] },
    { q: ['Аль улиралд хамгийн их түрхэх вэ?', 'When will you wear it most?'], o: [
      { t: ['Зун', 'Summer'], s: ['Халуун, нарлаг өдрүүд', 'Hot, sunny days'], v: { F: 2.5, C: 1, R: 1 }, season: 'summer' },
      { t: ['Хавар, намар', 'Spring & autumn'], s: ['Сэрүүн, зөөлөн цаг агаар', 'Cool, mild weather'], v: { C: 1.2, L: 1, W: 1, R: .6 } },
      { t: ['Өвөл', 'Winter'], s: ['−40°-ийн хүйтэн', 'Deep −40° cold'], v: { S: 1.6, A: 2, W: 1.6 }, season: 'winter' },
      { t: ['Бүх улиралд', 'All year'], s: ['Нэг л үнэр, жилийн турш', 'One scent, all year'], v: { C: 1.2, W: 1, F: 1, A: .5 } }] },
    { q: ['Ихэвчлэн хаана, ямар үед түрхэх вэ?', 'Where will you mostly wear it?'], o: [
      { t: ['Ажил, өдөр тутам', 'Work & every day'], s: ['Бусдыг төвөгшөөхгүй, цэвэрхэн', 'Clean, never too much'], v: { C: 2, F: 1 }, i: 1.4, occ: 'daily' },
      { t: ['Орой, болзоо', 'Evenings & dates'], s: ['Ойртоход мэдрэгдэх дулаан үнэр', 'Warm, close-up appeal'], v: { S: 1.6, A: 1.5, L: .5 }, i: 2.5, occ: 'date' },
      { t: ['Онцгой үйл явдал', 'Special occasions'], s: ['Хурим, үдэшлэг, баяр', 'Weddings, parties'], v: { A: 1.5, W: 1.5, S: .6 }, i: 3, occ: 'event' },
      { t: ['Спорт, аялал', 'Sport & travel'], s: ['Хөдөлгөөнтэй, идэвхтэй өдөр', 'Active, on-the-move days'], v: { F: 2.5, C: 1 }, i: 1, occ: 'active' }] },
    { q: ['Аль үнэр таныг хамгийн их татдаг вэ?', 'Which smell pulls you in first?'], o: [
      { t: ['Шинэ хальсалсан жүрж', 'Fresh orange peel'], s: ['Нимбэг, бергамот', 'Lemon, bergamot'], v: { F: 3 } },
      { t: ['Шинэ угаасан цагаан цамц', 'A freshly washed white shirt'], s: ['Цэвэр, хөнгөн, мускус', 'Clean, light, musky'], v: { C: 3 } },
      { t: ['Ваниль, карамель', 'Vanilla & caramel'], s: ['Амтлаг, бүлээн', 'Sweet, cosy'], v: { S: 3 } },
      { t: ['Хуш мод, гал', 'Cedar & a campfire'], s: ['Модлог, утлагатай', 'Woody, smoky'], v: { W: 2.2, A: 1 } }] },
    { q: ['Аль ундаа илүү таалагддаг вэ?', 'Pick a drink.'], o: [
      { t: ['Мөстэй лимонад', 'Iced lemonade'], s: ['Исгэлэн, сэргэг', 'Tart and bright'], v: { F: 2, R: 1 } },
      { t: ['Латте, какао', 'Latte or cocoa'], s: ['Зөөлөн, амтлаг', 'Soft and sweet'], v: { S: 2.5, A: .5 } },
      { t: ['Ногоон цай', 'Green tea'], s: ['Тунгалаг, тайван', 'Calm and clear'], v: { C: 2, L: .8 } },
      { t: ['Жимсний коктейль', 'A fruit cocktail'], s: ['Жимслэг, баярын', 'Fruity and festive'], v: { R: 2, A: 1 } }] },
    { q: ['Аль газар таны сэтгэлд илүү ойр вэ?', 'Which place feels most like you?'], o: [
      { t: ['Далайн эрэг', 'The seaside'], s: ['Салхи, давс, нар', 'Wind, salt, sun'], v: { F: 2.5, C: .5 } },
      { t: ['Нарс модтой ой', 'A pine forest'], s: ['Шинэхэн мод, шороо', 'Fresh wood and earth'], v: { W: 2.5, C: 1 } },
      { t: ['Цэцэрлэг', 'A garden in bloom'], s: ['Сарнай, жасмин', 'Rose, jasmine'], v: { L: 3 } },
      { t: ['Хотын шөнө', 'The city at night'], s: ['Бар, гэрэл, хөгжим', 'Bars, lights, music'], v: { A: 2, S: 1.5 } }] },
    { q: ['Үнэр тань хэр хүчтэй байвал зүгээр вэ?', 'How strong should it be?'], o: [
      { t: ['Зөвхөн ойрын хүн мэдрэх', 'Only up close'], s: ['Хөнгөн, зөөлөн', 'Light, a skin scent'], i: 1, w: 2 },
      { t: ['Тэнцвэртэй', 'Balanced'], s: ['Мэдрэгдэнэ, гэхдээ хэтрэхгүй', 'Noticeable, not loud'], i: 2, w: 2 },
      { t: ['Өрөөнд ороход мэдэгдэх', 'Fill the room'], s: ['Хүчтэй, удаан тогтоно', 'Strong, long-lasting'], i: 3, w: 2 }] },
    { q: ['Таныг хамгийн сайн илэрхийлэх үг аль вэ?', 'Which word fits you best?'], o: [
      { t: ['Тайван', 'Calm'], s: ['Цэвэрхэн, энгийн', 'Clean and simple'], v: { C: 2, F: 1 } },
      { t: ['Итгэлтэй', 'Confident'], s: ['Анхаарал татдаг', 'Leaves an impression'], v: { A: 2, W: 1.2 } },
      { t: ['Романтик', 'Romantic'], s: ['Зөөлөн, дулаахан', 'Soft and warm'], v: { L: 1.5, S: 1.5 } },
      { t: ['Адал явдалт', 'Adventurous'], s: ['Эрч хүчтэй, сэргэг', 'Energetic, lively'], v: { F: 2, R: 1 } }] },
    { q: ['Аль үнэрт дургүй вэ?', 'Anything you dislike?'], o: [
      { t: ['Хэт чихэрлэг', 'Too sweet'], s: ['Ваниль, карамель их', 'Lots of vanilla, caramel'], no: 'S' },
      { t: ['Хэт цэцэгтэй', 'Too floral'], s: ['Сарнай, жасмин их', 'Heavy rose, jasmine'], no: 'L' },
      { t: ['Хэт хурц', 'Too sharp'], s: ['Хурц халуун ногоо, утлага', 'Sharp spice, smoke'], no: 'A' },
      { t: ['Бүгд таалагдана', 'I like it all'], s: ['Хориглох зүйлгүй', 'Nothing off-limits'], no: null }] },
    { q: ['Төсөв тань хэд вэ?', 'What is your budget?'], o: [
      { t: ['₮400,000 хүртэл', 'Up to ₮400,000'], s: ['Жижиг хэмжээ ч болно', 'A smaller bottle is fine'], max: 400000 },
      { t: ['₮400,000–700,000', '₮400,000–700,000'], s: ['Дундаж', 'Mid-range'], max: 700000 },
      { t: ['₮700,000-аас дээш', 'Over ₮700,000'], s: ['Онцгой, ниш үнэр', 'Niche, special'], max: Infinity, prem: true },
      { t: ['Хамаагүй', 'No limit'], s: ['Хамгийн тохирохыг нь', 'Just the best match'], max: Infinity }] }
  ];

  /* ---------- perfume profiles ---------- */
  function strength(name) {
    if (/elixir|extrait|extreme|intense|absolu/i.test(name)) return 3;
    if (/eau de toilette|cologne/i.test(name)) return 1.3;
    if (/eau de parfum/i.test(name)) return 2.2;
    if (/parfum/i.test(name)) return 2.8;
    return 2;
  }
  const conc = name => /elixir/i.test(name) ? 'Elixir' : /eau de toilette/i.test(name) ? 'Eau de Toilette' : /eau de parfum/i.test(name) ? 'Eau de Parfum' : /parfum/i.test(name) ? 'Parfum' : '';
  function profiles() {
    const groups = new Map();
    for (const p of LV.products) if (p.type === 'perfume' && LV.fragRaw && LV.fragRaw(p.line)) {
      const k = p.b + '|' + p.line; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p);
    }
    const out = [];
    for (const list of groups.values()) {
      list.sort((a, b) => a.price - b.price);
      const p = list[0], [fam, top, heart, base] = LV.fragRaw(p.line).split('|');
      const v = Object.fromEntries(DIMS.map(d => [d, 0])), notes = Object.fromEntries(DIMS.map(d => [d, []]));
      [[top, 1], [heart, 1.3], [base, 1.6]].forEach(([s, w]) => s.split(',').map(x => x.trim()).forEach(n => { const d = DIM_OF[n]; if (d) { v[d] += w; notes[d].push(n); } }));
      if (FAM_DIM[fam]) v[FAM_DIM[fam]] += 3;
      const sum = DIMS.reduce((a, d) => a + v[d], 0) || 1; DIMS.forEach(d => { v[d] /= sum; });
      const nm = p.en || '';
      let g = null;
      if (p.b === 'parfums-de-marly') g = /delina|valaya|oriana|athalia|palatine|meliora|safanad|athena|cassili/i.test(p.line) ? 'f' : 'm';
      if (g) {} else if (/pour homme|le male|wanted|homme|\bman\b|\bmen\b/i.test(nm + ' ' + p.line)) g = 'm';
      else if (/divine|pour femme|mon paris|libre|miss|\bher\b|la belle|femme|good girl/i.test(nm + ' ' + p.line)) g = 'f';
      else if (v.L + v.R > .45) g = 'f'; else if (v.W + v.A + v.C > .6) g = 'm';
      out.push({ p, sizes: list, v, notes, fam, g, i: strength(nm) + (v.S + v.A > .45 ? .3 : 0), conc: conc(nm) });
    }
    return out;
  }

  /* ---------- scoring ---------- */
  function wants(ans) {
    const u = Object.fromEntries(DIMS.map(d => [d, 0])); let iw = 0, is = 0; const w = {};
    ans.forEach((a, qi) => {
      const o = Q[qi].o[a]; if (!o) return;
      if (o.v) for (const d in o.v) u[d] += o.v[d];
      if (o.i) { const k = o.w || 1; is += o.i * k; iw += k; }
      if ('g' in o) w.g = o.g; if ('no' in o) w.no = o.no; if (o.max) { w.max = o.max; w.prem = !!o.prem; }
      if (o.season) w.season = o.season; if (o.occ) w.occ = o.occ;
    });
    w.u = u; w.i = iw ? is / iw : 2; return w;
  }
  function score(w, x) {
    const u = w.u, nu = Math.hypot(...DIMS.map(d => u[d])) || 1, np = Math.hypot(...DIMS.map(d => x.v[d])) || 1;
    let s = DIMS.reduce((a, d) => a + u[d] * x.v[d], 0) / (nu * np);
    if (w.no) s -= x.v[w.no] * .9;
    s -= Math.abs(w.i - x.i) * .07;
    if (w.g && x.g && w.g !== x.g) s -= .22;
    const fit = x.sizes.filter(p => p.price <= (w.max || Infinity));
    if (!fit.length) s -= .3;
    if (w.prem && x.p.price >= 700000) s += .05;
    return { x, s, size: fit[0] || x.sizes[0] };
  }
  const pct = s => Math.max(52, Math.min(98, Math.round(58 + s * 42)));
  const names = list => list.slice(0, 3).map(n => LV.noteName ? LV.noteName(n) : n).join(', ');

  function reasons(w, r) {
    const x = r.x, out = [], nm = LV.base(r.size);
    // what they asked for, in this perfume's own notes
    const top = DIMS.filter(d => w.u[d] > 0).sort((a, b) => w.u[b] - w.u[a]).slice(0, 3).filter(d => x.v[d] >= .12 && x.notes[d].length).slice(0, 2);
    top.forEach((d, k) => out.push(L(
      k ? 'Таны сонгосон <b>' + DIM_TXT[d][0] + '</b> тал нь ' + esc(names(x.notes[d])) + ' нотоор илэрнэ.' : 'Та <b>' + DIM_TXT[d][0] + '</b> үнэрт татагддаг. Энэ үнэрийн ' + esc(names(x.notes[d])) + ' нот яг тэр мэдрэмжийг өгнө.',
      'You lean towards <b>' + DIM_TXT[d][1] + '</b> scents. ' + esc(nm) + ' brings exactly that with ' + esc(names(x.notes[d])) + '.')));
    if (w.season === 'winter' && x.v.S + x.v.A + x.v.W >= .4) out.push(L('Өвлийн −40°-ийн хүйтэнд дулаан суурь нот хэрэгтэй. Энэ үнэрийн ' + esc(names(x.notes.S.concat(x.notes.A, x.notes.W))) + ' нот хүйтэнд ч удаан тогтоно.', 'Deep winter needs a warm base. Its ' + esc(names(x.notes.S.concat(x.notes.A, x.notes.W))) + ' lasts even in −40° cold.'));
    else if (w.season === 'summer' && x.v.F + x.v.C >= .35) out.push(L('Зуны халуунд хүнд үнэр толгой өвдүүлдэг. Энэ үнэр нь шинэлэг, хөнгөн тул халуунд ч таатай байна.', 'Heavy scents turn cloying in the heat. This one stays light and fresh on hot days.'));
    const occ = {
      daily: L('Ажил, өдөр тутамд тохиромжтой: эргэн тойрныхоо хүнийг төвөгшөөхгүй, цэвэрхэн үнэртэнэ.', 'Made for every day: clean and polite around other people.'),
      date: L('Орой, болзоонд тохиромжтой: ойртоход л мэдрэгдэх дулаан сүүл үлдээнэ.', 'Right for evenings: it leaves a warm trail people notice up close.'),
      event: L('Онцгой үйл явдалд тохиромжтой: бусдаас ялгарч, удаан санагдана.', 'Built for big nights: it stands out and is remembered.'),
      active: L('Хөдөлгөөнтэй өдөрт тохиромжтой: сэргэг хэвээр байж, хөлстэй холилдож хүндрэхгүй.', 'Good for active days: it stays crisp and never turns heavy.')
    }[w.occ];
    if (occ && out.length < 4) out.push(occ);
    const di = Math.abs(w.i - x.i);
    if (di < .8 && x.conc && out.length < 4) out.push(L(x.conc + ' нь таны хүссэн ' + (w.i < 1.7 ? 'хөнгөн, зөөлөн' : w.i < 2.5 ? 'тэнцвэртэй' : 'хүчтэй, удаан тогтдог') + ' түвшинд тохирно.', 'As an ' + x.conc + ' it has the ' + (w.i < 1.7 ? 'light, skin-close' : w.i < 2.5 ? 'balanced' : 'strong, long-lasting') + ' strength you asked for.'));
    if (w.no && x.v[w.no] < .12 && out.length < 5) out.push(L('Та ' + { S: 'хэт чихэрлэг', L: 'хэт цэцэгтэй', A: 'хэт хурц' }[w.no] + ' үнэрт дургүй гэсэн. Энэ үнэрт тийм нот бараг байхгүй.', 'You said no to ' + { S: 'very sweet', L: 'very floral', A: 'sharp' }[w.no] + ' scents, and this one keeps that side very quiet.'));
    if (w.max && w.max < Infinity && r.size.price <= w.max && out.length < 5) out.push(L(r.size.ml + ' мл нь ' + money(r.size.price) + ' (хүргэлт багтсан), таны төсөвт багтана.', 'The ' + r.size.ml + ' ml is ' + money(r.size.price) + ' delivered, within your budget.'));
    return out.slice(0, 5);
  }

  /* ---------- views ---------- */
  const st = { step: -1, ans: [], res: null, pick: null };
  const box = () => $('#scent');
  const ring = n => '<svg class="sq-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52"/><circle class="on" cx="60" cy="60" r="52" style="stroke-dasharray:' + (n / 100 * 326.7).toFixed(1) + ' 326.7"/></svg>';

  function intro() {
    document.title = L('Үнэрийн тест', 'Scent finder') + ' — LEVERA';
    box().innerHTML = '<section class="sq-intro sq-in"><div class="sq-mist" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="eyebrow">' + L('Үнэрийн тест', 'Scent finder') + '</div>' +
      '<h1>' + L('Өөрт тохирох <em>үнэрээ</em> ол', 'Find <em>your</em> scent') + '</h1>' +
      '<p class="sq-lede">' + L('10 богино асуулт, нэг минут. Таны хариултаар дэлгүүрт байгаа үнэртэй уснуудаас яг танд тохирохыг нь сонгож, яагаад тохирохыг тайлбарлана.', 'Ten short questions, one minute. We match your answers against every fragrance in the shop and tell you why it suits you.') + '</p>' +
      '<button type="button" class="btn ink sq-start" data-sq="start"><span>' + L('Тест эхлэх', 'Start') + '</span><span aria-hidden="true">→</span></button>' +
      '<p class="sq-meta mono">10 ' + L('асуулт', 'questions') + ' · ~1 ' + L('минут', 'minute') + '</p></section>';
  }
  function question() {
    const q = Q[st.step], n = st.step + 1, a = st.ans[st.step];
    box().innerHTML = '<section class="sq-q sq-in" aria-live="polite">' +
      '<div class="sq-top"><button type="button" class="sq-back" data-sq="back" aria-label="' + L('Буцах', 'Back') + '">←</button>' +
      '<div class="sq-bar" role="progressbar" aria-valuemin="0" aria-valuemax="10" aria-valuenow="' + n + '">' + Q.map((_, i) => '<i' + (i < n ? ' class="on"' : '') + '></i>').join('') + '</div>' +
      '<span class="mono sq-n">' + String(n).padStart(2, '0') + ' / 10</span></div>' +
      '<h2>' + esc(L(q.q[0], q.q[1])) + '</h2>' +
      '<div class="sq-opts' + (q.o.length === 3 ? ' three' : '') + '" role="radiogroup">' + q.o.map((o, i) =>
        '<button type="button" role="radio" aria-checked="' + (a === i) + '" class="sq-opt" data-opt="' + i + '"><span class="sq-l mono">' + 'ABCD'[i] + '</span><span class="sq-t">' + esc(L(o.t[0], o.t[1])) + '</span><span class="sq-s">' + esc(L(o.s[0], o.s[1])) + '</span></button>').join('') + '</div></section>';
  }
  function sizeChips(r) {
    if (r.x.sizes.length < 2) return '';
    return '<div class="sq-sizes" role="group" aria-label="ml">' + r.x.sizes.map(p => '<button type="button" data-size="' + esc(p.id) + '" aria-pressed="' + (p.id === r.size.id) + '"><b>' + p.ml + ' ml</b><span>' + money(p.price) + '</span></button>').join('') + '</div>';
  }
  function result() {
    const w = wants(st.ans), list = profiles().map(x => score(w, x)).sort((a, b) => b.s - a.s);
    if (!list.length) { box().innerHTML = '<section class="sq-intro sq-in"><h1>' + L('Удахгүй', 'Coming soon') + '</h1><p class="sq-lede">' + L('Одоогоор дэлгүүрт үнэртэй ус алга.', 'No fragrances in the shop right now.') + '</p><a class="btn ink" href="shop.html"><span>' + L('Дэлгүүр', 'Shop') + '</span></a></section>'; return; }
    st.res = { w, list };
    const r = list[0]; if (st.pick) { const s = r.x.sizes.find(p => p.id === st.pick); if (s) r.size = s; }
    const p = r.size, n = LV.fragNotes(p.line), m = pct(r.s);
    document.title = L('Таны үнэр', 'Your scent') + ': ' + LV.base(p) + ' — LEVERA';
    const alt = list.slice(1, 3);
    box().innerHTML = '<section class="sq-res sq-in">' +
      '<div class="sq-res-head"><div class="eyebrow">' + L('Таны үнэр', 'Your scent') + '</div><button type="button" class="link" data-sq="again">' + L('Дахин эхлэх', 'Retake') + ' ↺</button></div>' +
      '<div class="sq-hero">' +
        '<a class="sq-photo" href="' + LV.url(p) + '"><img src="' + esc(p.img) + '" alt="' + esc(LV.base(p)) + '"></a>' +
        '<div class="sq-info">' +
          '<div class="sq-match">' + ring(m) + '<div><b>' + m + '%</b><span class="mono">' + L('тохирол', 'match') + '</span></div></div>' +
          '<p class="sq-brand">' + esc(p.brand) + '</p><h1 class="sq-name">' + esc(LV.base(p)) + '</h1>' +
          (n ? '<p class="sq-fam">' + esc(n.family) + (r.x.conc ? ' · ' + r.x.conc : '') + '</p>' : '') +
          '<h2 class="sq-why mono">' + L('Яагаад танд тохирох вэ', 'Why it suits you') + '</h2>' +
          '<ul class="sq-reasons">' + reasons(w, r).map(t => '<li>' + t + '</li>').join('') + '</ul>' +
          sizeChips(r) +
          '<div class="sq-buy"><span class="sq-price">' + money(p.price) + '<small>' + L('хүргэлт багтсан', 'delivery included') + '</small></span>' +
          '<button type="button" class="btn ink" data-add="' + esc(p.id) + '"><span>' + L('Сагсанд нэмэх', 'Add to bag') + '</span></button>' +
          '<a class="btn" href="' + LV.url(p) + '"><span>' + L('Дэлгэрэнгүй', 'Details') + '</span></a></div>' +
        '</div></div>' +
      (n ? '<div class="sq-pyr"><h2 class="mono">' + L('Хэрхэн үнэртэх вэ', 'How it unfolds') + '</h2><ol>' +
        '<li><span class="mono">' + L('Эхний 15 минут', 'First 15 min') + '</span><b>' + L('Дээд нот', 'Top') + '</b><p>' + esc(n.top) + '</p></li>' +
        '<li><span class="mono">' + L('2–4 цаг', '2–4 hours') + '</span><b>' + L('Зүрхний нот', 'Heart') + '</b><p>' + esc(n.heart) + '</p></li>' +
        '<li><span class="mono">' + L('Өдөржин', 'All day') + '</span><b>' + L('Суурь нот', 'Base') + '</b><p>' + esc(n.base) + '</p></li></ol></div>' : '') +
      (alt.length ? '<div class="sq-alt"><h2 class="mono">' + L('Бас тохирох', 'Also a match') + '</h2><div class="sq-alt-grid">' + alt.map(a => {
        const q = a.size, why = reasons(w, a)[0] || '';
        return '<a class="sq-alt-card" href="' + LV.url(q) + '"><img src="' + esc(q.img) + '" alt="" loading="lazy"><div><span class="mono">' + pct(a.s) + '% ' + L('тохирол', 'match') + '</span><p class="sq-brand">' + esc(q.brand) + '</p><p class="sq-alt-name">' + esc(LV.base(q)) + '</p><p class="sq-alt-why">' + why.replace(/<[^>]+>/g, '') + '</p><span class="sq-alt-price">' + money(q.price) + '</span></div></a>';
      }).join('') + '</div></div>' : '') +
      '</section>';
  }
  function draw() { if (!box() || !LV.products) return; if (st.step < 0) intro(); else if (st.step < Q.length) question(); else result(); }

  document.addEventListener('click', e => {
    if (!box() || !box().contains(e.target)) return;
    const b = e.target.closest('[data-sq],[data-opt],[data-size],[data-add]'); if (!b) return;
    const k = b.dataset.sq;
    if (k === 'start') { st.step = 0; st.ans = []; st.pick = null; draw(); }
    else if (k === 'back') { st.step = Math.max(-1, st.step - 1); draw(); }
    else if (k === 'again') { st.step = -1; st.ans = []; st.pick = null; draw(); scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (b.dataset.opt != null) {
      st.ans[st.step] = +b.dataset.opt;
      box().querySelectorAll('.sq-opt').forEach(x => x.setAttribute('aria-checked', x === b));
      setTimeout(() => { st.step++; draw(); if (box().getBoundingClientRect().top < 0 || st.step >= Q.length) scrollTo({ top: 0, behavior: 'smooth' }); }, 260);
    }
    else if (b.dataset.size) { st.pick = b.dataset.size; draw(); }
    else if (b.dataset.add) LV.bag.add(b.dataset.add);
  });
  document.addEventListener('keydown', e => {
    if (!box() || st.step < 0 || st.step >= Q.length || e.target.closest('input,textarea')) return;
    const i = '1234abcd'.indexOf(e.key.toLowerCase()); if (i < 0) return;
    const o = box().querySelectorAll('.sq-opt')[i % 4]; if (o) o.click();
  });
  document.addEventListener('lv:lang', draw);
  LV.ready.then(draw);
})();
