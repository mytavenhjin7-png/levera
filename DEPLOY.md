# LEVERA — интернетэд байршуулах заавар

Сайт нь **Node.js сервер + MySQL** дээр ажилладаг. Доорх хоёр аргын аль нэгийг сонгоно.

| | A. Railway (хамгийн хялбар) | B. Өөрийн VPS (бүрэн хяналт) |
|---|---|---|
| Тохиргоо | Вэб дээр товч дарж | SSH-ээр 10 орчим команд |
| Зардал | ~$5–20/сар | ~$6–12/сар (DigitalOcean, Hetzner, Vultr г.м.) |
| Админаас оруулсан зураг | Дахин deploy хийхэд арилна* | Хадгалагдана |

\* Railway дээр бүтээгдэхүүний зургууд (`uploads/`) кодтой хамт явна. Админаас шинээр зураг оруулбал дараагийн deploy-д арилна — шинэ зургаа `uploads/`-д нэмж GitHub руу push хийнэ.

Анх асахад сервер хоосон мэдээллийн санд `data/levera-seed.sql`-ийг (35 брэнд, 1,206 идэвхтэй бараа — бүх зураг, үнэ, тохиргоо, сэтгэгдэл) **өөрөө ачаална** — гараар импорт хийх шаардлагагүй.

---

## Заавал тохируулах хувьсагчид

| Хувьсагч | Утга |
|---|---|
| `ADMIN_TOKEN` | Админ нууц үг — 24+ тэмдэгттэй санамсаргүй үг. **Хоосон орхиж болохгүй.** |
| `PUBLIC_URL` | Сайтын хаяг, жишээ нь `https://levera.mn` |
| `ALLOWED_ORIGIN` | Мөн адил `https://levera.mn` |
| `GEMINI_API_KEY` | AI туслахын түлхүүр (aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` |
| MySQL | Railway: `MYSQL_URL` · VPS: `MYSQL_PASSWORD` |
| `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET`, `QPAY_INVOICE_CODE` | QPay гэрээний дараа. Хоосон бол **жишээ горим** — захиалга үүсэх ч бодит төлбөр авахгүй. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Захиалгын мэдэгдэл (заавал биш) |

Бүх жагсаалт: `.env.production.example`.

---

## A. Railway

1. **GitHub:** github.com дээр шинэ **private** repository үүсгэнэ. Энэ хавтсыг (`node_modules`-гүйгээр) push хийнэ:
   ```bash
   git init
   git add .
   git commit -m "LEVERA"
   git branch -M main
   git remote add origin https://github.com/<таны-нэр>/levera.git
   git push -u origin main
   ```
   `.gitignore` нууц файлуудыг (`server/.env`, админ токен) оруулахгүй, харин зураг, `data/levera-seed.sql`-ийг оруулна.
2. **Railway:** railway.app → **New Project** → **Deploy from GitHub repo** → levera. `Dockerfile`-ийг өөрөө танина.
3. **MySQL:** төсөл дотор **+ New → Database → MySQL**.
4. **Хувьсагч:** levera үйлчилгээ → **Variables**:
   - `MYSQL_URL` = `${{MySQL.MYSQL_URL}}` (сонголтоос шууд холбоно)
   - `DB_DRIVER` = `mysql`
   - дээрх хүснэгтийн бусад хувьсагчид
5. **Домэйн:** **Settings → Networking → Generate Domain** (түр хаяг), эсвэл **Custom Domain** → levera.mn нэмээд домэйн бүртгэгч дээрээ заасан CNAME бичлэгийг үүсгэнэ. HTTPS автоматаар.
6. Deploy дуусахад **Logs** дээр `Loaded the shop from data/levera-seed.sql: 1206 products.` гарна.

## B. VPS (Ubuntu 22.04/24.04)

1. Сервер авна (2 GB RAM хангалттай). Домэйнийхээ **A бичлэгийг** серверийн IP руу заана.
2. Docker суулгана:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Хавтсаа сервер рүү хуулна (өөрийн компьютерээс):
   ```bash
   scp levera-deploy.zip root@<IP>:/opt/
   ssh root@<IP>
   cd /opt && apt install -y unzip && unzip levera-deploy.zip -d levera && cd levera
   ```
4. Тохиргоо:
   ```bash
   cp .env.production.example .env
   nano .env        # ADMIN_TOKEN, MYSQL_PASSWORD, PUBLIC_URL, GEMINI_API_KEY ... бөглөнө
   ```
5. Асаана:
   ```bash
   docker compose up -d --build
   docker compose logs -f app      # "Loaded the shop ... 1206 products" гарна
   ```
6. HTTPS (Caddy — сертификатыг өөрөө авч сунгана):
   ```bash
   apt install -y caddy
   echo 'levera.mn, www.levera.mn {
     reverse_proxy localhost:8787
   }' > /etc/caddy/Caddyfile
   systemctl reload caddy
   ```
7. Шинэчлэх: шинэ кодоо хуулаад `docker compose up -d --build`. Мэдээллийн сан, зураг хадгалагдана.

---

## Firebase (одоо ашиглаж буй арга) — төсөл `levera-mn`

Бүтэц:
- **Firebase Hosting** нь хуудас, css, js болон 847 барааны зургийг Google-ийн CDN-ээс хурдан үйлчилнэ.
- **Cloud Function `app`** (Токио) нь `server/index.mjs` бүхэлдээ. `/api/**`, `/sitemap.xml`, `/uploads/live/**` хүсэлтүүдийг энэ хүлээж авна.
- **TiDB Cloud** (MySQL) нь бараа, захиалга, хэрэглэгчийн мэдээллийг хадгална. Админаас хийсэн бүх өөрчлөлт энд хадгалагдаж, deploy хийхэд устахгүй.
- **Firebase Storage** нь админаас оруулсан шинэ зургийг хадгална (`uploads/live/...`).

Тохиргоо:
- Нууц тохиргоо (database, админ нууц үг, AI түлхүүр, Telegram, QPay) `functions/.env` файлд байна. Хэнд ч бүү өг.
- Загвар нь `functions/.env.example`.

Компьютер дээрээ кодоо засаад live руу гаргах:
```bash
npm run deploy          # бүгд (сайт + сервер)
npm run deploy:site     # зөвхөн html/css/js/зураг
npm run deploy:server   # зөвхөн сервер (server/*.mjs)
```
Админаас (https://www.levera.mn/admin.html) хийсэн өөрчлөлт шууд гарна. Deploy хийх шаардлагагүй.

Шинэ бараа, зургийг компьютер дээрээ хэрэгсэл ажиллуулж нэмсэн бол:
1. `npm run db:export`
2. `npm run deploy`
3. Админ → Карго ба үнэ → «Live мэдээллийг шинэчлэх».

Зардлаас сэргийлэх:
- Google Cloud Console → Billing → **Budgets & alerts** дээр $1–5-ын сануулга тавина.
- Функц хамгийн ихдээ 2 сервер асаахаар хязгаарлагдсан (`functions/index.js` → `maxInstances`).

## Үнэгүй байршуулах

### C. Oracle Cloud Always Free (үүрд үнэгүй, бүрэн сервер)
oracle.com/cloud/free дээр бүртгүүлнэ. Картаар зөвхөн хэн болохыг шалгадаг, мөнгө суутгахгүй.
1. **Create a VM instance**-ийг дараах тохиргоогоор үүсгэнэ:
   - Image: **Ubuntu 24.04**.
   - Shape: **Ampere (VM.Standard.A1.Flex)**, 2 OCPU, 12 GB RAM. Энэ нь үнэгүй хязгаарт багтана.
   - **Add SSH keys** хэсгээс түлхүүрээ татаж аваад хадгална.
2. Сүлжээний порт нээх: Instance → Subnet → Security List → **Add Ingress Rule** → TCP **80, 443**. Сервер дээрээ:
   ```bash
   sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save
   ```
3. Домэйнгүй бол **duckdns.org** дээр `levera.duckdns.org` гэх мэт үнэгүй хаяг аваад серверийн IP руу заана.
4. Цааш нь дээрх **B. VPS**-ийн 2–7-р алхам (`root@<IP>`-ийн оронд `ubuntu@<IP>`, командуудын өмнө `sudo`). Caddyfile дээр өөрийн хаягаа бичнэ.

### D. Render + TiDB Cloud (карт хэрэггүй)
- **Database:** tidbcloud.com → **Serverless** cluster (5 GB үнэгүй) → **Connect** → холболтын мэдээллээ хуулна.
- **Сайт:** кодоо GitHub-ийн private repo руу push хийгээд render.com → **New Web Service** → репо → **Docker** → **Free**.
- **Environment:**
  - `DB_DRIVER=mysql`, `MYSQL_SSL=true`
  - `MYSQL_HOST`, `MYSQL_PORT=4000`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE=levera`
  - `ADMIN_TOKEN`, `PUBLIC_URL=https://<нэр>.onrender.com`, `ALLOWED_ORIGIN` (ижил хаяг), `GEMINI_API_KEY`
- **Сул тал:** 15 минут хэн ч ороогүй бол сервер унтдаг тул дараагийн хүн ~1 минут хүлээнэ. Админаас оруулсан зураг дахин deploy хийхэд устна (database хэвээр үлдэнэ).

## Асаасны дараа шалгах

- [ ] `https://levera.mn` нээгдэж, бараа, зураг харагдаж байна
- [ ] `https://levera.mn/admin.html` → `ADMIN_TOKEN`-оор нэвтэрнэ
- [ ] «Ask» товч → AI туслах хариулж байна
- [ ] Туршилтын захиалга хийгээд Админ → Захиалга дээр гарч байна (дараа нь цуцална)
- [ ] `https://levera.mn/sitemap.xml` нээгдэж байна → Google Search Console-д бүртгүүлнэ

## Анхаарах зүйлс

- **Үнэ:** Dewu ¥ × ханш + 20% шимтгэл (₮2 саяас дээш хэсэгт 15%, доод тал нь ₮15,000) + карго + UBCab ₮6,000. Сүрчиг: албан ёсны үнэ + гааль 5% + НӨАТ 10% + хүргэлт. Бүгдийг Админ → Карго ба үнэ дээр өөрчилнө. Сүрчгээс бусад ¥ үнэ ойролцоо тооцоо тул захиалга бүрийг Dewu дээр шалгаад баталгаажуулна.
- **Сүрчиг ба карго:** сүрчиг шингэн, шатамхай бараа. HiCargo / таны карго сүрчиг хүлээн авдаг эсэх, нэмэлт төлбөртэй эсэхийг эхлээд асуугаарай.
- **QPay:** гэрээгүй бол сайт жишээ QR харуулна, бодит төлбөр авахгүй. Нээлттэй худалдаа эхлэхээс өмнө QPay-ээ холбоно.
- **Жишээ сэтгэгдэл:** 20 жишээ «Жишээ сэтгэгдэл» тэмдэгтэй. Бодит сэтгэгдэл ирэхэд: Админ → Сэтгэгдэл, эсвэл `npm run reviews:clear-samples`.
- **Зураг:** зургууд брэнд, StockX, дэлгүүрүүдийн вэбээс авсан. Брэндийн зургийг худалдаанд ашиглах эрх нь зураг эзэмшигчид хамаардаг — хэрэв гомдол ирвэл тухайн зургийг солино.
- **Нөөц хуулбар:** VPS дээр өдөр бүр `docker compose exec db mysqldump -uroot -p levera > backup.sql`.

## Дахин deploy хийх бүрт

Шинэ zip-ээр deploy хийхэд код шинэчлэгдэх боловч live мэдээллийн сан автоматаар шинэчлэгддэггүй. Deploy дууссаны дараа **Админ → Карго ба үнэ → «Live мэдээллийг шинэчлэх»** товчийг нэг удаа дарна. Эс тэгвэл хуучин бараа үлдэж, зарим зураг харагдахгүй болно. Захиалга, хэрэглэгч, гараар нэмсэн бараа хэвээр үлдэнэ.

## Зэрэглэл ба бэлгийн карт

- **Зэрэглэл** (бүртгэлтэй хэрэглэгч, төлсөн захиалгын нийлбэрээр): Хүрэл — анхны төлбөрөөс 1%, Мөнгө — ₮2,000,000-с 2%, Алт — ₮5,000,000-с 3%. Босгыг `server/rewards.mjs`-д засна.
- **Бэлгийн карт:** gift.html дээр ₮10,000–200,000. Төлбөр орсны дараа код идэвхжинэ. Код Админ → Бэлгийн карт дээр харагдана. QPay холбогдоогүй үед Админ → Захиалга дээр «төлөгдсөн» гэж тэмдэглэнэ.
- Карт ашигласан ч төлөгдөөгүй захиалга картын үлдэгдлийг барьж байдаг. Админаас захиалгыг цуцлахад үлдэгдэл буцна.
- Шалгах: `node tools/rewards-test.mjs` (10 минутад 8 захиалгын хязгаартай тул сервер шинээр асаасны дараа ажиллуулна).

## Deploy хийсний дараа засах

- **Админ → Бараа:** үнэ, хямдрал, зураг, нуух/гаргах — шууд сайтад гарна.
- **Админ → + Шинэ бараа:** брэнд (эсвэл шинэ брэнд), загвар, өнгө, төрөл, ¥ үнэ, хэмжээ, 1–8 зураг → «Бараа нэмэх». Үнэ автоматаар бодогдоно.
- **Админ → Хэрэглэгч:** бүртгэлтэй хэрэглэгчид, захиалгын тоо; нууц үгээ мартсанд «Нууц үг шинэчлэх» → түр нууц үгийг утсаар хэлнэ.
- **Албан ёсны зураг (компьютер дээрээ, дараа нь `npm run db:export` → дахин deploy):**
  - Uniqlo: `node tools/uniqlo-official.mjs` (шинэ бараа), `--fix <id>=<Uniqlo нэр>|<ӨНГӨ>` (тодорхой барааг холбох), `--redo` (бүх Uniqlo зургийг дахин)
  - Nike: `node tools/nike-official.mjs <id>=<style код>` (жишээ нь `nike-club-cap-black=FB5368-010`)
  - Creed, Parfums de Marly, Xerjoff, Tom Ford, MFK, Byredo: `node tools/official-shop-photos.mjs`
  - Цөөн бараа, удаан бөгөөд найдвартай: `node tools/ddg-photos.mjs <ids.json>` (бараа бүрт нэг хайлт, хооронд нь хүлээнэ)
  - Бусад: `npm run photos` (DuckDuckGo хайлт — хэт олон удаа ажиллуулбал түр хаагдана, маргааш дахин). Дараа нь `node tools/top-up-photos.mjs` бараа бүрийг 3+ зурагтай болгоно.
- **Код, дизайн:** компьютер дээрээ засаад дахин deploy (Railway: `git push`; VPS: `docker compose up -d --build`). Live мэдээллийн сан хэвээр үлдэнэ.
