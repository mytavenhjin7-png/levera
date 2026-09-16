import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import backgroundImage from './assets/background.avif'
import './App.css'

type Product = { id: string; name: string; category: string; price: string; source: string; image: string; accent: string }
type Quote = { subtotal: number; weightKg: number; cargo: number; shipping: number; workFee: number; total: number; currency: string }

const products: Product[] = [
  { id: 'cloud-pleat-lamp', name: 'Cloud Pleat Lamp', category: 'Objects / 04', price: '$38', source: 'Taobao', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', accent: 'cream' },
  { id: 'orbit-glasses', name: 'Orbit Glasses', category: 'Accessories / 11', price: '$24', source: 'Pinduoduo', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85', accent: 'blue' },
  { id: 'fold-utility-tote', name: 'Fold Utility Tote', category: 'Carry / 08', price: '$42', source: '1688', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85', accent: 'orange' },
  { id: 'soft-form-chair', name: 'Soft Form Chair', category: 'Living / 02', price: '$149', source: 'Taobao', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85', accent: 'green' },
]

function App() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeCategory, setActiveCategory] = useState('All finds')
  const [searchOpen, setSearchOpen] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [cartItems, setCartItems] = useState<Record<string, number>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [paymentProvider, setPaymentProvider] = useState('qpay')
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', city: 'Ulaanbaatar' })
  const cartCount = Object.values(cartItems).reduce((sum, quantity) => sum + quantity, 0)
  const cartTotal = products.reduce((sum, product) => sum + Number(product.price.slice(1)) * (cartItems[product.id] || 0), 0)
  const visibleProducts = useMemo(() => activeCategory === 'All finds' ? products : products.filter((product) => product.category.toLowerCase().includes(activeCategory.split(' ')[0].toLowerCase())), [activeCategory])
  const toggleSaved = (name: string) => setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])
  const addToBag = (productId: string) => setCartItems((current) => ({ ...current, [productId]: (current[productId] || 0) + 1 }))
  const submitCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCheckoutStatus('Creating your order...')
    try {
      const response = await fetch('http://localhost:8787/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, paymentProvider, items: Object.entries(cartItems).map(([productId, quantity]) => ({ productId, quantity })) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setCheckoutStatus(`${result.payment.message} Invoice ${result.payment.invoiceId}`)
      setCartItems({})
    } catch (error) { setCheckoutStatus(error instanceof Error ? error.message : 'Checkout failed. Please try again.') }
  }

  useEffect(() => {
    if (!cartCount) { setQuote(null); return }
    fetch('http://localhost:8787/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.entries(cartItems).map(([productId, quantity]) => ({ productId, quantity })) }) })
      .then((response) => response.json())
      .then((result) => setQuote(result.quote))
      .catch(() => setQuote(null))
  }, [cartItems, cartCount])

  useEffect(() => {
    let frame = 0
    const updateProgress = () => {
      const scene = document.querySelector<HTMLElement>('.cinematic-hero')
      if (!scene) return
      const distance = scene.offsetHeight - window.innerHeight
      const progress = distance > 0 ? Math.min(1, Math.max(0, -scene.getBoundingClientRect().top / distance)) : 0
      setScrollProgress(progress)
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateProgress)
    }
    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  const sceneStyle = { '--scroll-progress': scrollProgress } as CSSProperties

  return (
    <main className="site-shell">
      <div className="cinematic-hero" id="top" style={sceneStyle}>
        <div className="cinematic-stage">
          <div className="scene-image scene-base" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
          <div className="scene-image scene-sky" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
          <div className="scene-image scene-rider" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
          <div className="scene-image scene-ground" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
          <div className="scene-vignette"></div>
          <div className="scene-grain"></div>

          <nav className="cinematic-nav">
            <div className="cinematic-links">
              <a href="#shop">SHOP</a>
              <a href="#about">ABOUT</a>
              <a href="#contact">CONTACT</a>
            </div>
            <div className="cinematic-brand" aria-label="LEVERA">LEVERA</div>
            <div className="cinematic-actions">
              <button type="button" onClick={() => setSearchOpen(!searchOpen)}>{searchOpen ? 'Close' : 'Search'}</button>
              <button type="button" onClick={() => setCheckoutOpen(true)}>Bag <sup>{cartCount}</sup></button>
              <button className="cinematic-menu" aria-label="Open menu"><i></i><i></i></button>
            </div>
          </nav>

          <div className="scene-copy scene-copy-left">
            <p className="scene-kicker"># Self-confidence</p>
            <h1>is the best outfit.</h1>
            <p className="scene-subtitle">Rock it and own it.</p>
          </div>

          <div className="floating-tee" aria-hidden="true">
            <div className="tee-shirt">
              <span className="tee-word">LEVERA</span>
              <span className="tee-meta">ULAANBAATAR<br />2024</span>
            </div>
          </div>

          <div className="scene-side scene-side-right">
            <span>ULAANBAATAR</span>
            <span>2024</span>
          </div>

          <div className="scene-bottomline">
            <span>MORE THAN CLOTHING.<br />IT’S A MINDSET.</span>
            <span>ULAANBAATAR<br />2024</span>
          </div>
        </div>
      </div>
      <div className="below-hero-nav"><div className="announcement"><span>New season, low friction.</span><span>Curated from the world's best marketplaces <b>↗</b></span></div><nav className="nav-bar"><button className="menu-button" aria-label="Open menu"><span></span><span></span></button><a className="wordmark" href="#top">LEVERA<span>®</span></a><div className="nav-actions"><button type="button" onClick={() => setSearchOpen(!searchOpen)}>{searchOpen ? 'Close' : 'Search'} <span>⌕</span></button><button type="button" onClick={() => setCheckoutOpen(true)}>Bag <sup>{cartCount}</sup></button></div></nav></div>
      {searchOpen && <div className="search-drawer"><label htmlFor="search">Search the edit</label><input id="search" autoFocus placeholder="Try 'silver', 'home', or 'gift'" /></div>}
      <section className="manifesto"><span>01—04</span><p>A thoughtful edit of useful, beautiful, slightly unexpected things. Shipped from Asia, picked for everywhere.</p><span>↓ Scroll to browse</span></section>
      <section className="signal-band"><div className="signal-intro"><p className="eyebrow">The LEVERA system</p><h2>From far away<br /><em>to your door.</em></h2></div><div className="signal-stats"><div><strong>48h</strong><span>quote response</span></div><div><strong>03</strong><span>source markets</span></div><div><strong>01</strong><span>beautiful handoff</span></div></div><div className="signal-marquee"><span>TAOBAO</span><b>✳</b><span>PINDUODUO</span><b>✳</b><span>1688</span><b>✳</b><span>LEVERA</span><b>✳</b></div></section>
      <section className="edit-section" id="edit"><div className="section-heading"><div><p className="eyebrow">The first drop / live now</p><h2>Just in.</h2></div><p className="section-note">Small quantities.<br />Big personality.</p></div><div className="filters">{['All finds', 'Objects', 'Carry', 'Living'].map((category) => <button className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)} key={category}>{category}</button>)}<span className="filter-count">{visibleProducts.length.toString().padStart(2, '0')} pieces</span></div><div className="product-grid">{visibleProducts.map((product, index) => <article className={`product-card ${product.accent}`} key={product.name}><div className="product-image"><img src={product.image} alt={product.name} loading={index > 1 ? 'lazy' : 'eager'} /><button className={`save-button ${saved.includes(product.name) ? 'saved' : ''}`} onClick={() => toggleSaved(product.name)} aria-label={`Save ${product.name}`}>{saved.includes(product.name) ? '♥' : '♡'}</button><button className="add-button" onClick={() => addToBag(product.id)}>Add to bag</button><span className="source-tag">via {product.source}</span></div><div className="product-meta"><div><p className="product-category">{product.category}</p><h3>{product.name}</h3></div><strong>{product.price}</strong></div></article>)}</div></section>
      {checkoutOpen && <div className="checkout-backdrop" onClick={() => setCheckoutOpen(false)}><aside className="checkout-panel" onClick={(event) => event.stopPropagation()}><button className="checkout-close" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout">×</button><p className="eyebrow">LEVERA checkout</p><h2>Your bag <span>{cartCount} items</span></h2>{cartCount === 0 ? <p className="empty-bag">Your bag is waiting for something with a point of view.</p> : <form onSubmit={submitCheckout}><div className="checkout-breakdown"><div><span>Products</span><strong>${(quote?.subtotal ?? cartTotal).toFixed(2)}</strong></div><div><span>Cargo / consolidation</span><strong>${(quote?.cargo ?? 0).toFixed(2)}</strong></div><div><span>Shipping to Mongolia</span><strong>${(quote?.shipping ?? 0).toFixed(2)}</strong></div><div><span>LEVERA work fee</span><strong>${(quote?.workFee ?? 0).toFixed(2)}</strong></div><div className="checkout-total"><span>Total</span><strong>${(quote?.total ?? cartTotal).toFixed(2)}</strong></div></div><p className="quote-note">{quote ? `Estimated weight ${quote.weightKg.toFixed(1)} kg. Final shipping may adjust after warehouse measurement.` : 'Calculating your landed cost...'}</p><div className="checkout-fields"><input required placeholder="Full name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /><input required type="email" placeholder="Email address" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /><input required placeholder="Phone number" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /><input required placeholder="Delivery address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} /><input placeholder="City" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} /></div><p className="payment-label">Choose payment</p><div className="payment-options">{[['qpay', 'QPay', 'Scan and pay'], ['khanbank', 'Khan Bank', 'Secure bank transfer'], ['card', 'Card', 'Visa or Mastercard']].map(([id, label, description]) => <button type="button" className={paymentProvider === id ? 'selected' : ''} onClick={() => setPaymentProvider(id)} key={id}><strong>{label}</strong><span>{description}</span></button>)}</div>{checkoutStatus && <p className="checkout-status">{checkoutStatus}</p>}<button className="pay-button" type="submit">Continue to payment <span>↗</span></button></form>}</aside></div>}
      <section className="statement"><p>Not everything<br /><em>needs to be</em><br />new.</p><div className="statement-side"><span>LEVERA / 2026</span><span>Things with a point of view.</span></div></section><footer><a className="wordmark" href="#top">LEVERA<span>®</span></a><div><a href="#edit">Shop all</a><a href="#top">About</a><a href="#top">Journal</a></div><span>Made for the next scroll.</span></footer>
    </main>
  )
}

export default App
