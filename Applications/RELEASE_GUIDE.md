# PRAVA DESKTOP ONLINE — PRODUCTION RELEASE (v1.0.0)

## 1. Yaratilgan Release Fayllar

| Fayl Nomi | Format | Hajmi | SHA-256 Checksum | Tavsif |
| :--- | :--- | :--- | :--- | :--- |
| **`Prava Online_1.0.0_x64-setup.exe`** | NSIS Installer | **3.55 MB** | `0D4A7D5F4EE779E2054D817E06ED1F78FEA702B6EF0B1BA82FF7998564C7A459` | Windows uchun qulay o'rnatuvchi (Desktop yorlig'i, Start Menu va uninstaller bilan) |
| **`Prava Online_1.0.0_x64_en-US.msi`** | WiX MSI | **4.67 MB** | `A6AD3323F6E89652B523E34C4E065D1EF6B9D5E972304E8AED66679C0768B8FB` | Korporativ tarqatish va avtomatlashtirilgan o'rnatishlar uchun Windows Installer |
| **`prava-desktop-online.exe`** | Portable Executable | **10.67 MB** | `1CD98089D209FCC92B9F3AB3028B8D8CFCB8D650E621AA7CC9E3E4A8E6DEB20D` | O'rnatishsiz to'g'ridan-to'g'ri ishga tushuvchi portativ dastur |

---

## 2. Ishlab Chiqilgan Arxitektura va Imkoniyatlar

1. **Private Desktop Formati**:
   - Hech qanday marketing landing, blog, haqimizda sahifalar mavjud emas.
   - Root (`/`) to'g'ridan-to'g'ri foydalanuvchi kabinetiga (`/me`) yoki kirish sahifasiga (`/auth/login`) yo'naltiradi.
   - Foydalanuvchi uchun faqat o'quv va imtihon tizimi to'liq mavjud: Biletlar, Mavzular, Marafon, Rasmiy Imtihon, Noto'g'ri javoblar, Saqlanganlar, Statistika, Reyting, Tarix va Sozlamalar.

2. **100% Pure Local-First Layer & Ikki Tomonlama Sinxronizatsiya (Local ↔ Server)**:
   - **Kodda 0 ta hardcode qilingan savol (Rule #4 ga 100% muvofiq)**: Kod bazasida va bundle'da hech qanday mock yoki qotirilgan savollar massivi yo'q. Barcha savollar serverdan olinadi va mahalliy SQLite/IndexedDB bazasida saqlanadi.
   - **Repository Pattern qatlami**: `src/database/repositories/` orqali to'g'ridan-to'g'ri mahalliy bazaga ulanish (`questionRepository`, `ticketRepository`, `topicRepository`, `outboxRepository`).
   - **Boshlang'ich foniy sinxronizatsiya (Initial Sync)**: Dastur birinchi marta ochilganda yoki mahalliy baza bo'sh bo'lganda, `SyncEngine` serverdan savollarni fon rejimida batch (paketli) usulda yuklab oladi va tranzaksiyada saqlaydi.
   - **Header'dagi maxsus "Yangilash" tugmasi**: `User_Header` va Sozlamalar sahifasida real-vaqtda holatni (IDLE, SYNCING, OFFLINE, ERROR) ko'rsatib turuvchi va bir bosishda ikki tomonlama sinxronizatsiyani ishga tushiruvchi tugma (`SyncButton`).
   - `src/sync/outboxQueue.ts`: Idempotent Outbox pattern (UUID v4) bilan oflayn mutatsiyalar navbati.
   - `src/sync/conflictResolver.ts`: Deterministik to'qnashuvlarni hal qilish (imtihon ballari: monotonic best-score; progress: timestamp LWW; saqlangan savollar: tombstone set union).
   - `src/sync/networkHeartbeat.ts`: Dual-tier tarmoq nazorati (OS hodisalari + real HTTP probe) va kompyuter uyqudan (sleep/hibernate) uyg'onishini aniqlash.
   - `src/sync/syncEngine.ts`: Mutex lock bilan Push (`Local → Server`) va Pull (`Server → Local`) koordinatori. Avtomatik crash recovery.
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
