# LEVERA

LEVERA is an editorial commerce storefront with a scroll-driven campaign hero, product discovery, customer checkout, and a small commerce API.

## Run locally

```powershell
npm install
npm run dev:full
```

Frontend: `http://localhost:5173`

Commerce API: `http://localhost:8787`

The API uses `data/levara.json` as a development database. It stores customers, orders, stock, and payment attempts. Replace it with PostgreSQL, MySQL, or a managed database before production deployment.

## API routes

- `GET /api/health` - service health
- `GET /api/products` - catalog and stock
- `GET /api/providers` - enabled payment providers
- `POST /api/checkout` - creates a customer, order, and payment attempt
- `GET /api/orders/:id` - retrieves an order

## Payments

QPay, Khan Bank, and card checkout are represented as sandbox adapters. Copy `.env.example` to `.env` and add merchant credentials when the accounts are available. The adapters must then be replaced with the providers' current authenticated API flows, signed callbacks, idempotency keys, and webhook verification before accepting live money.

Never put provider secrets in React code or expose them through Vite environment variables intended for the browser.

## Supplier integrations

Official developer entry points:

- Taobao Open Platform: https://open.taobao.com
- Pinduoduo Open Platform: https://open.pinduoduo.com

Both platforms require an account, developer verification, an approved application, and permission for the specific catalog/order capabilities you use. LEVERA should connect from the server only, with provider secrets stored in `.env`; never scrape or call supplier APIs directly from the browser.

The intended order flow is:

1. Customer selects a LEVERA product or submits an approved supplier product URL.
2. LEVERA resolves the supplier SKU, price, variants, weight, and stock server-side.
3. `/api/quote` calculates product cost, cargo/consolidation, China-to-Mongolia shipping, and the LEVERA work fee.
4. Customer approves the quote and pays LEVERA.
5. A worker creates the supplier order through the approved Taobao/Pinduoduo API and records the supplier order ID.
6. Supplier and international tracking updates are synced to the LEVERA order.

The current project implements steps 1-4 in sandbox mode. Live supplier ordering still requires approved credentials and the exact API permission scope from each platform.
