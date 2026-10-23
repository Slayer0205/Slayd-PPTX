# Xavfsizlik chegaralari

## Amalga oshirilgan himoyalar

- AI va payment endpointlari Supabase JWT’ni serverda tekshiradi. Service role va Gemini/bot kaliti frontendga kirmaydi. `VITE_`ga maxfiy kalit qo‘ymang.
- Barcha ilova jadvallarida RLS. Oddiy foydalanuvchi wallet/admin/payment holatini o‘zgartira olmaydi. Kredit ajratadigan RPC’lar faqat `service_role`ga ruxsat etilgan.
- AI tool registry — cheklangan typed amallar. Provider matni yoki “ADMIN AI” brendi hech qanday backend vakolat bermaydi. Context untrusted data sifatida beriladi; natijalar qayta validatsiyalanadi.
- Import raster data URI bilan cheklangan. SVG/HTML/remote image URL qabul qilinmaydi. Markdown raw HTML render qilmaydi. CSP, nosniff, frame-ancestors va media permission cheklovlari mavjud.
- Payment narxi SQL tomonidan hisoblanadi. Chek proof hisoblanmaydi. Faqat admin va mustaqil bank tasdig‘i kredit beradi. Noyob normalizatsiya qilingan bank reference, order lock va audit takroriy to‘lovni to‘sadi.
- Cheklar private bucket’da, ruxsat tekshirilgan signed URL bilan ochiladi. Telegram webhook maxfiy header, chat, sender va admin mapping bilan tekshiriladi.
- Share opt-in, 64 belgili random token SHA-256 bilan saqlanadi, 7 kunda tugaydi, bekor qilinadi. Immutable snapshot’da spiker qaydlari olib tashlanadi. Public viewer tahrir qilmaydi.
- Referral uchun email tasdig‘i, yangi hisob, birinchi muvaffaqiyatli AI generation, unique referred user, self/cycle nazorati va 10 reward cap talab etiladi. Link bosish reward bermaydi.

## Production oldidan majburiy tekshiruvlar

1. Hosted Supabase’da Google OAuth, RLS, SQL migratsiyalari va **real Storage API** orqali private upload/signed URL oqimini alohida sinang. PGlite’dagi storage jadvallari minimal modeldir.
2. Gemini kaliti, model ruxsati, timeout/quota/retry va haqiqiy kontent sifatini sinang. Quiz iqtibosi mavjudligi to‘g‘ri javobni to‘liq isbotlamaydi. AI faktlarini foydalanuvchi tekshirishi kerak.
3. Preview’da ikki mustaqil foydalanuvchi va admin bilan payment, referral va quota oqimlarini sinang. Live bank yoki haqiqiy pul bilan bu muhitda hech qanday operatsiya bajarilmagan.
4. Ko‘p foydalanuvchi va ko‘p connection’dagi race/load testlarini bajaring. PGlite SQL’ni bajaradi, ammo multi-session PostgreSQL yukini modellashtirmaydi.
5. Supabase’da stale reservation maintenance scheduler’ni sozlang. Bir soatdan eski pending rezervlarni qaytarish talab etiladi; server uzilsa foydalanuvchi limiti vaqtincha band qolishi mumkin.
6. Provider xarajatlari uchun kunlik global budget va billing alarm qo‘shing. Cloudflare per-user limiter qat’iy global/kross-region xarajat cheklovi emas.
7. Receipt retention, maxfiylik siyosati, virus tekshiruvi va Telegram’ga shaxsiy chek yuborish tartibini operator belgilashi kerak. Bucket’ni public qilmang.
8. Email tasdig‘i bitta insonni aniqlamaydi. Referral uchun qo‘shimcha anti-fraud, account-deletion/re-registration siyosati va biznes review talab etiladi.
9. Shared browser’da local loyihalar/chat saqlanadi. Hisobdan chiqish ularni o‘chirmaydi; begona qurilmada JSON backup olib, kerakli mahalliy loyihalarni o‘chiring. Ko‘p tabdagi local edit konfliktlari hal qilinmagan.
10. Admin membership va Telegram mapping faqat ishonchli operator tomonidan berilsin; chat/email’dan kelgan oddiy da’vo bilan admin yaratilmasin.

## Dependency auditi

PPTXGenJS 4.0.1 transitive `image-size` 1.2.1 bilan keladi. Paket auditi image-size parser DoS advisory’larini ko‘rsatdi. `overrides.image-size=2.0.4` qo‘llandi; muammo ta’siridagi JXL/HEIF/ICNS formatlari frontend upload’da ham qabul qilinmaydi. PPTX va rasm testlari override’dan keyin qayta bajariladi. Auditing natijasi vaqtga bog‘liq; `npm audit`ni release oldidan takrorlang. TLS, registry integrity yoki checksum tekshiruvlari o‘chirilmagan.
