import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const databasePath = join(root, '..', 'data', 'levara.json')
const port = Number(process.env.PORT || 8787)

const seed = {
  customers: [],
  orders: [],
  products: [
    { id: 'cloud-pleat-lamp', name: 'Cloud Pleat Lamp', price: 38, currency: 'USD', stock: 24, source: 'Taobao', weightKg: 0.8, supplierUrl: 'https://item.taobao.com/' },
    { id: 'orbit-glasses', name: 'Orbit Glasses', price: 24, currency: 'USD', stock: 40, source: 'Pinduoduo', weightKg: 0.2, supplierUrl: 'https://mobile.yangkeduo.com/' },
    { id: 'fold-utility-tote', name: 'Fold Utility Tote', price: 42, currency: 'USD', stock: 18, source: '1688', weightKg: 0.5, supplierUrl: 'https://s.1688.com/' },
    { id: 'soft-form-chair', name: 'Soft Form Chair', price: 149, currency: 'USD', stock: 8, source: 'Taobao', weightKg: 7, supplierUrl: 'https://item.taobao.com/' },
  ],
}

async function loadDatabase() {
  try { return JSON.parse(await readFile(databasePath, 'utf8')) } catch { await mkdir(dirname(databasePath), { recursive: true }); await writeFile(databasePath, JSON.stringify(seed, null, 2)); return structuredClone(seed) }
}

async function saveDatabase(database) { await writeFile(databasePath, JSON.stringify(database, null, 2)) }
function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); response.end(JSON.stringify(body)) }
async function body(request) { let raw = ''; for await (const chunk of request) raw += chunk; return raw ? JSON.parse(raw) : {} }
const fulfillment = { cargoBase: 4, cargoPerKg: 3.5, internationalShippingBase: 8, internationalShippingPerKg: 7, workFeeRate: 0.12, workFeeMinimum: 3 }
function calculateQuote(items, database) {
  const lines = items.map((item) => { const product = database.products.find((entry) => entry.id === item.productId); if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || product.stock < item.quantity) throw new Error(`Product unavailable: ${item.productId}`); return { product, quantity: item.quantity } })
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const weightKg = lines.reduce((sum, line) => sum + Number(line.product.weightKg || 0.5) * line.quantity, 0)
  const cargo = fulfillment.cargoBase + weightKg * fulfillment.cargoPerKg
  const shipping = fulfillment.internationalShippingBase + weightKg * fulfillment.internationalShippingPerKg
  const workFee = Math.max(fulfillment.workFeeMinimum, subtotal * fulfillment.workFeeRate)
  return { subtotal, weightKg, cargo, shipping, workFee, total: subtotal + cargo + shipping + workFee, currency: 'USD', breakdown: { cargo: 'China warehouse handling and consolidation', shipping: 'China to Mongolia delivery estimate', workFee: 'LEVERA sourcing and order service' } }
}

const paymentProviders = {
  qpay: { label: 'QPay', create: (order) => ({ status: 'pending', provider: 'qpay', invoiceId: `QP-${order.id.slice(0, 8).toUpperCase()}`, message: 'Sandbox QPay invoice created. Configure QPAY_CLIENT_ID and QPAY_SECRET for live QR payment.' }) },
  khanbank: { label: 'Khan Bank', create: (order) => ({ status: 'pending', provider: 'khanbank', invoiceId: `KB-${order.id.slice(0, 8).toUpperCase()}`, message: 'Sandbox Khan Bank checkout created. Configure KHAN_CLIENT_ID and KHAN_SECRET for live payment.' }) },
  card: { label: 'Card', create: (order) => ({ status: 'pending', provider: 'card', invoiceId: `CARD-${order.id.slice(0, 8).toUpperCase()}`, message: 'Sandbox card checkout created. Connect a PCI-compliant processor before accepting live cards.' }) },
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {})
  const url = new URL(request.url, `http://${request.headers.host}`)
  const database = await loadDatabase()
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, service: 'levara-commerce-api' })
    if (request.method === 'GET' && url.pathname === '/api/products') return json(response, 200, { products: database.products })
    if (request.method === 'POST' && url.pathname === '/api/quote') return json(response, 200, { quote: calculateQuote((await body(request)).items, database), rules: fulfillment })
    if (request.method === 'GET' && url.pathname === '/api/providers') return json(response, 200, { providers: Object.entries(paymentProviders).map(([id, provider]) => ({ id, label: provider.label })) })
    if (request.method === 'POST' && url.pathname === '/api/checkout') {
      const input = await body(request)
      if (!input.customer?.email || !input.customer?.name || !input.customer?.phone) return json(response, 400, { error: 'Name, email, and phone are required.' })
      if (!Array.isArray(input.items) || input.items.length === 0) return json(response, 400, { error: 'Your bag is empty.' })
      if (!paymentProviders[input.paymentProvider]) return json(response, 400, { error: 'Select a supported payment method.' })
      const quote = calculateQuote(input.items, database)
      const lineItems = input.items.map((item) => { const product = database.products.find((entry) => entry.id === item.productId); return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price, supplier: product.source, supplierUrl: product.supplierUrl || null } })
      const customer = database.customers.find((entry) => entry.email === input.customer.email) || { id: randomUUID(), createdAt: new Date().toISOString(), ...input.customer }
      Object.assign(customer, input.customer, { updatedAt: new Date().toISOString() })
      if (!database.customers.some((entry) => entry.id === customer.id)) database.customers.push(customer)
      const order = { id: randomUUID(), customerId: customer.id, items: lineItems, quote, total: quote.total, currency: 'USD', paymentProvider: input.paymentProvider, status: 'awaiting_payment', createdAt: new Date().toISOString() }
      database.orders.push(order)
      lineItems.forEach((item) => { const product = database.products.find((entry) => entry.id === item.productId); product.stock -= item.quantity })
      const payment = paymentProviders[input.paymentProvider].create(order)
      order.payment = payment
      await saveDatabase(database)
      return json(response, 201, { order, payment })
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/orders/')) { const order = database.orders.find((entry) => entry.id === url.pathname.split('/').pop()); return order ? json(response, 200, { order }) : json(response, 404, { error: 'Order not found.' }) }
    return json(response, 404, { error: 'Route not found.' })
  } catch (error) { return json(response, 400, { error: error.message || 'Request failed.' }) }
})

server.listen(port, () => console.log(`LEVERA commerce API listening on http://localhost:${port}`))