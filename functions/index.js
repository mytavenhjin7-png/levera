// LEVERA on Firebase: the whole store server (server/index.mjs, copied here by tools/build-functions.mjs) as one
// Cloud Function. Firebase Hosting sends /api/**, /sitemap.xml and /uploads/live/** here; everything else
// (pages, styles, scripts, product photos) Hosting serves itself from its CDN.
import { onRequest } from 'firebase-functions/v2/https';

process.env.LEVERA_FUNCTION = '1';
let handle;   // the server loads (and connects to the database) on the first request, not while deploying

export const app = onRequest({
  region: 'asia-northeast1',     // Tokyo: close to Mongolia and to the TiDB database
  memory: '512MiB',
  timeoutSeconds: 120,
  concurrency: 40,
  maxInstances: 2,               // a cap on cost: at most two servers at once
  invoker: 'public'
}, async (req, res) => {
  if (!handle) handle = (await import('./server/index.mjs')).handle;
  return handle(req, res);
});
