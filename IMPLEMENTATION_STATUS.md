# SlideCraft AI — amalga oshirish holati

Sana: 2026-10-23. Holat: ishlaydigan mahalliy development versiyasi; production release emas.

## Boshlang‘ich audit va ruxsat

`Slayer0205/Slayd-PPTX` checkouti ham, masofaviy Git ref’lari ham bo‘sh edi. Mavjud React kodi, manifest, migration yoki Windows loyihasi bu mashinada topilmadi. Foydalanuvchi keyin **“O‘zing yangi yarat”** deb yangi loyiha yaratishga ruxsat berdi. Shu sababli bu eski v0.7.x tijoriy loyihaga patch emas; yangi amalga oshirishdir.

O‘zgartirishlardan oldin `feat/slidecraft-ultimate` branch yaratildi va boshlang‘ich checkout tashqaridagi `before-implementation.tar.gz`ga arxivlanib tekshirildi. Eski production ma’lumotlari, deployment va kalitlar o‘zgartirilmadi. Foydalanuvchining alohida so‘rovi bilan loyiha commit qilinib, `Slayer0205/Slayd-PPTX` repozitoriysining `feat/slidecraft-ultimate` branchiga yuborildi. `main` branchiga push bajarilmadi.

## Bajarilgan va mahalliy tekshirilgan

| Yo‘nalish        | Haqiqiy imkoniyat va dalil                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tooling          | React 19, TypeScript, Vite, pinned dependency va lockfile, frozen `npm ci`, build, Vitest, Playwright, Wrangler Functions bundle   |
| Studio           | Mustaqil matn/shakl/rasmlar, drag, resize, rang/font/alignment, qatlam, qulf, nusxa/o‘chirish, slayd tartibi, 8 px qadam va grid   |
| Tarix va saqlash | 50 undo/redo holati, atomar tool tahriri, IndexedDB autosave, reload’dan tiklash, JSON import/export                               |
| Dizayn           | 10 turli maket, preview/apply/undo, mazmun saqlanishi; algoritmik ekanligi ko‘rsatiladi                                            |
| Shablonlar       | Akademik/biznes/erkin/poster, 20 tagacha shaxsiy preset, yangi loyiha sifatida qayta ochish                                        |
| Vizual           | Jarayon bloklari va foydalanuvchi kiritgan sonlardan ustunli diagramma; skrinshotdan ochiq belgilangan qo‘lda tiklash              |
| Eksport          | Tahrirlanadigan PPTX XML/geometriya/qayd/rasm testi, brauzer PPTX va JSON download, 1920×1080 PNG, uch sahifali mazmunli PDF       |
| Namoyish         | Alohida editor boshqaruvlarisiz sahna, klaviatura, taymer, progress, qaydlar va lazer                                              |
| UI               | Uzbek Latin, responsive sidebar/chat, besh appearance mode, slayd ranglari o‘zgarmasligi, mobile overflow testi                    |
| Tahlil           | Qoidalar asosidagi sifat score va tushuntirish, SourceGuard’ning tekshirish talab qiladigan jumlalar evristikasi                   |
| AI himoyalari    | JWT, hajm/Zod/rate-limit, timeout, provider output/tool tekshiruvi, quota rezerv/refund; mock API testlari                         |
| SQL xavfsizligi  | PGlite’da barcha migratsiyalar, RLS, revision conflict, share revoke/expiry, bank approval idempotency, referral qualification/cap |
| Dependency       | `image-size` override 2.0.4’dan keyin eksport testlari o‘tdi; `npm audit` 0 vulnerabilities                                        |

## Kod/UI ulangan, tashqi xizmatda tekshirilmagan

- Supabase Google OAuth va account session; public frontend konfiguratsiya kerak.
- Qo‘lda cloud save/load, expected revision konflikti, mahalliy farqli nusxani saqlash. Real ikki qurilma sinovi bajarilmagan.
- Gemini chat, taqdimot yaratish, quiz, rewrite, tanlangan slayd qaydlari, himoya nutqi/savol/javob bahosi, butun deck tarjimasi preview bilan.
- Laziz ADMIN AI suhbat tarixi, rename/delete/new, retry/cancel va 11 typed tool capability. Takliflar foydalanuvchi tasdig‘idan so‘ng, context versiyasi tekshirilib qo‘llanadi.
- 15 bepul AI slayd, to‘langan balans, server-managed cheklanmagan admin, quota rezerv/yakun/refund va stranded reservation maintenance RPC.
- Private receipt upload, egaga/admin’ga signed URL, 750 UZS/slayd buyurtma, mustaqil bank tasdig‘i bilan admin approval, rejection reason, audit va duplicate bank reference himoyasi.
- Telegram receipt notification, secret header/chat/sender/admin mapping tekshiruvi va tasdiqlash/rad etish buyruqlari.
- 7 kunlik revoke qilinadigan read-only share snapshot; spiker qaydlari ulashilmaydi.
- Tasdiqlangan yangi account + birinchi muvaffaqiyatli generation’dan keyingi referral reward, self/cycle/duplicate himoyalari va lifetime cap.

Bu bo‘limdagi mahalliy SQL/mocked API testlarining o‘tishi hosted Supabase, Google, Gemini yoki Telegram muvaffaqiyatli ulanganini bildirmaydi. Haqiqiy kalit, account yoki credential qiymati kiritilmadi; haqiqiy pul/kredit amali bajarilmadi.

## Qisman amalga oshirilgan yoki mavjud bo‘lmagan imkoniyatlar

- Chat JSON javobini kutadi; streaming, Groq/OpenRouter fallback va to‘liq Russian/English UI lokalizatsiyasi yo‘q. AI natija tilini akademik bo‘limda tanlash mumkin.
- Tool registry hozir select/title/bullets/style/layout/theme/notes/visual/navigation/undo/redo bilan cheklangan; barcha master prompt tool’lari hali yo‘q.
- Quiz — 5 ta multiple-choice savol, score/retry/TXT export. Short-answer va difficulty UI yo‘q.
- Himoya — matnli mashq va AI feedback; audio recognition/recording va har slayd uchun batch speaker notes yo‘q.
- SourceGuard tashqi qidiruv/fakt tasdig‘i emas; maqola/DOI/manba yaratib bermaydi. Sifat score taxminiy font/density/contrast/overlap qoidalaridir, ilmiy yoki AI ekspert bahosi emas.
- Skrinshotdan haqiqiy multimodal layout extraction yo‘q; manual alternative bor. Vizual ustaxona uchun tashqi photo/icon katalogi yoki AI illustration provayderi yo‘q.
- Cloud sync qo‘lda; real-time collaboration, avtomatik cloud autosave va ko‘p tabdagi local conflict protokoli yo‘q.
- Element tahriri panel orqali; rich-text caret, ko‘p element selection va murakkab alignment guides yo‘q. Shrink-to-fit taxminiy.
- Optional phone auth yo‘q. Eski v0.7.x project import formati noma’lum; faqat yangi `schemaVersion:1` JSON qo‘llanadi.
- Telegram notification outbox/retry, virus skaneri, receipt retention siyosati, qat’iy global provider budget va kuchli referral anti-fraud hali kerak.
- PowerShell skriptlari yozilgan, ammo Linux’da bajarilmagan. PowerPoint/LibreOffice’da vizual render taqqoslanmagan.

## Bajarilgan tekshiruvlar

- `npm test`: **41 passed**, 5 test fayli; 0 failed/skipped.
- `npm run test:e2e`: **9 passed**, Chromium desktop va mobil viewport; 0 failed/skipped.
- `npm run build`: TypeScript va production Vite bundle muvaffaqiyatli.
- Saqlanadigan install script qayta bajarildi: frozen `npm ci` va build muvaffaqiyatli.
- `wrangler pages functions build`: Worker bundle muvaffaqiyatli.
- Wrangler Pages dev’da `/` → 200, `GET /api/ai` → 405; konfiguratsiyasiz AI/payments/Telegram → aniq 503. Bu tashqi integratsiya testi emas.
- PDF `pdftotext` bilan o‘qildi: uch slayd matni mavjud; `pdfinfo`: 3 sahifa, 960×540 pt.
- `npm audit`: **0 vulnerabilities** (tekshiruv sanasida).

## Cloud muhit konfiguratsiyasi

Draft saqlandi: to‘liq `install_script`, `start_skill`, Supabase public URL/key requirement nomlari va `GEMINI_API_KEY` secret talabi. Gemini uchun `generativelanguage.googleapis.com` domeni qo‘shildi. Kalit qiymatlari kiritilmadi. Supabase’ning aniq hostname’i noma’lumligi sababli service-role secret destination’i va shu domen allowlist’i hali sozlanmagan; wildcard o‘ylab topilmadi.

Draft saqlash runtime qiymatlarini qo‘llamaydi yoki muhitni publish qilmaydi. Environment settings’da ko‘rib chiqish, saqlash va publish alohida foydalanuvchi amali. Yangi task’da snapshot restoration hali tekshirilmagan. Kod GitHub’dagi `feat/slidecraft-ultimate` branchida saqlangan; uni Git yoki GitHub’ning Download ZIP funksiyasi orqali olish mumkin.

## Davom ettirish uchun aniq tartib

1. Source arxivini yoki working tree’ni saqlang. Yangi development Supabase loyiha URL’i va public konfiguratsiyasini kiriting; yangi bazada 001–004 migratsiyalarni qo‘llang.
2. Service-role, Gemini va zarur bo‘lsa Telegram secretlarini faqat secure settings’da kiriting. Muhit uchun aniq Supabase domeniga chiqishni ruxsat eting.
3. Build’ni yangilang, Functions serverini ishga tushiring va Google, ikki foydalanuvchili RLS/cloud/share, real Gemini va test account’li payment/referral oqimlarini staging’da tekshiring.
4. Stale reservation scheduler, anti-fraud, receipt siyosati, telemetry va global budget’ni production’dan oldin yakunlang.
5. Yuqoridagi qisman funksiyalarni bittadan test bilan tugating. Preview tayyorlash uchun DEPLOYMENT.md’dan foydalaning. Production deploy uchun alohida ruxsat oling.
