// LEVERA — sample reviews for the Reviews page while the shop has few real ones.
//   npm run reviews:samples         → adds 123 sample reviews in Mongolian, half Cyrillic, half Latin letters (replacing earlier samples)
//   npm run reviews:clear-samples   → deletes every sample review
// Samples are stored with status 'sample': the site shows them with a «Жишээ сэтгэгдэл» badge and a note, and they
// never count toward a product's star rating or the review totals. They are written text, not real customers —
// remove them once real reviews come in.
const dbm = await import('../server/db.mjs');
await dbm.ready;
const db = dbm.db;

if (process.argv.includes('--clear')) {
  const r = await db.run("DELETE FROM reviews WHERE status='sample'");
  console.log(`Deleted ${r.changes} sample reviews.`);
  process.exit(0);
}

// Half of the samples are written the way many people type Mongolian online: in Latin letters.
const LAT = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'j', з:'z', и:'i', й:'i', к:'k', л:'l', м:'m', н:'n', о:'o', ө:'u', п:'p', р:'r', с:'s', т:'t',
  у:'u', ү:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sh', ъ:'', ы:'ii', ь:'i', э:'e', ю:'yu', я:'ya' };
const latin = str => str.replace(/[А-яЁёӨөҮү]/g, c => { const l = LAT[c.toLowerCase()]; return l == null ? c : c === c.toLowerCase() ? l : l.charAt(0).toUpperCase() + l.slice(1); })
  .replace(/−/g, '-').replace(/«|»/g, '"');

// deterministic pseudo-random, so a re-run gives the same set
let seed = 20261025;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a => a[Math.floor(rnd() * a.length)];

const INITIALS = 'Б Г Д Э Н О Т С М Ж Х Ц Ч А У Л Р'.split(' ');
const NAMES = ['Тэмүүлэн', 'Номин', 'Билгүүн', 'Анужин', 'Тэмүүжин', 'Мөнхжин', 'Сарнай', 'Энхжин', 'Ганбаатар', 'Батзориг', 'Хулан', 'Солонго',
  'Оюунчимэг', 'Цэцэгмаа', 'Баярмаа', 'Түвшин', 'Мандах', 'Төгөлдөр', 'Эрдэнэ', 'Сүхбат', 'Индра', 'Марал', 'Нандин', 'Ариунаа', 'Золзаяа',
  'Отгонбаяр', 'Дөлгөөн', 'Хонгор', 'Тэлмүүн', 'Бат-Эрдэнэ', 'Ууганбаяр', 'Гэрэлмаа', 'Мишээл', 'Амин-Эрдэнэ', 'Өлзий', 'Мөнх-Очир', 'Пүрэвсүрэн',
  'Саруул', 'Нямдорж', 'Энхтүвшин', 'Халиун', 'Даваасүрэн', 'Буянжаргал', 'Жавхлан', 'Мөнгөнзул', 'Тэнгис', 'Хишигт', 'Уянга', 'Чингүүн', 'Ананд'];

const TEXT = {
  footwear: [
    ['Яг таарсан', 'Хэмжээ яг таарсан, өдөржин өмсөхөд хөл огт өвдөөгүй. Хайрцаг нь бүтэн ирсэн.'],
    ['Талбай дээр гайхалтай', 'Сагсан бөмбөг тоглоход барьц нь маш сайн, үсрэхэд зөөлөвч нь мэдрэгдэнэ. Хүүхэддээ ч бас авна.'],
    ['Зураг дээрхтэй адилхан', 'Зураг дээрхтэй яг адилхан ирлээ. Өнгө нь бодит байдал дээр бүр ч гоё харагдаж байна.'],
    ['Нэг размер томдуу аваарай', 'Энэ загвар жаахан жижигдүү байдаг гэж зөвлөсөн, нэг размер том авсан чинь яг таарсан. Зөвлөгөө өгсөнд баярлалаа.'],
    ['Чанар нь сайн', 'Оёдол, наалт бүгд цэвэрхэн. Найзууд маань хаанаас авсныг асуугаад байна.'],
    ['Удаан алхахад тухтай', 'Ул нь зөөлөн, их удаан алхсан ч ядраагүй. Дараагийн удаа өөр өнгөөр нь авна.'],
    ['Санаа зовох хэрэггүй', 'Анх удаа онлайнаар пүүз захиалсан болохоор санаа зовж байсан ч бүх зүйл сайхан болсон. QPay-ээр төлөхөд амархан.'],
    ['Заалны гутал', 'Заал дээр төгс, харин өвлийн мөстэй замд арай гулгамтгай юм билээ. Гадаа өмсөхөөр бол анхаараарай.'],
    ['Мөрөөдлийн пүүз', 'Олон жил хайсан загвараа эцэст нь авлаа. Хайрцаг, шошго бүгд байгаа.'],
    ['Хөнгөн', 'Гүйлтэд өмсөж байна, маш хөнгөн. Хоёр долоо хоногийн дараа ч хэлбэрээ алдаагүй.']
  ],
  apparel: [
    ['−30 хэмд ч дулаахан', 'Улаанбаатарын хүйтэнд ч дулаахан байна. Хөнгөн атлаа маш дулаан, автобусанд хөлрөхгүй.'],
    ['Хэмжээ тохирсон', 'Хэмжээний зөвлөгөө авсны ачаар яг таарсан. Ханцуйн урт тохиромжтой.'],
    ['Даавуу чанартай', 'Даавуу нь зузаан, чанартай. Хэд угаасан ч хэлбэрээ алдаагүй, өнгө нь гуйвшгүй.'],
    ['Өнгө арай бараан', 'Өнгө нь зурган дээрхээс арай бараан юм билээ, гэхдээ надад бүр илүү таалагдсан.'],
    ['Өдөр бүр өмсөнө', 'Өдөр тутам өмсөхөд их тухтай. Гэр бүлдээ дахин захиална.'],
    ['Оверсайз загвар', 'Оверсайз загвар учраас нэг размер жижиг авсан нь зөв байлаа. Мөрөн дээр гоё тогтдог.'],
    ['Салхинд нэвтэрдэггүй', 'Цахилгаан, халаас бүгд чанартай. Хаврын салхинд ч нэвтэрдэггүй.'],
    ['Бэлэгт өгсөн', 'Нөхөртөө төрсөн өдрийнх нь бэлэг болгож авсан, их баярласан.']
  ],
  bags: [
    ['Савлагаа гоё', 'Савлагаа нь үнэхээр сайхан, бэлэг болгоход тохиромжтой байлаа.'],
    ['Бүх зүйл багтана', 'Жижигхэн ч гэсэн утас, түрийвч, түлхүүр бүгд багтаж байна. Мөрний оосор нь тохируулгатай.'],
    ['Өдөр бүр хэрэглэж байна', 'Материал нь зөөлөн, өнгө нь гоё. Ажилдаа өдөр бүр үүрч явж байна.'],
    ['Итгэлтэй худалдан авалт', 'Жинхэнэ эсэхийг шалгаж, шошго, уут бүгдтэй нь ирсэн нь итгэл төрүүлсэн.']
  ],
  accessories: [
    ['Яг хүссэнээрээ', 'Зураг дээрхтэй яг адилхан, өнгө нь гоё. Хайрцагтай нь ирсэн.'],
    ['Бэлэгт тохиромжтой', 'Найздаа бэлэглэсэн, савлагаа нь маш цэвэрхэн байсан.'],
    ['Чанартай', 'Жижиг зүйл ч гэсэн хийц нь чанартай нь мэдрэгдэнэ. Дахин захиална.']
  ],
  fragrance: [
    ['Удаан тогтдог', 'Үнэр нь өдөржин тогтдог. Эхнэртээ бэлэглэсэн, их баярласан.'],
    ['Лацтай шинэ', 'Лацтай, шинэ ирсэн. Савлагаа нь маш сайн байлаа.'],
    ['Өвлийн үнэр', 'Зуны халуунд арай хүндэвтэр санагдаж магадгүй, гэхдээ өвөлд төгс.']
  ],
  mid: [
    ['Гайгүй', 'Бараа өөрөө сайн ч хүргэлт 14 хоног болсон. Арай удсан.'],
    ['Өнгө бага зэрэг өөр', 'Өнгө нь зурагнаас бага зэрэг өөр байсан. Чанар нь гайгүй.'],
    ['Хэмжээ томдуу', 'Хэмжээ арай томдуу ирсэн. Захиалахаасаа өмнө зөвлөгөө авбал зүгээр.']
  ],
};

const products = await db.all('SELECT id, cat, sizes FROM products WHERE active=1 AND photo IS NOT NULL');
if (!products.length) { console.log('No products with photos yet.'); process.exit(1); }
// spread over the catalogue, a little weighted towards shoes and outerwear
const pool = products.flatMap(p => (p.cat === 'footwear' || p.cat === 'apparel' ? [p, p] : [p]));

await db.run("DELETE FROM reviews WHERE status='sample'");
const now = Date.now(), used = new Set();
let made = 0;
while (made < 123) {
  const p = pick(pool);
  if (used.has(p.id) && rnd() < 0.8) continue;        // mostly one review per piece
  used.add(p.id);
  // ratings 3–5, most of them 4–5
  const r = rnd(), rating = r < 0.55 ? 5 : r < 0.87 ? 4 : 3;
  let [title, body] = pick(rating >= 4 ? TEXT[p.cat] || TEXT.apparel : TEXT.mid);
  let who = `${pick(INITIALS)}.${pick(NAMES)}`;
  const inLatin = made % 2 === 1;                        // every second sample in Latin letters
  if (inLatin) { title = latin(title); body = latin(body); who = latin(who); }
  const sizes = JSON.parse(p.sizes || '[]');
  const size = sizes.length > 1 && rnd() < 0.7 ? sizes[Math.floor(sizes.length * (0.3 + rnd() * 0.4))] : null;
  const fit = ['apparel', 'footwear'].includes(p.cat) && rnd() < 0.75 ? (rnd() < 0.7 ? 'true' : rnd() < 0.5 ? 'small' : 'large') : null;
  const when = new Date(now - Math.floor(rnd() * 180) * 86400000 - Math.floor(rnd() * 86400000)).toISOString().slice(0, 19).replace('T', ' ');
  await db.run("INSERT INTO reviews(product_id,name,rating,title,body,size,fit,verified,status,lang,created_at) VALUES(?,?,?,?,?,?,?,0,'sample',?,?)",
    [p.id, who, rating, title, body, size, fit, inLatin ? 'mnla' : 'mn', when]);
  made++;
}
console.log(`Added ${made} sample reviews (status 'sample': labelled on the site, not counted in ratings).`);
try {
  const { readFileSync } = await import('node:fs');
  const token = process.env.ADMIN_TOKEN || readFileSync(new URL('../data/admin-token.txt', import.meta.url), 'utf8').trim();
  await fetch(`http://localhost:${process.env.PORT || 8787}/api/admin/reload`, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(3000) });
} catch {}
process.exit(0);
