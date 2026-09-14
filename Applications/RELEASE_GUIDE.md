# PRAVA DESKTOP ONLINE — PRODUCTION RELEASE (v1.0.0)

## 1. Yaratilgan Release Fayllar

| Fayl Nomi | Format | Hajmi | SHA-256 Checksum | Tavsif |
| :--- | :--- | :--- | :--- | :--- |
| **`Prava Online_1.0.0_x64-setup.exe`** | NSIS Installer | **3.56 MB** | `4EEC36216B71A9195C3A8E4BA48E95B19DFC67B0E20A81C98FC6B6FD9F37988B` | Windows uchun qulay o'rnatuvchi (Desktop yorlig'i, Start Menu va uninstaller bilan) |
| **`Prava Online_1.0.0_x64_en-US.msi`** | WiX MSI | **4.68 MB** | `34A8BECE80A0C05597F937AFAB74693DF7F159D04D640CBAD4C5F09E4BD240EA` | Korporativ tarqatish va avtomatlashtirilgan o'rnatishlar uchun Windows Installer |
| **`prava-desktop-online.exe`** | Portable Executable | **10.68 MB** | `989AE0E6FB5650476AFE988ABCF4FA7DEF295C36AB0F97709BE4E17988E7028F` | O'rnatishsiz to'g'ridan-to'g'ri ishga tushuvchi portativ dastur |
| **`Prava-Online-Portable_1.0.0_x64.exe`** | Portable Executable | **10.68 MB** | `989AE0E6FB5650476AFE988ABCF4FA7DEF295C36AB0F97709BE4E17988E7028F` | Portativ dasturning muqobil nusxasi |

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
