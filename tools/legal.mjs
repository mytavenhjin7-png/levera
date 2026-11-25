// LEVERA — legal pages: privacy.html, terms.html, cookies.html (Mongolian first, English below).
// Written from what the site really stores (orders, accounts, newsletter, reviews, AI chat, one login cookie,
// browser storage). Edit the texts here and run `node tools/legal.mjs`; then `node tools/seo.mjs` adds the share tags.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UPDATED = '2026 оны 11-р сарын 25', UPDATED_EN = '25 November 2026';
const CONTACT = 'Утас: <a href="tel:+97699935918">9993 5918</a>, <a href="tel:+9769022060">9022 060</a> · Имэйл: <a href="mailto:leverastore6@gmail.com">leverastore6@gmail.com</a>';
const CONTACT_EN = 'Phone: <a href="tel:+97699935918">9993 5918</a>, <a href="tel:+9769022060">9022 060</a> · Email: <a href="mailto:leverastore6@gmail.com">leverastore6@gmail.com</a>';

const PAGES = {
  'privacy.html': {
    title: 'Нууцлалын бодлого', en: 'Privacy policy',
    mn: `
<p>LEVERA онлайн дэлгүүр («бид») таны хувийн мэдээллийг Монгол Улсын <b>Хүний хувийн мэдээлэл хамгаалах тухай хууль</b> болон <b>Хэрэглэгчийн эрхийг хамгаалах тухай хууль</b>-д нийцүүлэн цуглуулж, ашиглаж, хамгаална. Энэ бодлого нь levera-mn.web.app болон LEVERA-гийн бусад цахим хуудсанд хамаарна.</p>
<h2>1. Бид ямар мэдээлэл цуглуулдаг вэ</h2>
<ul>
<li><b>Захиалга:</b> нэр, утасны дугаар, дүүрэг, хүргэлтийн хаяг, нэмэлт тэмдэглэл, захиалсан бараа, хэмжээ, дүн, төлбөрийн төлөв.</li>
<li><b>Бүртгэл (хүсвэл):</b> утасны дугаар, нэр, нууц үг (бид нууц үгийг шифрлэсэн хэлбэрээр хадгална, жинхэнэ нууц үгийг харах боломжгүй), хаяг, хадгалсан бараа.</li>
<li><b>Мэдээллийн хуудас:</b> имэйл хаяг, сонирхсон ангилал.</li>
<li><b>Сэтгэгдэл:</b> таны оруулсан нэр, үнэлгээ, сэтгэгдэл, захиалгын дугаар (баталгаажуулахад).</li>
<li><b>AI туслах:</b> чатад бичсэн асуулт, хариулт.</li>
<li><b>Техникийн:</b> нэвтрэлтийг хадгалах нэг күүки болон таны хөтөч дээр хадгалагдах сагс, хэл зэрэг тохиргоо (<a href="cookies.html">Күүкийн бодлого</a>-ыг үзнэ үү).</li>
</ul>
<p>Бид банкны карт, нэвтрэх нууц код зэрэг төлбөрийн мэдээллийг <b>огт</b> авдаггүй — төлбөрийг QPay болон таны банкны апп шууд гүйцэтгэнэ.</p>
<h2>2. Мэдээллийг юунд ашигладаг вэ</h2>
<ul>
<li>Захиалгыг хүлээн авах, бараа худалдан авах, хүргэх, захиалгын явцын талаар тантай холбогдох;</li>
<li>Төлбөр шалгах, бэлгийн карт, урамшууллыг хэрэгжүүлэх;</li>
<li>Таны асуултад хариулах, гомдол шийдвэрлэх;</li>
<li>Зөвшөөрсөн тохиолдолд шинэ бараа, урамшууллын мэдээ илгээх (хүссэн үедээ цуцална);</li>
<li>Луйвар, зүй бус хэрэглээнээс сэргийлэх, хуулийн шаардлагыг биелүүлэх.</li>
</ul>
<p>Бид таны мэдээллийг <b>зардаггүй</b>, сурталчилгааны зорилгоор гуравдагч этгээдэд <b>өгдөггүй</b>.</p>
<h2>3. Хэнтэй хуваалцдаг вэ</h2>
<p>Зөвхөн үйлчилгээ үзүүлэхэд шаардлагатай хэмжээгээр:</p>
<ul>
<li><b>Карго, хүргэлтийн компани</b> — нэр, утас, хаяг (барааг хүргэхэд);</li>
<li><b>QPay</b> — нэхэмжлэхийн дүн, захиалгын дугаар;</li>
<li><b>Google (Firebase, Gemini)</b> — сайтын байршуулалт, өгөгдлийн сан, AI туслахын асуултыг боловсруулах;</li>
<li><b>Төрийн байгууллага</b> — хуульд заасан тохиолдолд.</li>
</ul>
<p>Эдгээр үйлчилгээний зарим нь Монгол Улсаас гадна (жишээ нь Google-ийн сервер) байрладаг тул таны мэдээлэл тэнд боловсруулагдаж болно.</p>
<h2>4. Хадгалах хугацаа</h2>
<ul>
<li>Захиалгын мэдээлэл — нягтлан бодох бүртгэл, татварын хуульд заасан хугацаанд (ихэвчлэн 5 жил);</li>
<li>Бүртгэл — та устгуулах хүртэл;</li>
<li>Мэдээллийн хуудасны имэйл — та цуцлах хүртэл;</li>
<li>AI чатын түүх — бид тусад нь хадгалдаггүй, зөвхөн тухайн хариултыг гаргахад ашиглана.</li>
</ul>
<h2>5. Таны эрх</h2>
<p>Та өөрийн тухай мэдээлэлтэй танилцах, засварлуулах, устгуулах, мэдээллийн хуудаснаас татгалзах, зөвшөөрлөө цуцлах эрхтэй. Хүсэлтээ доорх утас эсвэл имэйлээр илгээнэ үү — бид 10 ажлын өдөрт багтаан хариулна.</p>
<h2>6. Аюулгүй байдал</h2>
<p>Сайт HTTPS шифрлэлтээр ажиллана, нууц үг шифрлэгдсэн, админ хэсэг зөвхөн эрх бүхий ажилтанд нээлттэй. Ямар ч систем 100% аюулгүй биш тул мэдээлэл алдагдсан тохиолдолд бид танд болон холбогдох байгууллагад хуульд заасан хугацаанд мэдэгдэнэ.</p>
<h2>7. Хүүхэд</h2>
<p>18 нас хүрээгүй хүн захиалга өгөх бол эцэг эх, асран хамгаалагчийн зөвшөөрөлтэй байх ёстой. Бид хүүхдийн мэдээллийг зориуд цуглуулдаггүй.</p>
<h2>8. Өөрчлөлт</h2>
<p>Энэ бодлогыг шинэчилбэл энэ хуудсанд огноог өөрчилж нийтэлнэ. Томоохон өөрчлөлтийн талаар сайт дээр мэдэгдэнэ.</p>
<h2>9. Холбоо барих</h2>
<p>${CONTACT}</p>`,
    enBody: `
<p>LEVERA ("we") collects, uses and protects your personal data in line with Mongolia's <b>Law on Personal Data Protection</b> and <b>Consumer Protection Law</b>.</p>
<h2>What we collect</h2>
<ul><li><b>Orders:</b> name, phone, district, delivery address, note, items, sizes, totals, payment status.</li>
<li><b>Account (optional):</b> phone, name, password (stored only as a secure hash), address, saved items.</li>
<li><b>Newsletter:</b> email and chosen interests.</li><li><b>Reviews:</b> name, rating, text, order number for verification.</li>
<li><b>AI assistant:</b> the questions you type and the replies.</li><li><b>Technical:</b> one sign-in cookie and settings kept in your browser (see the <a href="cookies.html">Cookie policy</a>).</li></ul>
<p>We never receive card numbers or bank passwords: payment happens in QPay and your bank app.</p>
<h2>How we use it</h2><p>To take, buy, deliver and update you on orders; check payments and gift cards; answer questions; send news only if you subscribed; prevent fraud and meet legal duties. We do not sell your data or share it for advertising.</p>
<h2>Who we share it with</h2><p>Only as needed: cargo and delivery partners (name, phone, address), QPay (amount, order number), Google Firebase and Gemini (hosting, database, answering AI chat questions), and authorities where the law requires. Some of these process data outside Mongolia.</p>
<h2>How long we keep it</h2><p>Orders for the period required by accounting and tax law (usually 5 years); accounts until you delete them; newsletter emails until you unsubscribe; AI chat is not stored separately.</p>
<h2>Your rights</h2><p>You can see, correct or delete your data, unsubscribe and withdraw consent. Contact us and we will reply within 10 working days.</p>
<h2>Security</h2><p>HTTPS everywhere, hashed passwords, staff-only admin. If a breach happens we will notify you and the authorities as the law requires.</p>
<h2>Children</h2><p>Buyers under 18 need a parent's or guardian's consent.</p>
<h2>Contact</h2><p>${CONTACT_EN}</p>`
  },
  'terms.html': {
    title: 'Үйлчилгээний нөхцөл', en: 'Terms of service',
    mn: `
<p>LEVERA онлайн дэлгүүрээр худалдан авалт хийснээр та доорх нөхцөлийг хүлээн зөвшөөрнө. Эдгээр нөхцөл нь Монгол Улсын хууль тогтоомжид захирагдана.</p>
<h2>1. Үйлчилгээ</h2>
<p>LEVERA нь дэлхийн брэндүүдийн барааг таны захиалгаар гадаадаас (Хятад, АНУ, Европ г.м.) худалдан авч, Улаанбаатарт хүргэдэг олон брэндийн онлайн дэлгүүр юм. Бараа бүрийг тусгайлан захиалгаар авчирдаг.</p>
<h2>2. Үнэ</h2>
<ul>
<li>Сайт дээрх үнэ төгрөгөөр, барааны үнэ, карго, Улаанбаатар доторх хүргэлт, үйлчилгээний хөлсийг <b>бүгдийг багтаасан</b> эцсийн үнэ байна. Сүрчигний үнэд гаалийн татвар, НӨАТ орсон.</li>
<li>Гадаад ханш, нийлүүлэгчийн үнэ өдөр бүр өөрчлөгддөг тул захиалгыг баталгаажуулахаас өмнө бид бодит үнийг шалгана. Үнэ өөрчлөгдсөн бол <b>төлбөр авахаас өмнө</b> танд мэдэгдэж, таны зөвшөөрлийг авна. Та татгалзвал захиалга цуцлагдана.</li>
<li>Илт алдаатай үнэ (техникийн алдаа) гарсан тохиолдолд бид тухайн захиалгыг цуцалж, төлсөн мөнгийг бүрэн буцаана.</li>
</ul>
<h2>3. Захиалга, төлбөр</h2>
<ul>
<li>Захиалга QPay-ээр төлбөр бүрэн орсны дараа баталгаажна. Төлбөрийг ямар ч банкны аппаар хийнэ.</li>
<li>Сайт дээр төлбөр хийх боломжгүй үед та захиалгаа SMS, утсаар илгээж болно; энэ тохиолдолд бид төлбөрийн мэдээллийг тантай холбогдож өгнө.</li>
<li>Бараа нийлүүлэгч дээр дууссан, эсвэл бид авчрах боломжгүй болсон тохиолдолд захиалгыг цуцалж, төлбөрийг <b>бүрэн буцаана</b>.</li>
</ul>
<h2>4. Хүргэлт</h2>
<ul>
<li>Хүргэлтийн хугацаа ихэвчлэн захиалга баталгаажснаас хойш <b>7–14 хоног</b>. Гааль, хил, цаг агаар, баярын өдрүүдээс шалтгаалан хойшилж болох бөгөөд энэ тохиолдолд бид танд мэдэгдэнэ.</li>
<li>Захиалгын явцыг захиалгын дугаараараа (LV-26-0000) сайтын «Захиалга хянах» хэсгээс харна.</li>
<li>Барааг хүлээн авахдаа савлагаа, барааг шалгаарай. Гэмтэлтэй бол хүлээн авахаас өмнө хүргэгчид болон бидэнд мэдэгдэнэ үү.</li>
</ul>
<h2>5. Буцаалт, солилт</h2>
<ul>
<li>Бараа бүрийг таны захиалгаар тусгайлан авчирдаг тул захиалга баталгаажсаны дараа <b>сэтгэлээ өөрчилсөн, хэмжээ тохироогүй</b> шалтгаанаар буцаалт, солилт хийгдэхгүй. Хэмжээ, өнгөө эргэлзэж байвал захиалахаасаа өмнө бидэнтэй зөвлөлдөөрэй.</li>
<li>Гэхдээ <b>буруу бараа, гэмтэлтэй, эвдрэлтэй, хуурамч</b> бараа ирсэн тохиолдолд Хэрэглэгчийн эрхийг хамгаалах тухай хуулийн дагуу бид барааг солих, засах, эсвэл мөнгийг бүрэн буцаана. Бараа хүлээн авснаас хойш 3 хоногийн дотор зураг, бичлэгийн хамт мэдэгдэнэ үү.</li>
</ul>
<h2>6. Жинхэнэ эсэх</h2>
<p>Бид барааг албан ёсны дэлгүүр, итгэмжлэгдсэн борлуулагчдаас авч, манай агуулахад шалгадаг. Хуурамч бараа ирсэн нь нотлогдвол төлбөрийг бүрэн буцаана.</p>
<h2>7. Бэлгийн карт</h2>
<p>Бэлгийн картын үлдэгдлийг LEVERA дээр бараа худалдан авахад ашиглана. Бэлэн мөнгөөр солихгүй.</p>
<h2>8. Сэтгэгдэл</h2>
<p>Сэтгэгдэл таны бодит туршлагад тулгуурласан байх ёстой. Доромжилсон, худал, сурталчилгаа, бусдын хувийн мэдээлэл агуулсан сэтгэгдлийг бид нийтлэхгүй эсвэл устгана.</p>
<h2>9. Зураг, мэдээлэл</h2>
<p>Барааны зураг брэнд, борлуулагчийн албан ёсны зураг бөгөөд дэлгэцийн тохиргооноос шалтгаалан өнгө бага зэрэг ялгаатай харагдаж болно. Брэндийн нэр, лого нь тухайн эзэмшигчийн өмч бөгөөд LEVERA тэдгээр брэндийн албан ёсны төлөөлөгч биш.</p>
<h2>10. Хариуцлага</h2>
<p>Бидний хариуцлага тухайн захиалгын төлсөн дүнгээс хэтрэхгүй. Хууль зөрчсөн, бусдад хохирол учруулах зорилгоор сайтыг ашиглахыг хориглоно.</p>
<h2>11. Маргаан</h2>
<p>Маргааныг эхлээд харилцан тохиролцох замаар шийдвэрлэнэ. Тохиролцоогүй бол Монгол Улсын хуулийн дагуу шүүхээр шийдвэрлүүлнэ.</p>
<h2>12. Холбоо барих</h2>
<p>${CONTACT}</p>`,
    enBody: `
<p>By ordering from LEVERA you accept these terms, governed by the laws of Mongolia.</p>
<h2>Service</h2><p>LEVERA buys pieces from abroad to your order and delivers them in Ulaanbaatar.</p>
<h2>Prices</h2><p>Prices are final in MNT and include the item, cargo, delivery in Ulaanbaatar and our service; perfume prices include customs duty and VAT. Because exchange rates and supplier prices move daily, we confirm the real price before you pay; if it changed we ask you first, and you may cancel. Obvious pricing errors may be cancelled with a full refund.</p>
<h2>Orders and payment</h2><p>An order is confirmed once paid in full by QPay. If we cannot get the item, we cancel and refund in full.</p>
<h2>Delivery</h2><p>Usually 7–14 days from confirmation; customs, borders, weather or holidays can delay it, and we will tell you. Check the parcel when it arrives.</p>
<h2>Returns</h2><p>Every piece is bought for you, so change-of-mind and size returns are not accepted. Wrong, damaged, defective or counterfeit items are replaced, repaired or refunded in full under the Consumer Protection Law; tell us within 3 days of delivery with photos.</p>
<h2>Authenticity</h2><p>We source from official stores and authorised sellers and inspect each piece. A proven counterfeit is refunded in full.</p>
<h2>Gift cards</h2><p>Gift card balances are for LEVERA purchases and cannot be exchanged for cash.</p>
<h2>Reviews</h2><p>Reviews must reflect your real experience; abusive, false, promotional or private content is removed.</p>
<h2>Brands and photos</h2><p>Photos come from the brands and sellers; colours may differ slightly on screens. Brand names and logos belong to their owners; LEVERA is not an official representative of those brands.</p>
<h2>Liability and disputes</h2><p>Our liability is limited to the amount paid for the order. Disputes are settled by agreement first, otherwise by the courts of Mongolia.</p>
<h2>Contact</h2><p>${CONTACT_EN}</p>`
  },
  'cookies.html': {
    title: 'Күүкийн бодлого', en: 'Cookie policy',
    mn: `
<p>Күүки (cookie) болон хөтчийн санах ой (localStorage) нь таны төхөөрөмж дээр хадгалагддаг жижиг файл, тэмдэглэл юм. LEVERA зөвхөн сайт ажиллахад <b>зайлшгүй шаардлагатай</b> зүйлсийг ашигладаг. Бид сурталчилгааны күүки, бусдын хянах (tracking) код ашигладаггүй.</p>
<h2>Күүки</h2>
<table><tr><th>Нэр</th><th>Зорилго</th><th>Хугацаа</th></tr>
<tr><td><code>__session</code></td><td>Бүртгэлдээ нэвтэрсэн байдлыг хадгална (зөвхөн нэвтэрсэн үед)</td><td>60 хоног</td></tr></table>
<h2>Хөтчийн санах ой (зөвхөн таны төхөөрөмж дээр)</h2>
<table><tr><th>Нэр</th><th>Зорилго</th></tr>
<tr><td><code>lv-bag</code></td><td>Сагсанд хийсэн бараа</td></tr>
<tr><td><code>lv-saved</code></td><td>Хадгалсан (♡) бараа</td></tr>
<tr><td><code>lv-seen</code></td><td>Сүүлд үзсэн бараа</td></tr>
<tr><td><code>lv-lang</code></td><td>Сонгосон хэл (MN/EN)</td></tr>
<tr><td><code>lv-co-draft</code></td><td>Захиалгын маягтад бичсэн нэр, утас, хаяг (дахин бичихгүйн тулд)</td></tr>
<tr><td><code>lv-orders</code></td><td>Таны сүүлийн захиалгын дугаарууд (захиалга хянахад)</td></tr>
<tr><td><code>lv-consent</code></td><td>Энэ мэдэгдлийг уншсан эсэх</td></tr></table>
<p>Эдгээр мэдээлэл бидний сервер рүү илгээгддэггүй — зөвхөн таны хөтөч дээр үлдэнэ.</p>
<h2>Хэрхэн устгах вэ</h2>
<p>Хөтчийнхөө тохиргооноос (Settings → Privacy → Cookies and site data) LEVERA-гийн өгөгдлийг устгаж болно. Ингэвэл сагс, хадгалсан бараа арилж, бүртгэлээсээ гарна.</p>
<h2>Ирээдүйд</h2>
<p>Хэрэв бид зочдын статистик (жишээ нь Google Analytics) нэмбэл энэ хуудсыг шинэчилж, <b>таны зөвшөөрлийг авсны дараа</b> л идэвхжүүлнэ.</p>
<h2>Холбоо барих</h2>
<p>${CONTACT}</p>`,
    enBody: `
<p>LEVERA uses only what the site needs to work. No advertising cookies, no third-party tracking.</p>
<h2>Cookie</h2><p><code>__session</code> keeps you signed in to your account (only after you sign in), 60 days.</p>
<h2>Browser storage (stays on your device)</h2><p><code>lv-bag</code> bag · <code>lv-saved</code> saved items · <code>lv-seen</code> recently viewed · <code>lv-lang</code> language · <code>lv-co-draft</code> checkout form · <code>lv-orders</code> your order numbers · <code>lv-consent</code> this notice. None of it is sent to our server.</p>
<h2>Removing it</h2><p>Clear LEVERA's site data in your browser settings; your bag and saved items will be emptied and you will be signed out.</p>
<h2>In future</h2><p>If we add visitor statistics, we will update this page and turn them on only with your consent.</p>
<h2>Contact</h2><p>${CONTACT_EN}</p>`
  }
};

const page = (file, P) => `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${P.title} — LEVERA</title>
<meta name="description" content="LEVERA — ${P.title}. ${P.en}.">
<meta name="theme-color" content="#16171A">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap">
<link rel="stylesheet" href="css/legal.css">
</head>
<body>
<header class="lg-top"><a class="lg-logo" href="index.html">LEVERA</a><nav><a href="shop.html">Дэлгүүр</a><a href="privacy.html"${file === 'privacy.html' ? ' aria-current="page"' : ''}>Нууцлал</a><a href="terms.html"${file === 'terms.html' ? ' aria-current="page"' : ''}>Нөхцөл</a><a href="cookies.html"${file === 'cookies.html' ? ' aria-current="page"' : ''}>Күүки</a></nav></header>
<main class="lg">
  <div class="lg-k">LEVERA · ${P.en}</div>
  <h1>${P.title}</h1>
  <p class="lg-date">Сүүлд шинэчилсэн: ${UPDATED}</p>
  ${P.mn}
  <details class="lg-en"><summary>English version</summary>
    <h1>${P.en}</h1><p class="lg-date">Last updated: ${UPDATED_EN}</p>
    ${P.enBody}
  </details>
</main>
<footer class="lg-foot"><span>© 2026 LEVERA</span><a href="privacy.html">Нууцлалын бодлого</a><a href="terms.html">Үйлчилгээний нөхцөл</a><a href="cookies.html">Күүкийн бодлого</a><a href="index.html">Нүүр</a></footer>
<script src="js/consent.js" defer></script>
</body>
</html>
`;
for (const [file, P] of Object.entries(PAGES)) writeFileSync(join(ROOT, file), page(file, P));
console.log('written:', Object.keys(PAGES).join(', '));
