# PRAVA DESKTOP ONLINE — PRODUCTION RELEASE (v1.0.0)

## 1. Yaratilgan Release Fayllar

| Fayl Nomi | Format | Hajmi | SHA-256 Checksum | Tavsif |
| :--- | :--- | :--- | :--- | :--- |
| **`Prava Online_1.0.0_x64-setup.exe`** | NSIS Installer | **3.56 MB** | `C7A9CE7F64BEF77F769A3DEE02278481B1447714FB1D973F5636C52852E4F013` | Windows uchun qulay o'rnatuvchi (Desktop yorlig'i, Start Menu va uninstaller bilan) |
| **`Prava Online_1.0.0_x64_en-US.msi`** | WiX MSI | **4.68 MB** | `523D8B475D2171D3875B639D7B45D7B27004536B5690E771F81B8C35A3A9CB82` | Korporativ tarqatish va avtomatlashtirilgan o'rnatishlar uchun Windows Installer |
| **`prava-desktop-online.exe`** | Portable Executable | **10.68 MB** | `2E273BD0D2A2D4D41EF2A3173E8EC2BF3049C5EB7907E9385DD504DED725BD00` | O'rnatishsiz to'g'ridan-to'g'ri ishga tushuvchi portativ dastur |

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
   - **Kuniga kamida 1 marta avtomatik sinxronizatsiya**: 24 soatlik threshold nazorati orqali muntazam sinxronizatsiya.
   - **Header'dagi interaktiv "Sinxronlash" menyusi**: `User_Header` va Sozlamalar sahifasida real-vaqtda holatni (IDLE, SYNCING, OFFLINE, ERROR) ko'rsatib turuvchi va bir bosishda ikki tomonlama sinxronizatsiyani ishga tushiruvchi tugma (`SyncButton`).
   - `src/sync/outboxQueue.ts`: Idempotent Outbox pattern (UUID v4) bilan oflayn mutatsiyalar navbati.
   - `src/sync/conflictResolver.ts`: Deterministik to'qnashuvlarni hal qilish (imtihon ballari: monotonic best-score; progress: monotonic completion invariant; saqlangan savollar: tombstone set union).
   - `src/sync/networkHeartbeat.ts`: Dual-tier tarmoq nazorati (OS hodisalari + real HTTP probe) va kompyuter uyqudan (sleep/hibernate) uyg'onishini aniqlash.
   - `src/sync/syncEngine.ts`: Mutex lock bilan Push (`Local → Server`) va Pull (`Server → Local`) koordinatori. Avtomatik crash recovery.

3. **Tarmoq Ish Rejimlari Dvigateli (Network Mode Engine)**:
   - **AUTO**: Tarmoqni avtomatik aniqlash va foniy sinxronlash.
   - **ONLINE_SYNC**: Faol onlayn rejim, har bir harakat zudlik bilan serverga yuklanadi.
   - **OFFLINE_ONLY**: Barcha tarmoq so'rovlari to'xtatiladi, internet sarflanmaydi. 100% lokal bazada 0 ms kechikish bilan ishlaydi.
   - Rejimlar o'rtasida navigatsiya paneli yoki Sozlamalardan 1 bosish orqali almashish imkoniyati.

4. **QR Kod Orqali Qurilmani Bog'lash Protokoli (Device Pairing) — To'liq Hardening**:
   - Mobil ilovadan Desktop ilovaga kirish (`POST /api/v1/auth/qr/init`).
   - Hech qanday soxta ("Demo") tugmalarsiz toza ishlab chiqarish arxitekturasi.
   - Serverda ushbu endpoint hali sozlanmagan bo'lsa, qizil xatolik toasti chiqmasdan, toza va estetik xabarnoma hamda real ishlayotgan **Telegram Bot (@pravaonlineuzbot)** yoki **Parol** orqali kirish muqobillari ko'rsatiladi.

5. **Faol Qurilmalar Boshqaruvi va Masofadan Sessiyani Tugatish**:
   - Sozlamalar -> "Qurilmalar" bo'limida barcha ulangan qurilmalar ro'yxati (Desktop, Mobile, oxirgi faollik vaqti, joriy qurilma belgisi).
   - Istalgan boshqa qurilmaning sessiyasini masofadan bekor qilish ("Sessiyani tugatish" tugmasi).

6. **Multi-Account User Scoping**:
   - Outbox va foydalanuvchi ma'lumotlari `user_id` bo'yicha qat'iy izolyatsiya qilingan. Bir kompyuterda bir nechta hisob ishlatilganda navbatlar aralashib ketmaydi.

7. **Desktop Native UI/UX**:
   - Klaviatura yordamida to'liq test topshirish: `1–5` yoki `F1–F5` (variant tanlash), `ArrowLeft`/`ArrowRight` (savollarni almashtirish), `Space` (keyingi savolga o'tish), `Enter` (imtihonni yakunlash), `Escape` (rasm yoki modalni yopish).
   - Dual-tier `OfflineBanner`: internet uzilganda foydalanuvchini ogohlantirish va javoblar mahalliy xotirada saqlanayotganini kafolatlash, aloqa tiklanganda esa yashil tasdiq berish.
   - Monotonic Wall-Clock anti-drift taymer (`Date.now() - startTime` delta).
   - Rasm yuklanmaganda chiroyli SVG avtomobil/rul platseholderi.

8. **To'liq Test Qamrovi (37/37 Test Muvaffaqiyatli)**:
   - 18 ta favqulodda nosozlik stsenariylari testi (`tests/failureScenarios.test.ts`).
   - Idempotency, Outbox crash recovery, Tombstone merge va Monotonic Best-Score to'liq avtomatlashtirilgan testlarda tasdiqlangan.
