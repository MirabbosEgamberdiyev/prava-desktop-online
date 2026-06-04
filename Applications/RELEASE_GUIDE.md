# Prava Online — Reliz yaratish bo'yicha to'liq qo'llanma

---

## I. EXE FAYL YARATISH (Build qilish)

### Talablar

Kompyuteringizda quyidagilar o'rnatilgan bo'lishi kerak:

| Dastur | Versiya | Tekshirish buyrug'i |
|--------|---------|---------------------|
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **Rust** | 1.70+ | `rustc --version` |
| **Cargo** | 1.70+ | `cargo --version` |

> Windows uchun: Visual Studio Build Tools (C++ desktop development) ham kerak.

### Qadam 1: Loyihani oching

```bash
cd C:\Users\mirabbos.egamberdiye\Desktop\PRAVA-ONLINE\Prava-desktop-online
```

### Qadam 2: Bog'liqliklarni o'rnating (birinchi marta)

```bash
npm install
```

### Qadam 3: EXE yarating

```bash
npx tauri build
```

> Bu buyruq 2-5 daqiqa davom etadi. U quyidagilarni bajaradi:
> 1. TypeScript → JavaScript kompilyatsiya
> 2. Vite bilan frontend build
> 3. Rust backend kompilyatsiya (release mode)
> 4. Windows installer yaratish (NSIS + MSI)

### Qadam 4: Tayyor fayllar

Build tugagandan keyin fayllar quyidagi joylarda paydo bo'ladi:

```
src-tauri/target/release/bundle/
  nsis/
    Prava Online_1.0.0_x64-setup.exe    ← BU FAYLNI YUKLANG (4.2 MB)
  msi/
    Prava Online_1.0.0_x64_en-US.msi    ← Alternativ installer (5.5 MB)
```

| Fayl | Hajmi | Qachon ishlatish |
|------|-------|-----------------|
| **..._x64-setup.exe** | ~4.2 MB | Asosiy installer (NSIS) — foydalanuvchilarga shu bering |
| **..._x64_en-US.msi** | ~5.5 MB | Korporativ muhit uchun (GPO orqali o'rnatish) |

### Qadam 5: Versiyani oshirish (keyingi reliz uchun)

3 ta faylda versiyani o'zgartiring:

| Fayl | Qator | O'zgartirish |
|------|-------|-------------|
| `package.json` | `"version": "1.0.0"` | `"version": "1.1.0"` |
| `src-tauri/tauri.conf.json` | `"version": "1.0.0"` | `"version": "1.1.0"` |
| `src-tauri/Cargo.toml` | `version = "1.0.0"` | `version = "1.1.0"` |

Keyin yana `npx tauri build` buyrug'ini bering.

---

## II. ADMIN PANELDA RELIZ QO'SHISH

### 1. Kirish

1. **admin.pravaonline.uz** saytiga kiring
2. Super Admin yoki Admin hisobi bilan tizimga kiring
3. Chap menyudan **"Ilovalar"** bo'limini tanlang

### 2. "Yangi reliz" tugmasini bosing

### 3. Formani to'ldiring

#### 3.1. Ilova turi

| Turi | Qachon tanlash kerak |
|------|---------------------|
| **Offline** | Internetsiz ishlaydigan dastur (Prava Desktop — lokal SQLite) |
| **Online** | Internet kerak bo'lgan dastur (Prava Online — server API) |

#### 3.2. Ilova nomi va versiya

| Maydon | Misol | Izoh |
|--------|-------|------|
| **Ilova nomi** | `Prava Online` yoki `Prava Offline` | Foydalanuvchilarga ko'rinadigan nom |
| **Versiya** | `1.0.0` | Semantic versioning: MAJOR.MINOR.PATCH |

**Versiya qoidalari:**
- `1.0.0` — Birinchi reliz
- `1.0.1` — Kichik xato tuzatish (bug fix)
- `1.1.0` — Yangi funksiya qo'shildi
- `2.0.0` — Katta o'zgarish (breaking change)

#### 3.3. Installer fayl

Faylni tanlang yoki drag-and-drop qiling:

| Format | Platforma | Tavsif |
|--------|-----------|--------|
| `.exe` | Windows | NSIS installer (asosiy) |
| `.msi` | Windows | MSI paket (korporativ) |
| `.deb` | Linux | Debian/Ubuntu uchun |
| `.rpm` | Linux | Fedora/RHEL uchun |
| `.AppImage` | Linux | Portativ |
| `.dmg` | macOS | macOS disk image |
| `.pkg` | macOS | macOS paket |

> Platforma fayl kengaytmasidan avtomatik aniqlanadi!

#### 3.4. Yangiliklar (Release Notes) — 4 ta tilda MAJBURIY

Har bir tilda alohida Textarea maydonini to'ldiring. Hammasi majburiy!

**Yaxshi release notes yozish qoidalari:**
- Qisqa va aniq yozing (3-7 punkt)
- Har bir punktni yangi qatordan boshlang
- Muhim o'zgarishlarni birinchi yozing
- Texnik tafsilotlar emas, foydalanuvchi uchun tushunarli tilda yozing

### 4. Faollashtirish

- **"Faollashtirish"** yoqilsa — reliz darhol foydalanuvchilarga ko'rinadi
- O'chirilsa — DRAFT holatida qoladi (faqat admin ko'radi)

### 5. "Yaratish" tugmasini bosing

---

## III. TAYYOR RELEASE NOTES — NUSXA OLIB QO'YING

### Prava Online v1.0.0 (Online versiya)

**O'zbekcha (lotin):**
```
Prava Online v1.0.0 — haydovchilik guvohnomasi imtihoniga tayyorlanish uchun rasmiy desktop ilova!

Imkoniyatlar:
- Server bilan sinxronlash — barcha ma'lumotlar bulutda saqlanadi
- Login va ro'yxatdan o'tish tizimi — hisobingiz har qanday qurilmada ishlaydi
- 4 ta tilda to'liq interfeys: o'zbekcha (lotin), o'zbekcha (kirill), ruscha, inglizcha
- Mavzular bo'yicha mashq — har bir mavzuni alohida o'rganing
- Biletlar rejimi — haqiqiy imtihondagi kabi 20 ta savol
- Marafon rejimi — barcha savollarni ketma-ket yechish
- Imtihon statistikasi — to'g'ri/noto'g'ri javoblar tahlili
- Xato javoblar bo'limi — faqat xato qilgan savollaringizni qayta yechish
- Saqlangan savollar — muhim savollarni belgilab qo'yish
- Windows uchun yengil va tez ishlaydigan dastur (4 MB)
```

**Ўзбекча (кирилл):**
```
Prava Online v1.0.0 — ҳайдовчилик гувоҳномаси имтиҳонига тайёрланиш учун расмий десктоп илова!

Имкониятлар:
- Сервер билан синхронлаш — барча маълумотлар булутда сақланади
- Логин ва рўйхатдан ўтиш тизими — ҳисобингиз ҳар қандай қурилмада ишлайди
- 4 та тилда тўлиқ интерфейс: ўзбекча (лотин), ўзбекча (кирилл), русча, инглизча
- Мавзулар бўйича машқ — ҳар бир мавзуни алоҳида ўрганинг
- Билетлар режими — ҳақиқий имтиҳондаги каби 20 та савол
- Марафон режими — барча саволларни кетма-кет ечиш
- Имтиҳон статистикаси — тўғри/нотўғри жавоблар таҳлили
- Хато жавоблар бўлими — фақат хато қилган саволларингизни қайта ечиш
- Сақланган саволлар — муҳим саволларни белгилаб қўйиш
- Windows учун енгил ва тез ишлайдиган дастур (4 МБ)
```

**Русский:**
```
Prava Online v1.0.0 — официальное десктоп приложение для подготовки к экзамену на водительское удостоверение!

Возможности:
- Синхронизация с сервером — все данные хранятся в облаке
- Система входа и регистрации — ваш аккаунт работает на любом устройстве
- Полный интерфейс на 4 языках: узбекский (латиница), узбекский (кириллица), русский, английский
- Практика по темам — изучайте каждую тему отдельно
- Режим билетов — 20 вопросов как на настоящем экзамене
- Режим марафона — решайте все вопросы подряд
- Статистика экзаменов — анализ правильных и неправильных ответов
- Раздел ошибок — повторно решайте только вопросы, где ошиблись
- Сохранённые вопросы — отмечайте важные вопросы для повторения
- Лёгкое и быстрое приложение для Windows (4 МБ)
```

**English:**
```
Prava Online v1.0.0 — official desktop app for driving license exam preparation!

Features:
- Server synchronization — all data is stored in the cloud
- Login and registration system — your account works on any device
- Full interface in 4 languages: Uzbek (Latin), Uzbek (Cyrillic), Russian, English
- Practice by topics — study each topic separately
- Ticket mode — 20 questions just like the real exam
- Marathon mode — solve all questions in a row
- Exam statistics — analysis of correct and incorrect answers
- Wrong answers section — re-solve only the questions you got wrong
- Saved questions — bookmark important questions for review
- Lightweight and fast Windows application (4 MB)
```

---

### Prava Offline v1.0.0 (Offline versiya)

**O'zbekcha (lotin):**
```
Prava Offline v1.0.0 — internetsiz ishlaydigan haydovchilik imtihoniga tayyorlanish dasturi!

Imkoniyatlar:
- Internetga ulanish shart emas — barcha savollar dastur ichida
- 4 ta tilda to'liq interfeys: o'zbekcha (lotin), o'zbekcha (kirill), ruscha, inglizcha
- Mavzular bo'yicha mashq — har bir mavzuni alohida o'rganing
- Biletlar rejimi — haqiqiy imtihondagi kabi 20 ta savol
- Marafon rejimi — barcha savollarni ketma-ket yechish
- Imtihon statistikasi — to'g'ri/noto'g'ri javoblar tahlili
- Xato javoblar bo'limi — faqat xato qilgan savollaringizni qayta yechish
- Saqlangan savollar — muhim savollarni belgilab qo'yish
- Bir nechta foydalanuvchi profili — oila a'zolari uchun
- Windows uchun yengil va tez ishlaydigan dastur
```

**Ўзбекча (кирилл):**
```
Prava Offline v1.0.0 — интернетсиз ишлайдиган ҳайдовчилик имтиҳонига тайёрланиш дастури!

Имкониятлар:
- Интернетга уланиш шарт эмас — барча саволлар дастур ичида
- 4 та тилда тўлиқ интерфейс: ўзбекча (лотин), ўзбекча (кирилл), русча, инглизча
- Мавзулар бўйича машқ — ҳар бир мавзуни алоҳида ўрганинг
- Билетлар режими — ҳақиқий имтиҳондаги каби 20 та савол
- Марафон режими — барча саволларни кетма-кет ечиш
- Имтиҳон статистикаси — тўғри/нотўғри жавоблар таҳлили
- Хато жавоблар бўлими — фақат хато қилган саволларингизни қайта ечиш
- Сақланган саволлар — муҳим саволларни белгилаб қўйиш
- Бир нечта фойдаланувчи профили — оила аъзолари учун
- Windows учун енгил ва тез ишлайдиган дастур
```

**Русский:**
```
Prava Offline v1.0.0 — программа подготовки к экзамену на водительские права без интернета!

Возможности:
- Не требуется подключение к интернету — все вопросы внутри приложения
- Полный интерфейс на 4 языках: узбекский (латиница), узбекский (кириллица), русский, английский
- Практика по темам — изучайте каждую тему отдельно
- Режим билетов — 20 вопросов как на настоящем экзамене
- Режим марафона — решайте все вопросы подряд
- Статистика экзаменов — анализ правильных и неправильных ответов
- Раздел ошибок — повторно решайте только вопросы, где ошиблись
- Сохранённые вопросы — отмечайте важные вопросы для повторения
- Несколько профилей пользователей — для членов семьи
- Лёгкое и быстрое приложение для Windows
```

**English:**
```
Prava Offline v1.0.0 — offline driving license exam preparation app!

Features:
- No internet connection required — all questions are built into the app
- Full interface in 4 languages: Uzbek (Latin), Uzbek (Cyrillic), Russian, English
- Practice by topics — study each topic separately
- Ticket mode — 20 questions just like the real exam
- Marathon mode — solve all questions in a row
- Exam statistics — analysis of correct and incorrect answers
- Wrong answers section — re-solve only the questions you got wrong
- Saved questions — bookmark important questions for review
- Multiple user profiles — for family members
- Lightweight and fast Windows application
```

---

## IV. RELIZDAN KEYIN

| Harakat | Qanday |
|---------|--------|
| **Status o'zgartirish** | Jadvalda switch tugmasi (yashil = Active) |
| **Tahrirlash** | Qalam ikonkasi |
| **O'chirish** | Qizil axlat qutisi ikonkasi |

---

## V. FOYDALANUVCHI TOMONI

Foydalanuvchi **pravaonline.uz/downloads** sahifasida:
- Relizlar platforma bo'yicha guruhlangan (Windows/Linux/macOS)
- "Yuklab olish" tugmasi
- Foydalanuvchi tiliga mos release notes ko'rinadi
- Fayl hajmi, sana, yuklab olinganlar soni ko'rsatiladi
- SHA-256 checksum bilan fayl yaxlitligini tekshirish mumkin

---

## VI. MUAMMOLAR VA YECHIMLAR

| Muammo | Yechim |
|--------|--------|
| `npx tauri build` xato beradi | `npm install` qayta bering, Rust o'rnatilganini tekshiring |
| Fayl yuklanmayapti | Fayl hajmi 1GB dan kichik bo'lishi kerak |
| Platforma noto'g'ri aniqlanadi | Fayl kengaytmasini tekshiring (.exe = Windows) |
| Release notes ko'rinmayapti | 4 ta tilni ham to'ldirishingiz shart |
| Versiya xatosi | Format: `1.0.0` (3 ta raqam nuqta bilan) |
| Build juda uzoq davom etyapti | Birinchi build 5-10 daqiqa, keyingilari 1-2 daqiqa |
| `error[E0463]: can't find crate` | `rustup update` bering |
