# PRAVA DESKTOP ONLINE — PRODUCTION RELEASE (v1.0.0)

## 1. Yaratilgan Release Fayllar

| Fayl Nomi | Format | Hajmi | SHA-256 Checksum | Tavsif |
| :--- | :--- | :--- | :--- | :--- |
| **`Prava Online_1.0.0_x64-setup.exe`** | NSIS Installer | **3.72 MB** | `60ED611628EA487668B0FD04F2C06C040AE7DBC49306A402D449F6DD9E2D5967` | Windows uchun qulay o'rnatuvchi (Desktop yorlig'i, Start Menu va uninstaller bilan) |
| **`Prava Online_1.0.0_x64_en-US.msi`** | WiX MSI | **4.90 MB** | `3932D56A52902D79E4C2E7AED5D496AD6DEBC2E5C02776FC04A013F9EF929219` | Korporativ tarqatish va avtomatlashtirilgan o'rnatishlar uchun Windows Installer |
| **`prava-desktop-online.exe`** | Portable Executable | **11.18 MB** | `089A457E664578F6CC88CB06960284FC34898CA233FEFDD585696D427188307A` | O'rnatishsiz to'g'ridan-to'g'ri ishga tushuvchi portativ dastur |

---

## 2. Ishlab Chiqilgan Arxitektura va Imkoniyatlar

1. **Private Desktop Formati**:
   - Hech qanday marketing landing, blog, haqimizda sahifalar mavjud emas.
   - Root (`/`) to'g'ridan-to'g'ri foydalanuvchi kabinetiga (`/me`) yoki kirish sahifasiga (`/auth/login`) yo'naltiradi.
   - Foydalanuvchi uchun faqat o'quv va imtihon tizimi to'liq mavjud: Biletlar, Mavzular, Marafon, Rasmiy Imtihon, Noto'g'ri javoblar, Saqlanganlar, Statistika, Reyting, Tarix va Sozlamalar.

2. **100% Offline-First Layer & Ikki Tomonlama Sinxronizatsiya (Local ↔ Server)**:
   - **Lokal baza birlamchi haqiqat manbai**: Internet umuman yo'q bo'lsa ham dastur to'liq ishlaydi. 60 ta bilet (1200 ta savol) va 24 ta mavzu avtomatik preloaded offline seed dataset bilan ta'minlangan.
   - `src/database/schema.ts` va `src/database/dbClient.ts`: Native SQLite / IndexedDB v2 bilan `questions`, `topics`, `tickets`, `exam_sessions`, `user_progress`, `saved_questions`, `wrong_answers`, `sync_queue`, `sync_meta`.
   - `src/sync/outboxQueue.ts`: Idempotent Outbox pattern (UUID v4) bilan oflayn mutatsiyalar navbati.
   - `src/sync/conflictResolver.ts`: Deterministik to'qnashuvlarni hal qilish (imtihon ballari: monotonic best-score; progress: timestamp LWW; saqlangan savollar: tombstone set union).
   - `src/sync/networkHeartbeat.ts`: Dual-tier tarmoq nazorati (OS hodisalari + real HTTP probe) va kompyuter uyqudan (sleep/hibernate) uyg'onishini aniqlash.
   - `src/sync/syncEngine.ts`: Mutex lock bilan Push (`Local → Server`) va Pull (`Server → Local`) koordinatori. Avtomatik crash recovery (chala qolgan `IN_FLIGHT` so'rovlarni `PENDING`ga qaytarish).
   - Sozlamalar sahifasida real-vaqt sinxronizatsiya ko'rsatkichlari (lokal savollar soni, kutayotgan outbox mutatsiyalari, oxirgi muvaffaqiyatli sinxronizatsiya vaqti va qo'lda "Hozir sinxronlash" tugmasi).

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
