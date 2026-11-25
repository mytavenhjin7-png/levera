/* LEVERA — cookie notice. The site only uses what it needs to work (sign-in cookie, bag, saved items,
   language), so this is a notice with a link to the policy, shown once. If analytics are ever added,
   load them only after window.LV_CONSENT === true (set below when the visitor accepts). */
(function () {
  let seen = null;
  try { seen = localStorage.getItem('lv-consent'); } catch (e) {}
  window.LV_CONSENT = seen === 'yes';
  if (seen) return;
  let lang = 'mn'; try { lang = localStorage.getItem('lv-lang') || document.documentElement.lang || 'mn'; } catch (e) {}
  const T = lang === 'en'
    ? { p: 'We use only the cookies and browser storage the shop needs to work: your bag, saved items, language and sign-in. No advertising trackers.', more: 'Cookies', ok: 'OK' }
    : { p: 'Бид сайт ажиллахад зайлшгүй шаардлагатай күүки, хөтчийн санах ойг л ашигладаг: сагс, хадгалсан бараа, хэл, нэвтрэлт. Сурталчилгааны хянах код байхгүй.', more: 'Cookies', ok: 'Ойлголоо' };
  const show = () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Cookies');
    el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#16171A;color:#ECE8E1;border-radius:14px;padding:16px 18px;display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;box-shadow:0 12px 40px rgba(0,0,0,.25);font:14px/1.5 Manrope,system-ui,sans-serif';
    el.innerHTML = '<p style="margin:0;flex:1 1 280px">' + T.p + ' <a href="cookies.html" style="color:#E7D9B5">' + T.more + '</a></p>' +
      '<button type="button" style="border:0;border-radius:999px;background:#E7D9B5;color:#16171A;padding:10px 22px;font:700 12px/1 Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer">' + T.ok + '</button>';
    el.querySelector('button').addEventListener('click', () => { try { localStorage.setItem('lv-consent', 'yes'); } catch (e) {} window.LV_CONSENT = true; el.remove(); });
    document.body.appendChild(el);
  };
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
