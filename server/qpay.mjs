// LEVERA — QPay v2 merchant API (https://developer.qpay.mn). Active only when QPAY_CLIENT_ID,
// QPAY_CLIENT_SECRET and QPAY_INVOICE_CODE are set in server/.env; otherwise the shop runs in demo mode.
// Untested against the live QPay service — verify with QPay's sandbox credentials before launch.
const BASE = () => (process.env.QPAY_BASE || 'https://merchant.qpay.mn').replace(/\/$/, '');
export const configured = () => !!(process.env.QPAY_CLIENT_ID && process.env.QPAY_CLIENT_SECRET && process.env.QPAY_INVOICE_CODE);

let token = null, tokenExp = 0;
async function auth() {
  if (token && Date.now() < tokenExp - 60000) return token;
  const basic = Buffer.from(`${process.env.QPAY_CLIENT_ID}:${process.env.QPAY_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(BASE() + '/v2/auth/token', { method: 'POST', headers: { Authorization: 'Basic ' + basic }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('QPay auth ' + r.status);
  const j = await r.json();
  token = j.access_token;
  // expires_in is a unix timestamp (seconds) in QPay v2; fall back to 50 minutes
  tokenExp = j.expires_in > 1e9 ? j.expires_in * 1000 : Date.now() + 50 * 60 * 1000;
  return token;
}
async function call(path, body) {
  const r = await fetch(BASE() + path, {
    method: 'POST', headers: { Authorization: 'Bearer ' + await auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000)
  });
  if (!r.ok) throw new Error(`QPay ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
export function createInvoice({ no, amount, description, callbackUrl }) {
  return call('/v2/invoice', {
    invoice_code: process.env.QPAY_INVOICE_CODE,
    sender_invoice_no: no,
    invoice_receiver_code: 'terminal',
    invoice_description: description,
    amount,
    callback_url: callbackUrl
  });
}
export async function isPaid(invoiceId, amount) {
  const j = await call('/v2/payment/check', { object_type: 'INVOICE', object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } });
  return Number(j.paid_amount || 0) >= amount || (j.rows || []).some(r => r.payment_status === 'PAID');
}
