/* LEVERA — review helpers shared by the product page (rating line) and the Reviews page */
(function () {
  const LV = window.LV, { T, fill } = LV;
  LV.STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L10 15l-5.3 2.9 1.1-5.9L1.4 7.9l6-.8z"/></svg>';
  LV.stars = (v, big) => {
    const w = Math.max(0, Math.min(100, v / 5 * 100));
    return '<span class="stars' + (big ? ' big' : '') + '" role="img" aria-label="' + fill(T().rv_stars, { n: Math.round(v * 10) / 10 }) + '"><span class="s-off">' + LV.STAR.repeat(5) + '</span><span class="s-on" style="width:' + w + '%">' + LV.STAR.repeat(5) + '</span></span>';
  };
  LV.rvCount = n => (n === 1 ? T().rv_one : fill(T().rv_count, { n: n.toLocaleString('en-US') }));
  LV.rvDate = s => { try { return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleDateString(LV.lang === 'mn' ? 'mn-MN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return s; } };
})();
