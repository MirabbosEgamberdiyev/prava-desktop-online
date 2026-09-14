import React, { useState } from "react";
import {
  IconBook2 as BookOpen,
  IconFileText as FileText,
  IconFlame as Flame,
  IconAward as Award,
  IconAlertTriangle as AlertTriangle,
  IconArrowRight as ArrowRight,
  IconBookmark as Bookmark,
  IconChartBar as BarChart3,
  IconTrophy as Trophy,
  IconHistory as History,
  IconCircleCheck as CheckCircle2,
  IconSparkles as Sparkles,
  IconSun as Sun,
  IconMoon as Moon,
  IconBrandTelegram as Send,
  IconBrandInstagram as Instagram,
  IconBrandYoutube as Youtube,
} from "@tabler/icons-react";

export type Language = "uzl" | "uzc" | "ru";

export const translations = {
  uzl: {
    greeting: "Xush kelibsiz",
    subtitle: "Haydovchilik imtihoniga tayyorlanishda davom eting",
    dailyGoal: "Kunlik reja",
    questionsSolved: "Yechilgan savollar",
    overallReadiness: "Umumiy tayyorgarlik",
    beginnerLevel: "Boshlang'ich",
    questionsUnit: "savol",
    totalUnit: "ta",
    recommended: "Tavsiya etiladi",
    mainModesTitle: "Asosiy ta'lim rejimlari",
    modes: {
      topics: { title: "Mavzular", desc: "Nazariya va qoidalar bo'yicha bosqichma-bosqich o'rganish" },
      tickets: { title: "Biletlar", desc: "1-dan 60-gacha rasmiy biletlar bilan mustahkamlash" },
      marathon: { title: "Marafon", desc: "Barcha 1190 ta savol ketma-ket, to'xtovsiz rejimda" },
      exam: { title: "Haqiqiy Imtihon", desc: "Vaqt chegaralangan rasmiy DTM test simulyatori" }
    },
    smartSectionTitle: "Aqlli tavsiya va xatolar ustida ishlash",
    smartSectionSubtitle: "Imtihon natijangizni oshirish uchun eng zaif mavzular va xatolarni tizimli bartaraf eting",
    weakTopicsTitle: "Zaif mavzular",
    weakTopicsSubtitle: "Eng ko'p xato tushgan yo'nalishlar",
    mistakesTitle: "ta xato javob",
    mistakesDesc: "Xatolar ustida muntazam ishlash imtihondan birinchi urinishda o'tish imkonini 94% ga oshiradi.",
    fixMistakesBtn: "Eng zaif 20 ta savolni tuzatish",
    analyticsTitle: "Tahlil va shaxsiy vositalar",
    tools: {
      saved: "Saqlanganlar",
      stats: "Statistika",
      rating: "Reyting",
      history: "Imtihon tarixi"
    },
    footerFollow: "Bizni ijtimoiy tarmoqlarda kuzating"
  },
  uzc: {
    greeting: "Хуш келибсиз",
    subtitle: "Ҳайдовчилик имтиҳонига тайёрланишда давом этинг",
    dailyGoal: "Кунлик режа",
    questionsSolved: "Ечилган саволлар",
    overallReadiness: "Умумий тайёргарлик",
    beginnerLevel: "Бошланғич",
    questionsUnit: "савол",
    totalUnit: "та",
    recommended: "Тавсия этилади",
    mainModesTitle: "Асосий таълим режимлари",
    modes: {
      topics: { title: "Мавзулар", desc: "Назария ва қоидалар бўйича босқичма-босқич ўрганиш" },
      tickets: { title: "Билетлар", desc: "1-дан 60-гача расмий билетлар билан мустаҳкамлаш" },
      marathon: { title: "Марафон", desc: "Барча 1190 та савол кетма-кет, тўхтовсиз режимда" },
      exam: { title: "Ҳақиқий Имтиҳон", desc: "Вақт чегараланган расмий ДТМ тест симулятори" }
    },
    smartSectionTitle: "Ақлли тавсия ва хатолар устида ишлаш",
    smartSectionSubtitle: "Имтиҳон натижангизни ошириш учун энг заиф мавзулар ва хатоларни тизимли бартараф этинг",
    weakTopicsTitle: "Заиф мавзулар",
    weakTopicsSubtitle: "Энг кўп хато тушган йўналишлар",
    mistakesTitle: "та хато жавоб",
    mistakesDesc: "Хатолар устида мунтазам ишлаш имтиҳондан биринчи уринишда ўтиш имконини 94% га оширади.",
    fixMistakesBtn: "Энг заиф 20 та саволни тузатиш",
    analyticsTitle: "Таҳлил ва шахсий воситалар",
    tools: {
      saved: "Сақланганлар",
      stats: "Статистика",
      rating: "Рейтинг",
      history: "Имтиҳон тарихи"
    },
    footerFollow: "Бизни ижтимоий тармоқларда кузатинг"
  },
  ru: {
    greeting: "Добро пожаловать",
    subtitle: "Продолжайте подготовку к экзамену по вождению",
    dailyGoal: "Дневной план",
    questionsSolved: "Пройдено вопросов",
    overallReadiness: "Общая готовность",
    beginnerLevel: "Начальный",
    questionsUnit: "вопросов",
    totalUnit: "из",
    recommended: "Рекомендуется",
    mainModesTitle: "Основные режимы обучения",
    modes: {
      topics: { title: "Темы", desc: "Поэтапное изучение правил и теоретической базы" },
      tickets: { title: "Билеты", desc: "Закрепление по официальным билетам от 1 до 60" },
      marathon: { title: "Марафон", desc: "Все 1190 вопросов подряд в непрерывном режиме" },
      exam: { title: "Реальный Экзамен", desc: "Официальный симулятор тестирования с таймером" }
    },
    smartSectionTitle: "Умные рекомендации и работа над ошибками",
    smartSectionSubtitle: "Систематический анализ и устранение слабых мест для максимального результата",
    weakTopicsTitle: "Слабые темы",
    weakTopicsSubtitle: "Направления с наибольшим числом ошибок",
    mistakesTitle: "ошибок в ответах",
    mistakesDesc: "Регулярная работа над ошибками повышает шанс сдать экзамен с первого раза на 94%.",
    fixMistakesBtn: "Исправить 20 сложных вопросов",
    analyticsTitle: "Анализ и персональные инструменты",
    tools: {
      saved: "Сохраненные",
      stats: "Статистика",
      rating: "Рейтинг",
      history: "История экзаменов"
    },
    footerFollow: "Следите за нами в социальных сетях"
  }
};

interface UserProps {
  name?: string;
}

export const Dashboard: React.FC<UserProps> = ({ name = "Mirabbos Egamberdiyev" }) => {
  const [lang, setLang] = useState<Language>("uzl");
  const [darkMode, setDarkMode] = useState(false);

  const t = translations[lang];

  // Fallback to prevent {{name}} bug
  const cleanName = (name || "").replace(/\{\{.*?\}\}/g, "").trim();
  const fallbackNames: Record<Language, string> = {
    uzl: "Hurmatli haydovchi",
    uzc: "Ҳурматли ҳайдовчи",
    ru: "Уважаемый курсант",
  };
  const displayName = cleanName || fallbackNames[lang] || fallbackNames.uzl;

  const weakTopicsByLang: Record<Language, Array<{ id: number; name: string; mistakes: number }>> = {
    uzl: [
      { id: 1, name: "Yo'l belgilari va chiziqlari", mistakes: 41 },
      { id: 2, name: "Umumiy qoidalar va haydovchining majburiyatlari", mistakes: 13 },
      { id: 3, name: "Chorrahada harakatlanish qoidalari", mistakes: 5 },
      { id: 4, name: "Birinchi tibbiy yordam ko'rsatish asoslari", mistakes: 5 },
    ],
    uzc: [
      { id: 1, name: "Йўл белгилари ва чизиқлари", mistakes: 41 },
      { id: 2, name: "Умумий қоидалар ва ҳайдовчининг мажбуриятлари", mistakes: 13 },
      { id: 3, name: "Чорраҳада ҳаракатланиш қоидалари", mistakes: 5 },
      { id: 4, name: "Биринчи тиббий ёрдам кўрсатиш асослари", mistakes: 5 },
    ],
    ru: [
      { id: 1, name: "Дорожные знаки и разметка", mistakes: 41 },
      { id: 2, name: "Общие положения и обязанности водителей", mistakes: 13 },
      { id: 3, name: "Проезд перекрестков", mistakes: 5 },
      { id: 4, name: "Основы оказания первой помощи", mistakes: 5 },
    ],
  };
  const weakTopics = weakTopicsByLang[lang] || weakTopicsByLang.uzl;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* ================= 1. HEADER & METRICS ================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t.greeting}, <span className="text-blue-600 dark:text-blue-400">{displayName}</span>!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Language Switcher */}
            <div className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
              {(["uzl", "uzc", "ru"] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    lang === l
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {l === "uzl" ? "O'zb" : l === "uzc" ? "Ўзб" : "Рус"}
                </button>
              ))}
            </div>

            {/* Dark/Light Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-300/60 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors shadow-sm cursor-pointer"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
            </button>
          </div>
        </header>

        {/* 3 Gamified Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Metrikalar">
          {/* 1. Daily Goal */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Flame size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="text-lg font-black">12 / 30</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.dailyGoal} ({t.questionsUnit})</div>
                </div>
              </div>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                40%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-orange-500 h-full rounded-full w-[40%]" />
            </div>
          </div>

          {/* 2. Questions Solved */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="text-lg font-black">322 / 1190 {t.totalUnit}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.questionsSolved}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                27%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full w-[27%]" />
            </div>
          </div>

          {/* 3. Overall Readiness (Pleasant Emerald/Blue, No Red Panic) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Award size={22} />
                </div>
                <div>
                  <div className="text-lg font-black">14%</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.overallReadiness}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                🌱 {t.beginnerLevel}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-[14%]" />
            </div>
          </div>
        </section>

        {/* ================= 2. HERO: ASOSIY TA'LIM REJIMLARI (4 COLUMNS ON DESKTOP) ================= */}
        <section className="space-y-4" aria-label={t.mainModesTitle}>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">{t.mainModesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mode 1: Topics (Recommended Badge) */}
            <div className="relative p-5 rounded-2xl border border-blue-500/70 dark:border-blue-500/50 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px]">
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-sm">
                <Sparkles size={11} />
                <span>{t.recommended}</span>
              </div>
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t.modes.topics.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{t.modes.topics.desc}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>{lang === "ru" ? "Начать" : lang === "uzc" ? "Бошлаш" : "Boshlash"}</span>
                <ArrowRight size={15} />
              </div>
            </div>

            {/* Mode 2: Tickets */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px]">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t.modes.tickets.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{t.modes.tickets.desc}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{lang === "ru" ? "Начать" : lang === "uzc" ? "Бошлаш" : "Boshlash"}</span>
                <ArrowRight size={15} />
              </div>
            </div>

            {/* Mode 3: Marathon */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px]">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Flame size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t.modes.marathon.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{t.modes.marathon.desc}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{lang === "ru" ? "Начать" : lang === "uzc" ? "Бошлаш" : "Boshlash"}</span>
                <ArrowRight size={15} />
              </div>
            </div>

            {/* Mode 4: Real Exam */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px]">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">{t.modes.exam.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{t.modes.exam.desc}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{lang === "ru" ? "Начать" : lang === "uzc" ? "Бошлаш" : "Boshlash"}</span>
                <ArrowRight size={15} />
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. AQLLI TAVSIYA & XATOLAR USTIDA ISHLASH (12-COL 7/5 GRID) ================= */}
        <section className="space-y-4" aria-label={t.smartSectionTitle}>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{t.smartSectionTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t.smartSectionSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Weak Topics List */}
          <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                <AlertTriangle size={14} />
                <span>{t.weakTopicsTitle}</span>
              </div>
              <h3 className="text-lg font-black mt-2">{t.weakTopicsSubtitle}</h3>
            </div>

            <div className="space-y-2.5">
              {weakTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  className="w-full p-3 rounded-xl bg-slate-50 hover:bg-amber-50/60 dark:bg-slate-800/60 dark:hover:bg-amber-950/20 border border-slate-200/70 dark:border-slate-700/60 hover:border-amber-400 flex items-center justify-between gap-3 text-left transition-all duration-150 min-h-[44px] cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug flex-1">
                    {topic.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">
                      {topic.mistakes} {t.totalUnit} {lang === "ru" ? "ошибок" : lang === "uzc" ? "хато" : "xato"}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Mistakes Action CTA */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-amber-50/40 dark:from-slate-900 dark:to-slate-900/90 shadow-sm flex flex-col justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg mb-3">
                <Flame size={14} />
                <span>{lang === "ru" ? "Быстрый прогресс" : lang === "uzc" ? "Тезкор натижа" : "Tezkor natija"}</span>
              </div>
              <h3 className="text-2xl font-black">79 {t.mistakesTitle}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                {t.mistakesDesc}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                className="w-full h-12 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all duration-150 min-h-[44px] cursor-pointer"
              >
                <span>{t.fixMistakesBtn}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

        {/* ================= 4. SECONDARY TOOLS (4 COLUMNS ON DESKTOP) ================= */}
        <section className="space-y-4" aria-label={t.analyticsTitle}>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">{t.analyticsTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tool 1: Saved */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[68px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Bookmark size={20} />
                </div>
                <div className="font-extrabold text-sm">{t.tools.saved}</div>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
            </div>

            {/* Tool 2: Stats */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[68px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div className="font-extrabold text-sm">{t.tools.stats}</div>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
            </div>

            {/* Tool 3: Rating */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[68px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Trophy size={20} />
                </div>
                <div className="font-extrabold text-sm">{t.tools.rating}</div>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
            </div>

            {/* Tool 4: History (No duplication of errors, strictly exam history) */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[68px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <History size={20} />
                </div>
                <div className="font-extrabold text-sm">{t.tools.history}</div>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
            </div>
          </div>
        </section>

        {/* ================= 5. FOOTER ================= */}
        <footer className="pt-8 pb-12 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t.footerFollow}
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://t.me/pravaonlineuz"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-sky-500 hover:border-sky-500 shadow-sm transition-colors min-h-[44px]"
            >
              <Send size={16} />
              <span>Telegram</span>
            </a>
            <a
              href="https://www.instagram.com/pravaonlineuz/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-pink-500 hover:border-pink-500 shadow-sm transition-colors min-h-[44px]"
            >
              <Instagram size={16} />
              <span>Instagram</span>
            </a>
            <a
              href="https://www.youtube.com/@pravaonlineuz"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-red-500 hover:border-red-500 shadow-sm transition-colors min-h-[44px]"
            >
              <Youtube size={16} />
              <span>YouTube</span>
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default Dashboard;
