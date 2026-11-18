// LEVERA — where photos added in admin are kept. On this computer: the uploads/ folder. On Firebase (LEVERA_FUNCTION=1):
// the project's Storage bucket, because a Cloud Function has no lasting disk. Paths are the same in both places
// (uploads/live/products/…), and the server streams them back at that path.
import { writeFileSync, mkdirSync, existsSync, unlinkSync, rmSync, createReadStream } from 'node:fs';
import { join, dirname } from 'node:path';

let bucket = null;
if (process.env.LEVERA_FUNCTION) {
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { getStorage } = await import('firebase-admin/storage');
  if (!getApps().length) initializeApp();
  bucket = getStorage().bucket(process.env.LEVERA_BUCKET || undefined);
}
export const remote = () => !!bucket;

export async function save(root, rel, buf, type) {
  if (bucket) return bucket.file(rel).save(buf, { resumable: false, contentType: type, metadata: { cacheControl: 'public, max-age=604800' } });
  const f = join(root, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, buf);
}
export async function remove(root, rel) {
  if (bucket) return bucket.file(rel).delete({ ignoreNotFound: true }).catch(() => {});
  try { const f = join(root, rel); if (existsSync(f)) unlinkSync(f); } catch {}
}
export async function removeDir(root, rel) {
  if (bucket) return bucket.deleteFiles({ prefix: rel.replace(/\/?$/, '/') }).catch(() => {});
  try { const d = join(root, rel); if (existsSync(d)) rmSync(d, { recursive: true, force: true }); } catch {}
}
// a readable stream of the stored file, or null when it isn't there
export async function open(root, rel) {
  if (bucket) { const f = bucket.file(rel); const [ok] = await f.exists(); return ok ? f.createReadStream() : null; }
  const f = join(root, rel); return existsSync(f) ? createReadStream(f) : null;
}
