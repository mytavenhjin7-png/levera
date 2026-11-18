/* LEVERA — settings
   LEVERA_API: address of the store server (server/index.mjs). Empty = same address as the website.
   If you host the website separately (e.g. Vercel), put the server address here, e.g. 'https://api.levera.mn'.
   On this computer, pages opened another way (VS Code Live Server on :5500, or the file itself) talk to the
   local server on :8787, so they always show the live database: products, photos, prices, reviews. */
window.LEVERA_API = (location.protocol === 'file:' || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== '8787'))
  ? 'http://localhost:8787' : '';
window.LEVERA_CHAT_ENDPOINT = window.LEVERA_API + '/api/chat';
