# Preview va qaytarish

Hozircha hech qanday deploy, bank operatsiyasi yoki production migratsiyasi bajarilmagan. Foydalanuvchining alohida so‘rovi bilan kod GitHub’dagi `Slayer0205/Slayd-PPTX` repozitoriysining `feat/slidecraft-ultimate` development branchiga yuborilgan. `main` branchiga push bajarilmagan. Boshlang‘ich bo‘sh checkout zaxirasi `/workspace/slidecraft-audit/before-implementation.tar.gz`da. Eski production loyiha o‘zgarmagan.

## Preview tayyorlash

1. Yangi development Supabase baza va to‘rtta migratsiya; kerakli Google OAuth redirectlar.
2. Cloudflare Pages preview build env’da public Vite konfiguratsiya. Functions Secrets’da server Supabase/service-role, Gemini va ixtiyoriy Telegram sozlamalari. `.dev.vars` faqat mahalliy development uchun; uni upload yoki commit qilmang.
3. `wrangler.toml` Rate Limit bindinglari va `public/_headers` CSP’sini staging’da tekshiring. Supabase custom domen bo‘lsa CSP’ni moslang.
4. Admin hisobini operator tasdiqlasin. Telegram kerak bo‘lsa admin mapping va secret webhook’ni sozlang. `PAYMENT_INSTRUCTIONS`ga faqat ommaga beriladigan to‘g‘ri rekvizitlarni kiriting.
5. `release_stale_generations()`ni ishonchli scheduler bilan davriy bajaring. Scheduler key/credential’ini frontendga bermang.
6. Mahalliy tekshiring:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npx.cmd wrangler pages functions build --outdir .wrangler/functions-build
```

Windows uchun `scripts/preview-deploy.ps1` standart holatda faqat tekshiradi. **Preview’ni yuklashga qaror qilsangiz** `scripts/preview-deploy.ps1 -Upload`:

```powershell
npx.cmd wrangler pages deploy dist --project-name slidecraft-ai-beta-uz --branch v07-preview
```

Bu buyruq shu task’da bajarilmagan. Cloudflare project nomi foydalanuvchi bergan mavjud nom; preview’ni production sifatida belgilamang. Publish qilingan eski tijoriy backendga ushbu yangi loyihaning migratsiyalarini avtomatik qo‘llamang.

## Preview’da tashqi xizmatlarni sinash

- Yangi va qaytgan Google hisoblari; redirect joriy origin’ga qaytishi.
- 15 bepul slayd, insufficient quota, provider xatosidagi refund, privileged admin.
- Ikki qurilmada cloud project va stale revision konflikti; mahalliy kontent saqlanishi.
- Real Gemini chat, tool proposal/apply/undo, deck, tarjima, quiz va defense.
- Private receipt upload, signed URL, boshqa account’dan denial, admin bank confirm/reject reason va duplicate reference.
- Telegram secret, noto‘g‘ri chat/sender, mapping, notification va takroriy review.
- Share revoke/expiry, referral claim/qualify/cap; bu sinovlar uchun haqiqiy pul yoki production kreditlari ishlatilmasin.

## Rollback

- Frontend/Functions: Cloudflare dashboard’dan avvalgi **ma’lum ishlaydigan** deployment’ni tanlang; real deployment ID bu task’da yaratilmagan.
- Baza: migratsiyalarni ko‘r-ko‘rona teskari ishlatmang, jadval yoki foydalanuvchi ma’lumotlarini o‘chirmang. Staging backup yoki audit qilingan additive tuzatish qo‘llang. Muammo bo‘lsa preview trafikni to‘xtating; production’da alohida operator qarori kerak.
- Mahalliy ish: JSON backup’ni import qiling yoki avvalgi Git holatini **alohida katalogga** tiklang. Boshlang‘ich tar zaxirasi loyiha hali bo‘sh bo‘lgan holatni saqlaydi; uni yangi kod ustiga ko‘r-ko‘rona yozmang.
- Kalit sizib chiqsa xizmatdagi kalitni almashtiring va faqat tegishli server secretini yangilang; credential’ni log/chatga chiqarmang.

Production deploy faqat foydalanuvchining alohida ruxsatidan so‘ng. Hozirgi test natijalari deployment yoki yangi cloud task’dagi restoration tasdig‘i emas.
