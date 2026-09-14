# PRAVA DESKTOP ONLINE — PRODUCTION RELEASE (v1.0.0)

## 1. Yaratilgan Release Fayllar

| Fayl Nomi | Format | Hajmi | SHA-256 Checksum | Tavsif |
| :--- | :--- | :--- | :--- | :--- |
| **`Prava Online_1.0.0_x64-setup.exe`** | NSIS Installer | **3.57 MB** | `BEA82998076742FE19B0311CFD62AC7BD95EB03935D7F40559DE6D27792416F7` | Windows uchun qulay o'rnatuvchi (Desktop yorlig'i, Start Menu va uninstaller bilan) |
| **`Prava Online_1.0.0_x64_en-US.msi`** | WiX MSI | **4.69 MB** | `18681BF469961E5E2AE77550FF6E321A5C98F2AFF4D2B700872ADD7694CD5B06` | Korporativ tarqatish va avtomatlashtirilgan o'rnatishlar uchun Windows Installer |
| **`prava-desktop-online.exe`** | Standalone Executable | **10.69 MB** | `C29202081224413A690B9F579FAC3E1264AE381B6BDB49F8A487398008F8ED49` | O'rnatishsiz to'g'ridan-to'g'ri ishga tushuvchi portativ dastur |
| **`Prava-Online-Portable_1.0.0_x64.exe`** | Portable Executable | **10.69 MB** | `C29202081224413A690B9F579FAC3E1264AE381B6BDB49F8A487398008F8ED49` | Portativ dasturning muqobil nusxasi |
| **`Prava-Online-Portable_1.0.0_x64.zip`** | Portable ZIP Archive | **4.35 MB** | `FB4B866A45FABAB2470F343435BE68C7DAA717D50AC9D0C1DF8F8739EC263C05` | Siqilgan ko'chma dastur arxiv to'plami |

---

## 2. Online / Offline Rejim Tizimining Yangi Arxitekturasi (Hardening)

1. **Internet Aloqasi va Ilova Ish Rejimining Qat'iy Ajratilishi**:
   - **Internet Connectivity** (`CONNECTED` | `DISCONNECTED` | `UNKNOWN`): Fizik tarmoq simi yoki Wi-Fi holati.
   - **Application Work Mode** (`AUTO` | `ONLINE` | `OFFLINE`): Foydalanuvchining qat'iy irodasi va tanlovi.
   - **Arxitektura Invarianti**: Agar foydalanuvchi **OFFLINE** rejimni tanlagan bo'lsa, hatto internet tarmog'i fizik tiklansa ham (OS `online` hodisasi yuz berganda), dastur **OFFLINE** rejimida qoladi! Tarmoq kelishi foydalanuvchi tanlovini aslo bekor qilmaydi.
   - Tanlangan rejim `localStorage` (`prava_network_mode`) orqali doimiy saqlanadi va dastur qayta yoqilganda (restart/reload) ham saqlanib qoladi.

2. **Katta Apelsin Bannerni Butunlay Yo'qotish (Zero Screen Blocking)**:
   - Dashboard va imtihon sahifalaridagi katta, xunuk va kontentni pastga suruvchi apelsin (orange) banner to'liq olib tashlandi.
   - Ekranning barcha qismi o'quv jarayoni va test topshirish uchun 100% toza va qulay holatga keltirildi.

3. **Yangi Ixcham va Zamonaviy Header Rejim Selektori (`NetworkModeSelector`)**:
   - Dashboard (`/me`), sahifalar paneli (`User_Header`) va Imtihon paneli (`QuizNav`) yuqori o'ng burchagida ixcham pill tugma:
     - `⚡ Avto` (Ulangan paytda och yashil / Uzilgan paytda kulrang)
     - `☁ Onlayn` (Ulangan paytda och ko'k / Aloqa yo'q paytda qizil)
     - `◉ Oflayn` (Qat'iy oflayn tanlanganda to'q sariq/amber)
     - Agar zaxirada jo'natilmagan amallar bo'lsa: tugma ustida ixcham doiraviy hisoblagich `(• 3)`.
   - Ochiluvchi zamonaviy menyuda:
     - Tarmoq kechikishi (`latency: 24 ms` yoki `Aloqa yo'q`)
     - Rejimni tanlash (Avtomatik, Qat'iy Onlayn, Qat'iy Oflayn)
     - Qo'lda "Hozir sinxronlash" tugmasi va oxirgi muvaffaqiyatli sinxronlangan vaqt.

4. **100% Local-First SQLite & Oflayn Ma'lumotlar Butunligi**:
   - `OFFLINE` rejimida serverga barcha so'rovlar, foniy pinglar va heartbeat tekshiruvlari to'xtatiladi.
   - Barcha imtihonlar, saqlangan savollar va noto'g'ri javoblar mahalliy bazada 0 ms kechikish bilan saqlanadi va outboxga yoziladi.
   - Onlayn yoki Avto rejimga o'tilganda ma'lumotlar avtomatik ravishda serverga sinxronlanadi.

5. **Avtomatlashtirilgan Testlar (46/46 Test Muvaffaqiyatli)**:
   - `tests/networkModeArchitecture.test.ts` orqali 7 ta yangi arxitektura invarianti to'liq tekshirildi.
   - `tests/failureScenarios.test.ts` (18 ta xaos testi), `tests/syncEngine.test.ts`, `tests/conflictResolver.test.ts`, `tests/multiAccountStorage.test.ts` testlari 100% PASS qildi.
