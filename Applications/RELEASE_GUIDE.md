# PRAVA DESKTOP ONLINE — PRODUCTION RELEASE (v1.0.0)

## 1. Yaratilgan Release Fayllar

| Fayl Nomi | Format | Hajmi | SHA-256 Checksum | Tavsif |
| :--- | :--- | :--- | :--- | :--- |
| **`Prava Online_1.0.0_x64-setup.exe`** | NSIS Installer | **3.71 MB** | `996B03B2407C43845F60C2EA02F2252638D89FE1F4B5A71C63F1909EEF3E2238` | Windows uchun qulay o'rnatuvchi (Desktop yorlig'i, Start Menu va uninstaller bilan) |
| **`Prava Online_1.0.0_x64_en-US.msi`** | WiX MSI | **4.88 MB** | `2723E46E9AAB4B06EFF52359C319A32353868CB9D66A043FEF4E015B1700DF48` | Korporativ tarqatish va avtomatlashtirilgan o'rnatishlar uchun Windows Installer |
| **`prava-desktop-online.exe`** | Portable Executable | **11.18 MB** | `17B371C714A65F908A53CCDA62D311F64D6BC0FAD8979443975C07D5A7C4028A` | O'rnatishsiz to'g'ridan-to'g'ri ishga tushuvchi portativ dastur |

---

## 2. Ishlab Chiqilgan Arxitektura va Imkoniyatlar

1. **Private Desktop Formati**:
   - Hech qanday marketing landing, blog, haqimizda sahifalar mavjud emas.
   - Root (`/`) to'g'ridan-to'g'ri foydalanuvchi kabinetiga (`/me`) yoki kirish sahifasiga (`/auth/login`) yo'naltiradi.
   - Foydalanuvchi uchun faqat o'quv va imtihon tizimi to'liq mavjud: Biletlar, Mavzular, Marafon, Rasmiy Imtihon, Noto'g'ri javoblar, Saqlanganlar, Statistika, Reyting, Tarix va Sozlamalar.

2. **Offline-First Layer & Sinxronizatsiya**:
   - `src/database/schema.ts` va `src/database/dbClient.ts`: Crash-safe mahalliy xotira (savollar, biletlar, mavzular, faol imtihon sessiyalari, foydalanuvchi natijalari, xatolar).
   - `src/sync/outboxQueue.ts`: Idempotent Outbox pattern (UUID v4) bilan oflayn mutatsiyalar navbati.
   - `src/sync/conflictResolver.ts`: Deterministik to'qnashuvlarni hal qilish (imtihon ballari: monotonic best-score; progress: timestamp LWW; saqlangan savollar: tombstone set union).
   - `src/sync/networkHeartbeat.ts`: Dual-tier tarmoq nazorati (OS hodisalari + real HTTP probe) va kompyuter uyqudan (sleep/hibernate) uyg'onishini aniqlash.
   - `src/sync/syncEngine.ts`: Orqa fonda avtomatik sinxronizatsiya qiluvchi eksponensial backoff mexanizmi.

3. **Autentifikatsiya va Xavfsizlik**:
   - Telefon raqam + parol orqali kirish va ro'yxatdan o'tish.
   - Google OAuth 2.0 (alohida xavfsiz desktop oynasi va bir martalik atomik signal orqali).
   - Telegram Bot (`@PravaOnlineBot`) orqali xavfsiz deep link va login kodi orqali kirish.
   - Multi-Account Manager: bir nechta hisoblar o'rtasida xavfsiz almashish imkoniyati.
   - Proactive Token Refresh: access token muddati tugashidan 5 daqiqa oldin foniy yangilanadi.

4. **Desktop Native UI/UX**:
   - Klaviatura yordamida to'liq test topshirish: `1–5` yoki `F1–F5` (variant tanlash), `ArrowLeft`/`ArrowRight` (savollarni almashtirish), `Space` (keyingi savolga o'tish), `Enter` (imtihonni yakunlash), `Escape` (rasm yoki modalni yopish).
   - Dual-tier `OfflineBanner`: internet uzilganda foydalanuvchini ogohlantirish va javoblar mahalliy xotirada saqlanayotganini kafolatlash, aloqa tiklanganda esa yashil tasdiq berish.
   - Bildirishnomalar duplikatsiyasi oldi olingan (global deduplication cache).
