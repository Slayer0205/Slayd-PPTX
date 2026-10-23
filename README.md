# SlideCraft AI

Laziz Xayrulloyev uchun yangi React/TypeScript taqdimot studiyasi. Mavjud checkout va masofaviy repozitoriy bo‘sh bo‘lgani sababli, foydalanuvchining “O‘zing yangi yarat” ruxsati bilan boshidan yaratildi. Eski production saytidan kod yoki ma’lumot olinmadi.

## GitHub’dan olish

[Loyiha kodi — feat/slidecraft-ultimate](https://github.com/Slayer0205/Slayd-PPTX/tree/feat/slidecraft-ultimate) · [ZIP arxivini yuklash](https://github.com/Slayer0205/Slayd-PPTX/archive/refs/heads/feat/slidecraft-ultimate.zip)

Yoki Git bilan:

```sh
git clone --branch feat/slidecraft-ultimate https://github.com/Slayer0205/Slayd-PPTX.git
cd Slayd-PPTX
```

Repozitoriy private bo‘lsa, unga ruxsati bor GitHub hisobingiz bilan kiring. Arxivda manba kodi, testlar, migratsiyalar va hujjatlar bor; maxfiy kalitlar va `node_modules` kiritilmagan.

## Tez boshlash

Node **24.19.0** (kamida 22.12) va npm kerak. Loyiha katalogida:

```sh
npm ci
npm run dev
```

Windows PowerShell’da `.ps1` npm shim o‘rniga:

```powershell
npm.cmd ci
npm.cmd run dev
```

Yoki `scripts/setup.ps1` va `scripts/dev.ps1`. Muhit execution policy cheklasa, buyruqlarni bevosita `npm.cmd` bilan bajaring; siyosatni o‘chirib qo‘yish shart emas. PowerShell skriptlari bu Linux muhitida bajarilmagan.

Mahalliy rejimga hisob yoki API kaliti kerak emas. Muharrir, IndexedDB autosave, shablonlar, maketlar, diagrammalar, tahlil va eksport ishlaydi. Bu standart development jarayoni. Har bir cloud task allaqachon ajratilgan; mavjud checkoutdan foydalaning, qo‘shimcha Git worktree yaratmang.

## Ishlaydigan imkoniyatlar

- Mustaqil matn, shakl va raster rasmlar: tanlash, sudrash, o‘lcham, 8 px qadam, shrift, rang, qatlam, qulf, nusxalash/o‘chirish.
- Slayd qo‘shish, nusxalash, tartiblash, 50 bosqichli undo/redo, IndexedDB autosave va JSON import/zaxira.
- Mazmunni saqlaydigan 10 algoritmik dizayn varianti; AI natijasi deb ko‘rsatilmaydi.
- Tahrirlanadigan PPTX, 1920×1080 PNG (oddiy slayd), brauzer orqali PDF. PDF oynasida fon ranglarini yoqing, kolontitullarni o‘chiring va “Save as PDF” tanlang.
- Akademik, biznes, erkin va poster shablonlari, 20 tagacha shaxsiy shablon.
- Jarayon bloklari va foydalanuvchi raqamlariga asoslangan diagrammalar; skrinshotdan ochiq belgilangan qo‘lda tiklash.
- Qoidalar asosidagi sifat tahlili va SourceGuard evristikasi; tashqi manbalarni tasdiqlamaydi.
- To‘liq ekran, klaviatura, taymer, qaydlar va lazerli namoyish.
- Tungi, yorug‘, okean, avrora va minimal ko‘rinish; mobil drawer va chat.

Tashqi xizmatlar ulanganda UI’dan Gemini chat/tool takliflari, taqdimot yaratish, quiz, tarjima preview, matn tahriri, spiker qaydlari va himoya mashqi chaqiriladi. Supabase bulut nusxalari, konflikt nazorati, ulashish, to‘lovlar va referral jarayoni ham ulangan, ammo haqiqiy xizmatlar bilan hali tekshirilmagan. Tafsilotlar: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Tekshiruvlar

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm test` haqiqiy PostgreSQL’ning WASM versiyasi PGlite’da SQL migratsiyalar, RLS va tranzaksiyalarni bajaradi. Bu hosted Supabase Auth/Storage testining o‘rnini bosmaydi. API testlarida provayderlar mock qilinadi. Playwright tizimdagi `/usr/bin/chromium`ni topsa ishlatadi; boshqa joyda `npx.cmd playwright install chromium` yoki `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` kerak. PDF matnini qo‘shimcha ravishda `pdftotext` bilan tekshirish mumkin.

## Supabase va AI ulash

1. **Yangi development Supabase loyihasi** yarating. Bu migratsiyalar eski tijoriy baza uchun upgrade emas. Mavjud production bazaga ko‘r-ko‘rona qo‘llamang.
2. `supabase/migrations/001_slidecraft.sql` dan `004_referrals.sql` gacha tartib bilan SQL editor/CLI orqali qo‘llang. SQL testlarida auth va storage sxemalarining minimal modellari ishlatiladi; Supabase’da ular platformaning o‘zidan keladi.
3. Google OAuth yoqing. Supabase Auth redirect allowlist’iga faqat ishlatiladigan local, preview va production originlarini `/` bilan kiriting. Masalan, `http://localhost:5173/`, `http://localhost:8788/`, berilgan preview va production manzillari. Ilova qaytish manzilini `location.origin + '/'` bilan belgilaydi. Google konsolidagi callback — Supabase ko‘rsatgan auth callback.
4. `.env.example`dan `.env.local` yarating: faqat public `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY`. Ular build vaqtida o‘qiladi; o‘zgargach qayta build qiling.
5. `.dev.vars.example`dan `.dev.vars` yarating. Server Supabase URL/anon key, service role va Gemini kalitini faqat ushbu maxfiy fayl yoki Cloudflare Secrets’dan oladi. Qiymatlarni Git yoki chatga joylamang.
6. `npm run build`, so‘ng `npm run dev:cloud`. **Vite `dev` serveri `/api` Functions’ni bajarmaydi.** Cloudflare Pages dev statik build va Functions’ni bir origin’da ishlatadi. Frontend o‘zgarganda build’ni yangilang.
7. `wrangler.toml`da AI va to‘lov rate-limit bindinglari bor. Hosted deployment’da ular mavjudligini alohida tekshiring. Yetishmasa server so‘rovni rad etadi.

Supabase loyihangizning aniq domeniga, `generativelanguage.googleapis.com` va Telegram yoqilganda `api.telegram.org`ga HTTPS chiqish kerak. Custom Supabase domeni ishlatilsa `public/_headers`dagi `connect-src`ni ham moslang. TLS yoki checksum tekshiruvlarini o‘chirmang.

## Hisob, limit va to‘lov

Oddiy tasdiqlangan hisobda birinchi **15 AI slayd bepul**. Keyin har slayd **750 UZS**. Server to‘liq yaratish oldidan limitni rezerv qiladi, valid natijadan keyin yakunlaydi, xatoda qaytaradi. Worker uzilib qolsa rezerv qolishi mumkin: `release_stale_generations()`ni faqat ishonchli server/scheduler orqali davriy chaqiring; u bir soatdan eski rezervlarni qaytaradi. Bu scheduler hali tashqi muhitda o‘rnatilmagan.

Administrator huquqi `admin_memberships` jadvaliga ishonchli operator tomonidan kiritiladi. Email yoki frontend flag admin qilmaydi. Admin avlodi limitdan ozod, lekin Gemini limitlari saqlanadi. Laziz ADMIN AI nomi bunday huquq bermaydi.

`PAYMENT_INSTRUCTIONS`ga foydalanuvchiga ko‘rsatishga ruxsat berilgan bank rekvizitlarini kiriting. Kiritilmaganda UI chek topshirishni yopadi. JPG/PNG/PDF chek private `payment-receipts` bucket’iga yuklanadi. Server yo‘l, hajm va fayl signaturasini tekshiradi. Administrator o‘z oynasida chekning qisqa muddatli signed URL’ini ochadi, bankni mustaqil tekshiradi, noyob bank operatsiya raqami va tasdiq bilan qabul qiladi yoki sabab bilan rad etadi. Rad etish sababi foydalanuvchiga ko‘rinadi. Bank raqami va tranzaksiya qayta kredit ajratilishini to‘sadi. Avtomatik screenshot approval yo‘q.

Telegram ixtiyoriy: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_IDS`, `TELEGRAM_ADMIN_USER_IDS`, `TELEGRAM_WEBHOOK_SECRET`ni Cloudflare Secrets/settings’da sozlang. Sonlar vergul bilan ajratiladi. `telegram_admins` jadvalida Telegram sender ID’ni haqiqiy Supabase admin UUID’ga operator biriktiradi. Bot webhook’ini `/api/telegram` va shu maxfiy header token bilan **o‘zingizning deploymentingizda** ro‘yxatdan o‘tkazing. Buyruqlar:

```text
/approve_confirmed ORDER_UUID BANK_REFERENCE
/reject ORDER_UUID Rad etish sababi
```

`approve_confirmed` yuborish bank tushumini mustaqil tasdiqlaganingizni anglatadi. Soxta yoki ruxsatsiz webhooklar rad etiladi. Xabar yuborish muvaffaqiyatsiz bo‘lsa buyurtma saqlanadi va UI bu holatni ko‘rsatadi; Telegram xabari uchun avtomatik outbox/retry hali yo‘q.

Referral: faqat tasdiqlangan yangi hisob, 7 kun ichida biriktirilgan bitta taklif va birinchi muvaffaqiyatli AI yaratishdan keyin 5 slayd bonus. O‘zini taklif qilish, sikllar, takroriy bonuslar va 10 taklifdan ortiq bonus serverda to‘siladi. Email tasdig‘i bir inson ekanini kafolatlamaydi; production oldidan qo‘shimcha anti-fraud kerak.

## Nashr

Deploy bajarilmagan. Preview/rollback yo‘riqnomasi [DEPLOYMENT.md](DEPLOYMENT.md)da. Arxitektura: [ARCHITECTURE.md](ARCHITECTURE.md). Muhim chegaralar: [SECURITY_NOTES.md](SECURITY_NOTES.md).
