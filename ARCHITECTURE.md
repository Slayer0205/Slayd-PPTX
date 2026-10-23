# Arxitektura

## Chegaralar

React/Vite frontend mustaqil ishlaydi. `Project` versiyalangan Zod formatida 1280×720 slaydlar yoki 1280×1800 poster saqlaydi. Har bir element o‘z koordinatasi, matni, uslubi va qatlamiga ega. Uzoqdan kelgan/import qilingan hujjat qayta validatsiyadan o‘tadi. Hech qanday ixtiyoriy HTML/JS/SQL bajarilmaydi.

`src/domain.ts` sof hujjat, shablon, maket, sifat va tarix funksiyalarini saqlaydi. `Canvas.tsx` ham thumbnail, ham editor, namoyish va PDF uchun yagona rendererdir. `export.ts` shu koordinatalardan PPTX matn/shakl/rasmlarini yaratadi; eksport og‘ir modullari kech yuklanadi. PowerPoint boshqa font renderer ishlatishi mumkin; eksport tahrirlanadi, piksel bo‘yicha bir xil chiqish kafolatlanmaydi.

`storage.ts` IndexedDB’da har loyiha uchun mustaqil key ishlatadi. JSON qo‘lda olinadigan ko‘chma backup. Tarix 50 holat bilan cheklangan. Autosave 350 ms kechikadi; yozish xatosi ochiq ko‘rsatiladi. Mahalliy loyiha hisobdan chiqilganda o‘chmaydi. Ko‘p tabda bir loyihani bir vaqtda tahrirlash uchun alohida conflict protokoli hali yo‘q.

`cloud.ts` faqat public Supabase client va foydalanuvchi JWT’si bilan ishlaydi. Bulutga saqlash hozir qo‘lda; `save_project` RPC expected revision’ni atomar tekshiradi. Mos kelmasa overwrite o‘rniga konflikt beradi. Bulutdan yuklash mahalliy farqli nusxani saqlaydi. Bu real-time hamkorlik yoki avtomatik cloud autosave emas.

## AI oqimi

1. UI kontekst va amallarni `/api/ai`ga bearer JWT bilan yuboradi.
2. Functions Supabase Auth orqali foydalanuvchini tekshiradi, request hajmi/Zod/rate limit qo‘llaydi.
3. Taqdimot yaratishda service role orqali SQL rezerv olinadi. Boshqa AI amallari rate limit bilan cheklanadi.
4. Gemini serverdan chaqiriladi; 40 soniyalik timeout, chegaralangan javob hajmi, JSON/Zod tekshiruvi bor. Yashirin fallback yoki soxta natija yo‘q.
5. Tarjimada matnlar soni, quiz’da iqtibosning kontekstda borligi va deck’da slayd soni tekshiriladi.
6. Rezerv yakunlanadi yoki xatoda qaytariladi. Uzilib qolgan worker uchun bir soatdan eski rezervlarni qaytaruvchi maintenance RPC bor; operator scheduler qo‘shishi kerak.
7. Chat tool’lari faqat taklif. UI foydalanuvchi tasdig‘i, loyiha ID/versiyasi va typed registry’ni tekshirib, amallarni bir undo operatsiyasida qo‘llaydi. Kechikkan javob yangi tahrirni bosmaydi.

`tools.ts` cheklangan capability ro‘yxatini beradi. Admin, to‘lov yoki balans amallari registry’da yo‘q. Chat tarixi IndexedDB’da, maxfiy API kalitlari esa faqat serverda. Javoblar Markdown orqali raw HTML’siz render qilinadi. Streaming va muqobil provayderlar hali yo‘q.

## To‘lov va referral

`/api/payments` JWT va admin membership’ni tekshiradi. Chek private storage’da; server magic bytes va hajmni tekshiradi. Signed URL faqat egaga yoki admin’ga 300 soniyaga beriladi. Narx SQL’da `slides * 750` sifatida hisoblanadi. `review_payment` admin, bank tasdig‘i, noyob operatsiya raqami va order holatini tekshirib, balans va auditni bir tranzaksiyada yangilaydi.

`/api/telegram` secret header, chat ID, sender ID va serverdagi admin mapping’ni tekshiradi. UI bilan bir xil `review_payment` ishlatiladi. Receipt notification xatosi buyurtmani yo‘qotmaydi. Outbox, bank API integratsiyasi va malware skaneri yo‘q.

Referral claim kredit bermaydi. Faqat tasdiqlangan yangi foydalanuvchining birinchi completed generation tranzaksiyasi bonusni ko‘rib chiqadi. Referred user unique, inviter undan oldin ro‘yxatdan o‘tgan, inviter wallet lock ostida lifetime 10 ta reward bilan cheklangan. Limit va idempotency SQL testlari bor; hosted multi-session stress testi hali bajarilmagan.

## Tekshiruv qatlamlari

- Vitest: format, undo/redo, layout, sifat, tool ruxsati, PPTX XML, API mock integratsiyasi.
- PGlite: haqiqiy PostgreSQL’da migratsiyalar, RLS, wallet rezerv/refund, payment idempotency, private storage policy modeli va referral.
- Playwright/Chromium: yaratish/tahrirlash/undo/redesign/reload, drag, image, custom template, PPTX/PNG/JSON/PDF va mobil rejim.
- Wrangler Pages dev: haqiqiy Functions bundle va konfiguratsiya yo‘qligidagi xavfsiz HTTP javoblar.

Testlarning aniq holati va qolgan ishlar `IMPLEMENTATION_STATUS.md`da.
