/* motion: cursor trail, scroll-linked "Everything you need", staggered cards, magnetic buttons, marquee skew */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- cursor trail: a tapering line that follows from the cursor tip ---- */
  if (finePointer && !reduce) {
    const c = document.createElement('canvas'); c.className = 'trail'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
    const g = c.getContext('2d'); let W = 0, H = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const N = 34, pts = Array.from({ length: N }, () => ({ x: -200, y: -200 }));
    const m = { x: -200, y: -200, on: false };
    // the loop only runs while the trail is moving; it stops (and the canvas is left clear) once it settles
    let running = false;
    const start = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      m.x = e.clientX; m.y = e.clientY;
      if (!m.on) { pts.forEach(p => { p.x = m.x; p.y = m.y; }); m.on = true; }
      start();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { m.on = false; start(); });
    function loop() {
      g.clearRect(0, 0, W, H);
      if (!m.on) { running = false; return; }
      pts[0].x = m.x; pts[0].y = m.y;
      for (let i = 1; i < N; i++) { const k = .38 - i * .004; pts[i].x += (pts[i - 1].x - pts[i].x) * k; pts[i].y += (pts[i - 1].y - pts[i].y) * k; }
      const span = Math.hypot(pts[N - 1].x - pts[0].x, pts[N - 1].y - pts[0].y);
      if (span < .6) { running = false; return; }
      requestAnimationFrame(loop);
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let i = 1; i < N - 1; i++) {
        const a = pts[i - 1], b = pts[i], n = pts[i + 1], t = 1 - i / (N - 1);
        g.beginPath();
        g.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
        g.quadraticCurveTo(b.x, b.y, (b.x + n.x) / 2, (b.y + n.y) / 2);
        g.lineWidth = .4 + 2.4 * t * t;
        g.strokeStyle = 'rgba(255,255,255,' + Math.min(1, t * 1.15).toFixed(3) + ')';
        g.stroke();
      }
    }
  }

  /* ---- Everything you need: rows drift in opposite directions with scroll ---- */
  const band = document.getElementById('enough');
  if (band) {
    const rows = band.querySelectorAll('.en-row');
    let raf = 0;
    const upd = () => {
      raf = 0; const r = band.getBoundingClientRect();
      const p = (innerHeight - r.top) / (innerHeight + r.height);   // 0 → 1 while the band crosses the screen
      if (p < -.1 || p > 1.1) return;
      rows[0].style.transform = 'translate3d(' + (-p * 32) + '%,0,0)';
      if (rows[1]) rows[1].style.transform = 'translate3d(' + (-40 + p * 32) + '%,0,0)';
    };
    if (!reduce) { addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true }); addEventListener('resize', upd); }
    upd();
  }

  /* ---- product cards: staggered entrance, also for cards re-rendered by filters / language ---- */
  const grid = document.getElementById('grid');
  if (grid && 'IntersectionObserver' in window && !reduce) {
    document.documentElement.classList.add('io');
    const io = new IntersectionObserver(es => {
      let n = 0;
      es.forEach(en => { if (en.isIntersecting) { en.target.style.setProperty('--d', n++); en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    const watch = () => grid.querySelectorAll('.card:not(.in)').forEach(c => io.observe(c));
    watch(); new MutationObserver(watch).observe(grid, { childList: true });
  }

  /* ---- magnetic buttons ---- */
  if (finePointer && !reduce) {
    document.addEventListener('pointermove', e => {
      const b = e.target.closest('.btn, .f-cta');
      document.querySelectorAll('.mag').forEach(x => { if (x !== b) { x.style.transform = ''; x.classList.remove('mag'); } });
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.classList.add('mag');
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px)';
    }, { passive: true });
  }

  /* ---- marquee leans with scroll speed ---- */
  const mq = document.querySelector('.marquee-track');
  if (mq && !reduce) {
    // runs only while scrolling and until the lean has eased back to zero
    let lastY = scrollY, skew = 0, on = false;
    const tick = () => {
      const v = scrollY - lastY; lastY = scrollY;
      skew += (Math.max(-12, Math.min(12, v * .35)) - skew) * .12;
      if (Math.abs(skew) > .02 || v) { mq.parentElement.style.transform = 'skewX(' + (-skew).toFixed(2) + 'deg)'; requestAnimationFrame(tick); }
      else { mq.parentElement.style.transform = ''; skew = 0; on = false; }
    };
    addEventListener('scroll', () => { if (!on) { on = true; requestAnimationFrame(tick); } }, { passive: true });
  }
})();
