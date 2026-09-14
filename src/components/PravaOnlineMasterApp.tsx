import React, { useState, useEffect, useMemo, useCallback } from "react";

// ============================================================================
// I. DATA TYPES & ARCHITECTURAL MODELS
// ============================================================================

export type Language = "uzl" | "uzc" | "ru";
export type Theme = "light" | "dark";
export type ViewMode = "dashboard" | "setup" | "testing" | "results" | "review";

export interface Option {
  id: number;
  text_uzl: string;
  text_uzc: string;
  text_ru: string;
}

export interface Question {
  id: number;
  topic_id: number;
  question_uzl: string;
  question_uzc: string;
  question_ru: string;
  options: Option[];
  correct_option: number; // 0, 1, 2, 3
  explanation_uzl?: string;
  explanation_uzc?: string;
  explanation_ru?: string;
  image_url?: string;
}

export interface Topic {
  id: number;
  title_uzl: string;
  title_uzc: string;
  title_ru: string;
  question_count: number;
  mistakes_count: number;
  icon: string;
}

export interface UserAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
}

export interface TestResult {
  score: number;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  durationSeconds: number;
  tier: "gold" | "target" | "retry";
  topicTitle: string;
}

// ============================================================================
// II. ICON SYSTEM (ZERO EXTERNAL DEPENDENCY - WCAG SCALABLE SVGS)
// ============================================================================

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 20,
  className = "",
  color = "currentColor",
  strokeWidth = 2,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SunIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Icon>
);

export const MoonIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Icon>
);

export const TrophyIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 3.79M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Icon>
);

export const TargetIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </Icon>
);

export const RotateCcwIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

export const FlameIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Icon>
);

export const BookOpenIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icon>
);

export const AwardIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </Icon>
);

export const CheckIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

export const XIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

export const ClockIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

export const ChevronRightIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);

export const ChevronLeftIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

export const SearchIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);

export const ArrowLeftIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Icon>
);

export const BookmarkIcon: React.FC<IconProps & { filled?: boolean }> = ({
  filled,
  ...p
}) => (
  <Icon {...p}>
    <path
      d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
      fill={filled ? "currentColor" : "none"}
    />
  </Icon>
);

export const PlayIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </Icon>
);

export const SparklesIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </Icon>
);

export const AlertTriangleIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icon>
);

export const TrendingUpIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </Icon>
);

export const BarChart2Icon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </Icon>
);

export const UsersIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const HistoryIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <polyline points="12 7 12 12 15 15" />
  </Icon>
);

export const CarIcon: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </Icon>
);

// ============================================================================
// III. 100% SYNCHRONIZED 3-LANGUAGE LOCALIZATION SYSTEM
// ============================================================================

export const TRANSLATIONS: Record<Language, Record<string, Record<string, string>>> = {
  uzl: {
    nav: {
      brand: "PRAVAONLINE",
      tagline: "Haydovchilik imtihoniga tayyorgarlik",
      lightMode: "Yorug' rejim",
      darkMode: "Qorong'i rejim",
      profileFallback: "Hurmatli haydovchi",
    },
    metrics: {
      dailyGoal: "Kunlik reja",
      dailyGoalQuestions: "12 / 30 savol",
      questionsSolved: "Yechilgan savollar",
      solvedCount: "148 / 1190",
      overallReadiness: "Tayyorgarlik darajasi",
      readinessPercent: "14%",
      beginnerLevel: "Boshlang'ich daraja",
    },
    modes: {
      primaryEduTitle: "Asosiy ta'lim rejimlari",
      recommendedBadge: "Tavsiya etiladi",
      topicsTitle: "Mavzular",
      topicsDesc: "28 ta mavzu bo'yicha bosqichma-bosqich o'rganish",
      ticketsTitle: "Biletlar",
      ticketsDesc: "70 ta rasmiy DTM biletlari va shablonlar",
      marathonTitle: "Katta Marafon",
      marathonDesc: "Barcha 1190 ta savol bitta to'xtovsiz oqimda",
      examTitle: "Haqiqiy Imtihon",
      examDesc: "Davlat YHXDX imtihoni to'liq simulyatsiyasi",
      questionsCountUnit: "ta savol",
    },
    weakTopics: {
      sectionTitle: "Diqqat talab qiladigan zaif mavzular",
      sectionSubtitle: "Eng ko'p xato qayd etilgan mavzular bo'yicha tahlil",
      mistakesUnit: "ta xato",
      emptyStateTitle: "Hali xatolaringiz yo'q, ajoyib!",
      emptyStateDesc: "Mavzuli testlarni ishlab bilimlaringizni sinab ko'ring",
      ctaBadge: "Shaxsiy tavsiya",
      ctaMistakesCount: "79 ta xato javob",
      ctaDesc: "Zaif mavzularingiz bo'yicha tezkor mashq qilib xatolaringizni bartaraf eting.",
      ctaButton: "Eng zaif 20 ta savolni tuzatish →",
    },
    utility: {
      sectionTitle: "Tahlil va shaxsiy vositalar",
      savedQuestions: "Saqlangan savollar",
      savedQuestionsDesc: "Qiyin savollaringiz to'plami",
      statistics: "Statistika",
      statisticsDesc: "O'zlashtirish dinamikasi",
      leaderboard: "O'quvchilar reytingi",
      leaderboardDesc: "Eng faol nomzodlar",
      examHistory: "Imtihonlar tarixi",
      examHistoryDesc: "O'tgan sinovlar ro'yxati",
    },
    setup: {
      back: "Ortga",
      topicTestTitle: "Mavzulashtirilgan test",
      marathonTitle: "Katta Marafon",
      selectTopic: "Mavzuni tanlang",
      allTopics: "Barcha mavzular",
      questionCount: "Savollar soni",
      available: "Mavjud",
      allQuestions: "Barchasi",
      limitWarning: "Bu mavzuda faqat {{count}} ta savol mavjud",
      startButton: "Testni boshlash",
    },
    testing: {
      questionIndex: "Savol {{cur}} / {{total}}",
      saveQuestion: "Saqlash",
      savedQuestion: "Saqlandi",
      finishEarly: "Yakunlash",
      prevQuestion: "Oldingisi",
      nextQuestion: "Keyingisi",
      submitExam: "Yakunlash",
      confirmFinishTitle: "Testni muddatidan oldin yakunlaysizmi?",
      confirmFinishDesc: "Hali javob berilmagan savollar mavjud. Belgilanmagan savollar xato deb hisoblanadi.",
      continueTest: "Davom etish",
      confirmFinishBtn: "Yakunlash",
    },
    results: {
      tierGoldTitle: "Ajoyib natija!",
      tierGoldMessage: "Imtihonga deyarli tayyorsiz! Bilimlaringiz yuqori darajada.",
      tierTargetTitle: "Yaxshi ko'rsatkich!",
      tierTargetMessage: "Yana bir oz mashq qilsangiz, natijangiz a'lo darajaga yetadi.",
      tierRetryTitle: "Taslim bo'lmang!",
      tierRetryMessage: "Xatolar ustida ishlab, qayta topshirish orqali natijani oshiring.",
      allCorrectBadge: "Barcha savollarga to'g'ri javob berildi!",
      correctAnswers: "To'g'ri",
      wrongAnswers: "Noto'g'ri",
      unanswered: "Javobsiz",
      reviewMistakes: "Xatolarni tahlil qilish",
      retryTest: "Qayta urinish",
      backHome: "Bosh sahifaga qaytish",
    },
    review: {
      title: "Xatolar tahlili",
      filterMistakes: "Faqat xatolar",
      filterAll: "Barcha savollar",
      questionNumber: "{{num}}-savol",
      yourAnswer: "Sizning javobingiz",
      correctAnswer: "To'g'ri javob",
      yhqExplanation: "Rasmiy YHQ qoidasi izohi",
      backToResults: "Natijaga qaytish",
    },
    footer: {
      copyright: "PravaOnline. Barcha huquqlar himoyalangan.",
      telegram: "Telegram kanal",
      instagram: "Instagram sahifa",
      youtube: "YouTube darslar",
    },
  },
  uzc: {
    nav: {
      brand: "PRAVAONLINE",
      tagline: "Ҳайдовчилик имтиҳонига тайёргарлик",
      lightMode: "Ёруғ режим",
      darkMode: "Қоронғи режим",
      profileFallback: "Ҳурматли ҳайдовчи",
    },
    metrics: {
      dailyGoal: "Кунлик режа",
      dailyGoalQuestions: "12 / 30 савол",
      questionsSolved: "Ечилган саволлар",
      solvedCount: "148 / 1190",
      overallReadiness: "Тайёргарлик даражаси",
      readinessPercent: "14%",
      beginnerLevel: "Бошланғич даража",
    },
    modes: {
      primaryEduTitle: "Асосий таълим режимлари",
      recommendedBadge: "Тавсия этилади",
      topicsTitle: "Мавзулар",
      topicsDesc: "28 та мавзу бўйича босқичма-босқич ўрганиш",
      ticketsTitle: "Билетлар",
      ticketsDesc: "70 та расмий ДТМ билетлари ва шаблонлар",
      marathonTitle: "Катта Марафон",
      marathonDesc: "Барча 1190 та савол битта тўхтовсиз оқимда",
      examTitle: "Ҳақиқий Имтиҳон",
      examDesc: "Давлат ЙҲХДХ имтиҳони тўлиқ симуляцияси",
      questionsCountUnit: "та савол",
    },
    weakTopics: {
      sectionTitle: "Диққат талаб қиладиган заиф мавзулар",
      sectionSubtitle: "Энг кўп хато қайд этилган мавзулар бўйича таҳлил",
      mistakesUnit: "та хато",
      emptyStateTitle: "Ҳали хатоларингиз йўқ, ажойиб!",
      emptyStateDesc: "Мавзули тестларни ишлаб билимларингизни синаб кўринг",
      ctaBadge: "Шахсий тавсия",
      ctaMistakesCount: "79 та хато жавоб",
      ctaDesc: "Заиф мавзуларингиз бўйича тезкор машқ қилиб хатоларингизни бартараф этинг.",
      ctaButton: "Энг заиф 20 та саволни тузатиш →",
    },
    utility: {
      sectionTitle: "Таҳлил ва шахсий воситалар",
      savedQuestions: "Сақланган саволлар",
      savedQuestionsDesc: "Қийин саволларингиз тўплами",
      statistics: "Статистика",
      statisticsDesc: "Ўзлаштириш динамикаси",
      leaderboard: "Ўқувчилар рейтинги",
      leaderboardDesc: "Энг фаол номзодлар",
      examHistory: "Имтиҳонлар тарихи",
      examHistoryDesc: "Ўтган синовлар рўйхати",
    },
    setup: {
      back: "Ортга",
      topicTestTitle: "Мавзулаштирилган тест",
      marathonTitle: "Катта Марафон",
      selectTopic: "Мавзуни танланг",
      allTopics: "Барча мавзулар",
      questionCount: "Саволлар сони",
      available: "Мавжуд",
      allQuestions: "Барчаси",
      limitWarning: "Бу мавзуда фақат {{count}} та савол мавжуд",
      startButton: "Тестни бошлаш",
    },
    testing: {
      questionIndex: "Савол {{cur}} / {{total}}",
      saveQuestion: "Сақлаш",
      savedQuestion: "Сақланди",
      finishEarly: "Якунлаш",
      prevQuestion: "Олдингиси",
      nextQuestion: "Кейингиси",
      submitExam: "Якунлаш",
      confirmFinishTitle: "Тестни муддатидан олдин якунлайсизми?",
      confirmFinishDesc: "Ҳали жавоб берилмаган саволлар мавжуд. Белгиланмаган саволлар хато деб ҳисобланади.",
      continueTest: "Давом этиш",
      confirmFinishBtn: "Якунлаш",
    },
    results: {
      tierGoldTitle: "Ажойиб натижа!",
      tierGoldMessage: "Имтиҳонга деярли тайёрсиз! Билимларингиз юқори даражада.",
      tierTargetTitle: "Яхши кўрсаткич!",
      tierTargetMessage: "Яна бир оз машқ қилсангиз, натижангиз аъло даражага етади.",
      tierRetryTitle: "Таслим бўлманг!",
      tierRetryMessage: "Хатолар устида ишлаб, қайта топшириш орқали натижани оширинг.",
      allCorrectBadge: "Барча саволларга тўғри жавоб берилди!",
      correctAnswers: "Тўғри",
      wrongAnswers: "Нотўғри",
      unanswered: "Жавобсиз",
      reviewMistakes: "Хатоларни таҳлил қилиш",
      retryTest: "Қайта уриниш",
      backHome: "Бош саҳифага қайтиш",
    },
    review: {
      title: "Хатолар таҳлили",
      filterMistakes: "Фақат хатолар",
      filterAll: "Барча саволлар",
      questionNumber: "{{num}}-савол",
      yourAnswer: "Сизнинг жавобингиз",
      correctAnswer: "Тўғри жавоб",
      yhqExplanation: "Расмий ЙҲҚ қоидаси изоҳи",
      backToResults: "Натижага қайтиш",
    },
    footer: {
      copyright: "PravaOnline. Барча ҳуқуқлар ҳимояланган.",
      telegram: "Telegram канал",
      instagram: "Instagram саҳифа",
      youtube: "YouTube дарслар",
    },
  },
  ru: {
    nav: {
      brand: "PRAVAONLINE",
      tagline: "Подготовка к экзаменам ПДД",
      lightMode: "Светлая тема",
      darkMode: "Темная тема",
      profileFallback: "Уважаемый курсант",
    },
    metrics: {
      dailyGoal: "Дневной план",
      dailyGoalQuestions: "12 / 30 вопросов",
      questionsSolved: "Решено вопросов",
      solvedCount: "148 / 1190",
      overallReadiness: "Уровень готовности",
      readinessPercent: "14%",
      beginnerLevel: "Начальный уровень",
    },
    modes: {
      primaryEduTitle: "Основные режимы обучения",
      recommendedBadge: "Рекомендуется",
      topicsTitle: "Темы",
      topicsDesc: "Пошаговое изучение по 28 темам ПДД",
      ticketsTitle: "Билеты",
      ticketsDesc: "70 официальных экзаменационных билетов",
      marathonTitle: "Большой Марафон",
      marathonDesc: "Все 1190 вопросов в непрерывном потоке",
      examTitle: "Реальный Экзамен",
      examDesc: "Полная симуляция государственного экзамена",
      questionsCountUnit: "вопросов",
    },
    weakTopics: {
      sectionTitle: "Темы, требующие внимания",
      sectionSubtitle: "Анализ тем с наибольшим количеством ошибок",
      mistakesUnit: "ошибок",
      emptyStateTitle: "Ошибок пока нет, отлично!",
      emptyStateDesc: "Начните решать тематические тесты для проверки знаний",
      ctaBadge: "Рекомендация",
      ctaMistakesCount: "79 неверных ответов",
      ctaDesc: "Пройдите быструю тренировку по слабым темам и закрепите правила.",
      ctaButton: "Исправить 20 слабых вопросов →",
    },
    utility: {
      sectionTitle: "Анализ и инструменты",
      savedQuestions: "Сохраненные вопросы",
      savedQuestionsDesc: "Коллекция сложных вопросов",
      statistics: "Статистика",
      statisticsDesc: "Динамика успеваемости",
      leaderboard: "Рейтинг курсантов",
      leaderboardDesc: "Самые активные кандидаты",
      examHistory: "История экзаменов",
      examHistoryDesc: "Список пройденных тестов",
    },
    setup: {
      back: "Назад",
      topicTestTitle: "Тематический тест",
      marathonTitle: "Большой Марафон",
      selectTopic: "Выберите тему",
      allTopics: "Все темы",
      questionCount: "Количество вопросов",
      available: "Доступно",
      allQuestions: "Все",
      limitWarning: "В этой теме доступно всего {{count}} вопросов",
      startButton: "Начать тест",
    },
    testing: {
      questionIndex: "Вопрос {{cur}} / {{total}}",
      saveQuestion: "Сохранить",
      savedQuestion: "Сохранено",
      finishEarly: "Завершить",
      prevQuestion: "Назад",
      nextQuestion: "Вперед",
      submitExam: "Завершить",
      confirmFinishTitle: "Завершить тест досрочно?",
      confirmFinishDesc: "Остались неотвеченные вопросы. Они будут засчитаны как неверные.",
      continueTest: "Продолжить",
      confirmFinishBtn: "Завершить",
    },
    results: {
      tierGoldTitle: "Отличный результат!",
      tierGoldMessage: "Вы практически готовы к экзамену! Ваши знания на высоте.",
      tierTargetTitle: "Хороший результат!",
      tierTargetMessage: "Еще немного тренировки, и результат станет идеальным.",
      tierRetryTitle: "Не сдавайтесь!",
      tierRetryMessage: "Проработайте ошибки и повторите попытку для лучшего результата.",
      allCorrectBadge: "Все ответы верны!",
      correctAnswers: "Верно",
      wrongAnswers: "Неверно",
      unanswered: "Без ответа",
      reviewMistakes: "Анализ ошибок",
      retryTest: "Попробовать снова",
      backHome: "На главную",
    },
    review: {
      title: "Анализ ошибок",
      filterMistakes: "Только ошибки",
      filterAll: "Все вопросы",
      questionNumber: "Вопрос {{num}}",
      yourAnswer: "Ваш ответ",
      correctAnswer: "Правильный ответ",
      yhqExplanation: "Разбор по ПДД",
      backToResults: "Вернуться к результату",
    },
    footer: {
      copyright: "PravaOnline. Все права защищены.",
      telegram: "Telegram канал",
      instagram: "Instagram страница",
      youtube: "YouTube уроки",
    },
  },
};

// ============================================================================
// IV. REALISTIC MOCK DATA (TOPICS & QUESTIONS)
// ============================================================================

export const MOCK_TOPICS: Topic[] = [
  {
    id: 1,
    title_uzl: "Umumiy qoidalar va asosiy tushunchalar",
    title_uzc: "Умумий қоидалар ва асосий тушунчалар",
    title_ru: "Общие положения и основные понятия",
    question_count: 54,
    mistakes_count: 24,
    icon: "book",
  },
  {
    id: 2,
    title_uzl: "Yo'l belgilari va chiziqlari",
    title_uzc: "Йўл белгилари ва чизиқлари",
    title_ru: "Дорожные знаки и разметка",
    question_count: 142,
    mistakes_count: 18,
    icon: "signs",
  },
  {
    id: 3,
    title_uzl: "Chorrahalarda harakatlanish qoidalari",
    title_uzc: "Чорраҳаларда ҳаракатланиш қоидалари",
    title_ru: "Правила проезда перекрестков",
    question_count: 86,
    mistakes_count: 22,
    icon: "crossroad",
  },
  {
    id: 4,
    title_uzl: "Piyodalar o'tish joylari va to'xtash qoidalari",
    title_uzc: "Пиёдалар ўтиш жойлари ва тўхташ қоидалари",
    title_ru: "Пешеходные переходы и остановка",
    question_count: 48,
    mistakes_count: 15,
    icon: "pedestrian",
  },
  {
    id: 5,
    title_uzl: "Harakatlanish tezligi va oraliq masofa",
    title_uzc: "Ҳаракатланиш тезлиги ва оралиқ масофа",
    title_ru: "Скорость движения и дистанция",
    question_count: 62,
    mistakes_count: 0,
    icon: "speed",
  },
  {
    id: 6,
    title_uzl: "Ogohlantiruvchi va maxsus ishoralar",
    title_uzc: "Огоҳлантирувчи ва махсус ишоралар",
    title_ru: "Предупреждающие и специальные сигналы",
    question_count: 8, // Edge case (< 10 questions)
    mistakes_count: 0,
    icon: "signals",
  },
];

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    topic_id: 1,
    question_uzl:
      "Aholi punktlarida yengil avtomobillarning ruxsat etilgan maksimal harakatlanish tezligi qancha?",
    question_uzc:
      "Аҳоли пунктларида енгил автомобилларнинг рухсат этилган максимал ҳаракатланиш тезлиги қанча?",
    question_ru:
      "Какова максимально разрешенная скорость движения легковых автомобилей в населенных пунктах?",
    options: [
      { id: 0, text_uzl: "70 km/soat", text_uzc: "70 км/соат", text_ru: "70 км/ч" },
      { id: 1, text_uzl: "60 km/soat", text_uzc: "60 км/соат", text_ru: "60 км/ч" },
      { id: 2, text_uzl: "80 km/soat", text_uzc: "80 км/соат", text_ru: "80 км/ч" },
      { id: 3, text_uzl: "50 km/soat", text_uzc: "50 км/соат", text_ru: "50 км/ч" },
    ],
    correct_option: 1,
    explanation_uzl:
      "O'zbekiston Respublikasi YHQ 78-bandiga binoan, aholi punktlarida barcha transport vositalarining tezligi soatiga 60 kilometrdan oshmasligi shart (Toshkent, Nukus va viloyat markazlarida).",
    explanation_uzc:
      "Ўзбекистон Республикаси ЙҲҚ 78-бандига биноан, аҳоли пунктларида барча транспорт воситаларининг тезлиги соатига 60 километрдан ошмаслиги шарт.",
    explanation_ru:
      "Согласно пункту 78 ПДД Республики Узбекистан, в населенных пунктах разрешается движение транспортных средств со скоростью не более 60 км/ч.",
  },
  {
    id: 2,
    topic_id: 3,
    question_uzl:
      "Teng ahamiyatli yo'llar chorrahasida haydovchi qaysi transport vositasiga yo'l berishi shart?",
    question_uzc:
      "Тенг аҳамиятли йўллар чорраҳасида ҳайдовчи қайси транспорт воситасига йўл бериши шарт?",
    question_ru:
      "На перекрестке равнозначных дорог водитель обязан уступить дорогу какому транспортному средству?",
    options: [
      { id: 0, text_uzl: "Chap tomondan kelayotganga", text_uzc: "Чап томондан келаётганга", text_ru: "Приближающемуся слева" },
      { id: 1, text_uzl: "O'ng tomondan kelayotganga", text_uzc: "Ўнг томондан келаётганга", text_ru: "Приближающемуся справа" },
      { id: 2, text_uzl: "Tezroq harakatlanayotganga", text_uzc: "Тезроқ ҳаракатланаётганга", text_ru: "Движущемуся быстрее" },
      { id: 3, text_uzl: "Yuk avtomobiliga", text_uzc: "Юк автомобилига", text_ru: "Грузовому автомобилю" },
    ],
    correct_option: 1,
    explanation_uzl:
      "YHQ 103-bandiga binoan, teng ahamiyatli yo'llar chorrahasida relssiz transport vositasi haydovchisi o'ng tomondan yaqinlashayotgan transport vositalariga yo'l berishi kerak ('O'ng qo'l qoidasi').",
    explanation_uzc:
      "ЙҲҚ 103-бандига биноан, тенг аҳамиятли йўллар чорраҳасида ҳайдовчи ўнг томондан яқинлашаётган транспорт воситаларига йўл бериши шарт ('Ўнг қўл қоидаси').",
    explanation_ru:
      "Согласно пункту 103 ПДД, на перекрестке равнозначных дорог водитель безрельсового ТС обязан уступить дорогу ТС, приближающимся справа ('Помеха справа').",
  },
  {
    id: 3,
    topic_id: 2,
    question_uzl:
      "Qaysi yo'l belgisi 'Kirish taqiqlanadi' (G'isht) ma'nosini bildiradi?",
    question_uzc:
      "Қайси йўл белгиси 'Кириш тақиқланади' (Ғишт) маъносини билдиради?",
    question_ru:
      "Какой дорожный знак означает 'Въезд запрещен' ('Кирпич')?",
    options: [
      { id: 0, text_uzl: "Oq fonli qizil aylana", text_uzc: "Оқ фонли қизил айлана", text_ru: "Белый круг с красной каймой" },
      { id: 1, text_uzl: "Qizil aylanada oq to'g'ri to'rtburchak", text_uzc: "Қизил айланада оқ тўғри тўртбурчак", text_ru: "Красный круг с белым прямоугольником" },
      { id: 2, text_uzl: "Moviy fonda oq strelka", text_uzc: "Мовий фонда оқ стрелка", text_ru: "Белая стрелка на синем фоне" },
      { id: 3, text_uzl: "Qora xochli sariq romb", text_uzc: "Қора хочли сариқ ромб", text_ru: "Желтый ромб с черным крестом" },
    ],
    correct_option: 1,
    explanation_uzl:
      "3.1 'Kirish taqiqlanadi' belgisi qizil aylanada oq gorizontal to'g'ri to'rtburchak ko'rinishida bo'lib, barcha transport vositalarining ushbu yo'nalishda kirishini taqiqlaydi.",
    explanation_uzc:
      "3.1 'Кириш тақиқланади' белгиси қизил айланада оқ тўғри тўртбурчак шаклида бўлиб, барча транспорт воситаларининг ушбу йўналишда киришини тақиқлайди.",
    explanation_ru:
      "Знак 3.1 'Въезд запрещен' представляет собой красный круг с белым прямоугольником и запрещает въезд всех транспортных средств в данном направлении.",
  },
  {
    id: 4,
    topic_id: 4,
    question_uzl:
      "Tartibga solinmagan piyodalar o'tish joyiga yaqinlashayotgan haydovchining harakat tartibi qanday?",
    question_uzc:
      "Тартибга солинмаган пиёдалар ўтиш жойига яқинлашаётган ҳайдовчининг ҳаракат тартиби қандай?",
    question_ru:
      "Каков порядок действий водителя при приближении к нерегулируемому пешеходному переходу?",
    options: [
      { id: 0, text_uzl: "Ovozli signal berib, tezlikni oshirish", text_uzc: "Овозли сигнал бериб, тезликни ошириш", text_ru: "Подать звуковой сигнал и увеличить скорость" },
      { id: 1, text_uzl: "Tezlikni kamaytirish va o'tayotgan piyodalarga yo'l berish", text_uzc: "Тезликни камайтириш ва ўтаётган пиёдаларга йўл бериш", text_ru: "Снизить скорость и уступить дорогу пешеходам" },
      { id: 2, text_uzl: "Faqat piyoda o'rtaga yetganda to'xtash", text_uzc: "Фақат пиёда ўртага етганда тўхташ", text_ru: "Останавливаться, только если пешеход на середине" },
      { id: 3, text_uzl: "Chiroqlarni yoqib to'xtamasdan o'tish", text_uzc: "Чироқларни ёқиб тўхтамасдан ўтиш", text_ru: "Моргнуть фарами и проехать без остановки" },
    ],
    correct_option: 1,
    explanation_uzl:
      "YHQ 113-bandiga binoan, tartibga solinmagan piyodalar o'tish joyiga yaqinlashayotgan haydovchi o'tish joyiga kirgan yoki kirayotgan piyodalarga yo'l berish uchun tezlikni kamaytirishi yoki to'xtashi shart.",
    explanation_uzc:
      "ЙҲҚ 113-бандига биноан, ҳайдовчи пиёдалар ўтиш жойига кирган ёки кираётган пиёдаларга йўл бериш учун тезликни камайтириши шарт.",
    explanation_ru:
      "Согласно пункту 113 ПДД, водитель транспортного средства, приближающегося к нерегулируемому пешеходному переходу, обязан снизить скорость или остановиться перед переходом, чтобы пропустить пешеходов.",
  },
];

// ============================================================================
// V. MASTER COMPONENT: PravaOnlineMasterApp
// ============================================================================

export default function PravaOnlineMasterApp() {
  // ── 1. GLOBAL STATE ──
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("prava_theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  });

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem("prava_lang");
    return saved === "uzl" || saved === "uzc" || saved === "ru" ? saved : "uzl";
  });

  const [view, setView] = useState<ViewMode>("dashboard");
  const [userName] = useState("Mirabbos Egamberdiyev");

  // ── 2. TEST SETUP & RUNTIME STATE ──
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 mins
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "mistakes">("mistakes");

  // ── 3. THEME SYNCHRONIZATION WITH DOCUMENT ROOT ──
  useEffect(() => {
    localStorage.setItem("prava_theme", theme);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // ── 4. LANGUAGE STORAGE ──
  useEffect(() => {
    localStorage.setItem("prava_lang", lang);
  }, [lang]);

  // Translation helper
  const t = useCallback(
    (section: string, key: string, fallback?: string): string => {
      const sec = TRANSLATIONS[lang]?.[section];
      return sec?.[key] || fallback || key;
    },
    [lang]
  );

  // Dynamic localized text helper for models
  const getLocalizedText = useCallback(
    <T extends Record<string, any>>(item: T, fieldPrefix: string): string => {
      const field = `${fieldPrefix}_${lang}`;
      return item[field] || item[`${fieldPrefix}_uzl`] || "";
    },
    [lang]
  );

  // ── 5. TIMER ENGINE ──
  useEffect(() => {
    if (view !== "testing") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view]);

  // Beforeunload listener when test is active
  useEffect(() => {
    if (view !== "testing") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [view]);

  // ── 6. TEST ACTIONS & FINISH ENGINE ──
  const startTestEngine = (topicId: number | null, count: number) => {
    let pool = MOCK_QUESTIONS;
    if (topicId !== null) {
      pool = pool.filter((q) => q.topic_id === topicId);
    }
    // If pool is smaller than requested, cap it
    const actualQuestions = pool.slice(0, count === 0 ? pool.length : count);
    setActiveQuestions(actualQuestions);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeLeft(actualQuestions.length * 60); // 1 min per question
    setIsConfirmModalOpen(false);
    setView("testing");
  };

  const finishTest = useCallback(() => {
    const total = activeQuestions.length;
    let correct = 0;
    let wrong = 0;

    activeQuestions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (ans !== undefined) {
        if (ans === q.correct_option) correct++;
        else wrong++;
      }
    });

    const unanswered = total - (correct + wrong);
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    let tier: "gold" | "target" | "retry" = "retry";
    if (score >= 90) tier = "gold";
    else if (score >= 70) tier = "target";

    const currentTopicObj = MOCK_TOPICS.find((tp) => tp.id === selectedTopicId);
    const topicTitle = currentTopicObj
      ? getLocalizedText(currentTopicObj, "title")
      : t("modes", "marathonTitle");

    setTestResult({
      score,
      total,
      correct,
      wrong,
      unanswered,
      durationSeconds: activeQuestions.length * 60 - timeLeft,
      tier,
      topicTitle,
    });

    setView("results");
  }, [activeQuestions, userAnswers, selectedTopicId, timeLeft, getLocalizedText, t]);

  const handleSelectOption = (optionIndex: number) => {
    if (userAnswers[currentIndex] !== undefined) return;
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  };

  const toggleBookmark = (qId: number) => {
    setSavedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ── 7. ACTIVE TOPIC SETUP COMPUTATION ──
  const activeTopic = useMemo(() => {
    return selectedTopicId !== null
      ? MOCK_TOPICS.find((tp) => tp.id === selectedTopicId) || null
      : null;
  }, [selectedTopicId]);

  const maxAvailableQuestions = activeTopic
    ? activeTopic.question_count
    : MOCK_TOPICS.reduce((acc, curr) => acc + curr.question_count, 0);

  const CHIP_OPTIONS = [10, 20, 30, 50, 0]; // 0 stands for "All"

  // ============================================================================
  // RENDER VIEW 1: GLOBAL HEADER
  // ============================================================================
  const renderHeader = () => (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-700/60 bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div
          onClick={() => setView("dashboard")}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            <CarIcon size={22} strokeWidth={2.2} />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
              {t("nav", "brand")}
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block -mt-0.5">
              {t("nav", "tagline")}
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Language Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            {(["uzl", "uzc", "ru"] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === l
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {l === "uzl" ? "O'zb" : l === "uzc" ? "Ўзб" : "Рус"}
              </button>
            ))}
          </div>

          {/* Dark/Light Mode Switcher */}
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
            title={theme === "light" ? t("nav", "darkMode") : t("nav", "lightMode")}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition-all"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </button>

          {/* User Profile Chip */}
          <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {userName.charAt(0)}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {userName || t("nav", "profileFallback")}
              </div>
              <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                ● Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  // ============================================================================
  // RENDER VIEW 2: GLOBAL FOOTER
  // ============================================================================
  const renderFooter = () => (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#0B132B] py-8 transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          © {new Date().getFullYear()} {t("footer", "copyright")}
        </div>
        <div className="flex items-center gap-6 text-xs font-semibold">
          <a
            href="https://t.me/pravaonline"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t("footer", "telegram")}
          </a>
          <a
            href="https://instagram.com/pravaonline"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t("footer", "instagram")}
          </a>
          <a
            href="https://youtube.com/@pravaonline"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t("footer", "youtube")}
          </a>
        </div>
      </div>
    </footer>
  );

  // ============================================================================
  // RENDER VIEW 3: DASHBOARD VIEW
  // ============================================================================
  const renderDashboard = () => (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* ── 1. Top Metrics Bar (3 Encouraging Widgets) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Daily Goal */}
        <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FlameIcon size={24} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("metrics", "dailyGoal")}
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {t("metrics", "dailyGoalQuestions")}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div className="bg-amber-500 h-2 rounded-full w-2/5 transition-all duration-500" />
            </div>
          </div>
        </div>

        {/* Solved Questions */}
        <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpenIcon size={24} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("metrics", "questionsSolved")}
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {t("metrics", "solvedCount")}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div className="bg-indigo-600 h-2 rounded-full w-[14%] transition-all duration-500" />
            </div>
          </div>
        </div>

        {/* Overall Readiness Level */}
        <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <AwardIcon size={24} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("metrics", "overallReadiness")}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                {t("metrics", "beginnerLevel")}
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {t("metrics", "readinessPercent")}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full w-[14%] transition-all duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Hero 4 Grid: Primary Educational Modes ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {t("modes", "primaryEduTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Mavzular (Topics) - Recommended for Beginners */}
          <div
            onClick={() => {
              setSelectedTopicId(1);
              setView("setup");
            }}
            className="group relative bg-white dark:bg-[#111C44]/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpenIcon size={24} />
                </div>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                  {t("modes", "recommendedBadge")}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t("modes", "topicsTitle")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                {t("modes", "topicsDesc")}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              <span>28 mavzu • 1190 {t("modes", "questionsCountUnit")}</span>
              <ChevronRightIcon size={16} />
            </div>
          </div>

          {/* Card 2: Biletlar (Tickets) */}
          <div
            onClick={() => {
              setSelectedTopicId(null);
              setSelectedCount(20);
              startTestEngine(null, 20);
            }}
            className="group relative bg-white dark:bg-[#111C44]/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
                <CarIcon size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {t("modes", "ticketsTitle")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                {t("modes", "ticketsDesc")}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400">
              <span>70 bilet • 20 {t("modes", "questionsCountUnit")}</span>
              <ChevronRightIcon size={16} />
            </div>
          </div>

          {/* Card 3: Marafon (Marathon) */}
          <div
            onClick={() => {
              setSelectedTopicId(null);
              setView("setup");
            }}
            className="group relative bg-white dark:bg-[#111C44]/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <FlameIcon size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {t("modes", "marathonTitle")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                {t("modes", "marathonDesc")}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400">
              <span>1190 {t("modes", "questionsCountUnit")}</span>
              <ChevronRightIcon size={16} />
            </div>
          </div>

          {/* Card 4: Haqiqiy Imtihon (Exam Simulator) */}
          <div
            onClick={() => {
              setSelectedTopicId(null);
              setSelectedCount(20);
              startTestEngine(null, 20);
            }}
            className="group relative bg-white dark:bg-[#111C44]/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <TrophyIcon size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t("modes", "examTitle")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                {t("modes", "examDesc")}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              <span>20 {t("modes", "questionsCountUnit")} • 20 daqiqa</span>
              <ChevronRightIcon size={16} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Smart Action Grid (7 / 5 Ratio: Weak Topics vs Mistakes CTA) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: 4 Weak Topics (7 columns) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111C44]/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.3)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {t("weakTopics", "sectionTitle")}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {t("weakTopics", "sectionSubtitle")}
            </p>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_TOPICS.slice(0, 4).map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    setView("setup");
                  }}
                  className="py-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {getLocalizedText(topic, "title")}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {topic.question_count} {t("modes", "questionsCountUnit")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                      {topic.mistakes_count} {t("weakTopics", "mistakesUnit")}
                    </span>
                    <ChevronRightIcon size={16} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Indigo CTA Card (5 columns) */}
        <div className="lg:col-span-5 rounded-2xl p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl flex flex-col justify-between relative overflow-hidden border border-indigo-700/50">
          <div className="relative z-10">
            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/15 text-indigo-200 backdrop-blur-sm mb-3">
              {t("weakTopics", "ctaBadge")}
            </span>
            <h3 className="text-2xl font-black tracking-tight leading-tight">
              {t("weakTopics", "ctaMistakesCount")}
            </h3>
            <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
              {t("weakTopics", "ctaDesc")}
            </p>
          </div>

          <div className="relative z-10 mt-6">
            <button
              type="button"
              onClick={() => {
                setSelectedTopicId(null);
                setSelectedCount(20);
                startTestEngine(null, 20);
              }}
              className="w-full py-3 px-4 rounded-xl bg-white text-indigo-950 font-black text-xs sm:text-sm hover:bg-indigo-50 shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{t("weakTopics", "ctaButton")}</span>
              <ChevronRightIcon size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 4. Utility 4 Grid: Analytics and History ── */}
      <section className="space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          {t("utility", "sectionTitle")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Saved Questions */}
          <div
            onClick={() => {
              if (savedQuestionIds.size > 0) {
                const qs = MOCK_QUESTIONS.filter((q) => savedQuestionIds.has(q.id));
                setActiveQuestions(qs.length > 0 ? qs : MOCK_QUESTIONS.slice(0, 5));
                setView("testing");
              }
            }}
            className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookmarkIcon size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t("utility", "savedQuestions")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {savedQuestionIds.size} ta savol
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BarChart2Icon size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t("utility", "statistics")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("utility", "statisticsDesc")}
              </div>
            </div>
          </div>

          {/* Students Leaderboard */}
          <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UsersIcon size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t("utility", "leaderboard")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Top 100 reyting
              </div>
            </div>
          </div>

          {/* Exam History */}
          <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <HistoryIcon size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {t("utility", "examHistory")}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                12 ta sinov
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  // ============================================================================
  // RENDER VIEW 4: TEST SETUP VIEW
  // ============================================================================
  const renderSetup = () => {
    const isSingleTopic = selectedTopicId !== null;
    const title = isSingleTopic
      ? t("setup", "topicTestTitle")
      : t("setup", "marathonTitle");

    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#111C44]/80 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/60 shadow-xl dark:shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeftIcon size={16} />
            <span>{t("setup", "back")}</span>
          </button>

          {/* Title Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpenIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2>
              {activeTopic && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {getLocalizedText(activeTopic, "title")}
                </p>
              )}
            </div>
          </div>

          {/* Topic Select Dropdown */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t("setup", "selectTopic")}
            </label>
            <select
              value={selectedTopicId ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : Number(e.target.value);
                setSelectedTopicId(val);
              }}
              className="w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600 transition-all cursor-pointer"
            >
              <option value="">{t("setup", "allTopics")} (1190)</option>
              {MOCK_TOPICS.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {getLocalizedText(tp, "title")} ({tp.question_count})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Question Count Chips (Auto Disabled when N > MaxQ) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("setup", "questionCount")}
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t("setup", "available")}: {maxAvailableQuestions}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {CHIP_OPTIONS.map((num) => {
                const isAll = num === 0;
                const label = isAll ? t("setup", "allQuestions") : String(num);
                const isExcessive = !isAll && num > maxAvailableQuestions;
                const isSelected = isAll
                  ? selectedCount === 0 || selectedCount >= maxAvailableQuestions
                  : selectedCount === num;

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isExcessive}
                    onClick={() => setSelectedCount(num)}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isExcessive
                        ? "opacity-30 pointer-events-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700"
                        : isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-600 scale-[1.02]"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Warning if topic has very few questions */}
            {maxAvailableQuestions < 10 && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                <AlertTriangleIcon size={14} />
                {t("setup", "limitWarning").replace("{{count}}", String(maxAvailableQuestions))}
              </p>
            )}
          </div>

          {/* Start CTA Button */}
          <button
            type="button"
            onClick={() => startTestEngine(selectedTopicId, selectedCount)}
            className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm sm:text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
          >
            <PlayIcon size={18} />
            <span>{t("setup", "startButton")}</span>
          </button>
        </div>
      </main>
    );
  };

  // ============================================================================
  // RENDER VIEW 5: ACTIVE TESTING VIEW
  // ============================================================================
  const renderTesting = () => {
    const question = activeQuestions[currentIndex];
    if (!question) return null;

    const currentAnswer = userAnswers[currentIndex];
    const isBookmarked = savedQuestionIds.has(question.id);

    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-200">
        {/* Top Control Bar */}
        <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {t("testing", "questionIndex")
                .replace("{{cur}}", String(currentIndex + 1))
                .replace("{{total}}", String(activeQuestions.length))}
            </span>
            <div className="flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/20">
              <ClockIcon size={14} />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => toggleBookmark(question.id)}
              className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isBookmarked
                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <BookmarkIcon size={16} filled={isBookmarked} />
              <span className="hidden sm:inline">
                {isBookmarked ? t("testing", "savedQuestion") : t("testing", "saveQuestion")}
              </span>
            </button>

            {/* Early Finish */}
            <button
              type="button"
              onClick={() => {
                const answered = Object.keys(userAnswers).length;
                if (answered < activeQuestions.length) {
                  setIsConfirmModalOpen(true);
                } else {
                  finishTest();
                }
              }}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:bg-rose-100 cursor-pointer transition-colors"
            >
              {t("testing", "finishEarly")}
            </button>
          </div>
        </div>

        {/* Question Horizontal Navigation Rail */}
        <div className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-sm overflow-x-auto flex items-center gap-2">
          {activeQuestions.map((q, idx) => {
            const isAnswered = userAnswers[idx] !== undefined;
            const isCurrent = idx === currentIndex;
            const isSaved = savedQuestionIds.has(q.id);

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`min-w-[36px] h-9 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center justify-center relative ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400"
                    : isAnswered
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                {idx + 1}
                {isSaved && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        {/* Question Card & Options */}
        <div className="bg-white dark:bg-[#111C44]/80 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/60 shadow-xl dark:shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          {/* Question Text */}
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed mb-6">
            {getLocalizedText(question, "question")}
          </h2>

          {/* Options Matrix */}
          <div className="space-y-3">
            {question.options.map((opt, optIdx) => {
              const isSelected = currentAnswer === optIdx;
              const isAnswered = currentAnswer !== undefined;
              const isCorrect = optIdx === question.correct_option;

              let optionStyle =
                "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80";

              if (isAnswered) {
                if (isSelected) {
                  optionStyle = isCorrect
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                    : "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40";
                } else if (isCorrect) {
                  optionStyle =
                    "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40";
                }
              }

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer ${optionStyle} ${
                    isAnswered ? "pointer-events-none" : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold">
                      {getLocalizedText(opt, "text")}
                    </span>
                  </div>

                  {isAnswered && (
                    <div className="shrink-0">
                      {isCorrect ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <CheckIcon size={14} strokeWidth={3} />
                        </div>
                      ) : isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">
                          <XIcon size={14} strokeWidth={3} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation Banner (Appears when question answered) */}
          {currentAnswer !== undefined && question.explanation_uzl && (
            <div className="mt-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 text-xs leading-relaxed animate-in fade-in">
              <span className="font-black block text-indigo-700 dark:text-indigo-400 mb-1">
                {t("review", "yhqExplanation")}:
              </span>
              {getLocalizedText(question, "explanation")}
            </div>
          )}

          {/* Navigation Controls Bottom Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
              className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeftIcon size={16} />
              <span>{t("testing", "prevQuestion")}</span>
            </button>

            {currentIndex === activeQuestions.length - 1 ? (
              <button
                type="button"
                onClick={finishTest}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>{t("testing", "submitExam")}</span>
                <CheckIcon size={16} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((c) => Math.min(activeQuestions.length - 1, c + 1))}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>{t("testing", "nextQuestion")}</span>
                <ChevronRightIcon size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Early finish confirmation modal */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-[#111C44] rounded-3xl p-6 border border-slate-200 dark:border-slate-700 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangleIcon size={28} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
                {t("testing", "confirmFinishTitle")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {t("testing", "confirmFinishDesc")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t("testing", "continueTest")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    finishTest();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all"
                >
                  {t("testing", "confirmFinishBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  };

  // ============================================================================
  // RENDER VIEW 6: RESULTS VIEW (STRICT 3-TIER GAMIFICATION MATRIX)
  // ============================================================================
  const renderResults = () => {
    if (!testResult) return null;
    const { score, correct, wrong, unanswered, tier } = testResult;

    const tierConfig =
      tier === "gold"
        ? {
            icon: <TrophyIcon size={44} strokeWidth={2.2} />,
            bg: "bg-amber-500",
            title: t("results", "tierGoldTitle"),
            desc: t("results", "tierGoldMessage"),
          }
        : tier === "target"
        ? {
            icon: <TargetIcon size={44} strokeWidth={2.2} />,
            bg: "bg-teal-500",
            title: t("results", "tierTargetTitle"),
            desc: t("results", "tierTargetMessage"),
          }
        : {
            icon: <RotateCcwIcon size={44} strokeWidth={2.2} />,
            bg: "bg-amber-600",
            title: t("results", "tierRetryTitle"),
            desc: t("results", "tierRetryMessage"),
          };

    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#111C44]/80 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/60 shadow-2xl dark:shadow-[0_0_30px_rgba(0,0,0,0.4)] text-center">
          {/* Dynamic Tier Gamification Badge */}
          <div
            className={`w-20 h-20 rounded-3xl ${tierConfig.bg} text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-black/10 scale-105`}
          >
            {tierConfig.icon}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {tierConfig.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md mx-auto">
            {tierConfig.desc}
          </p>

          {/* Big Score Typography */}
          <div className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter my-6">
            {score}%
          </div>

          {/* 3-Color Metric Matrix */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <div className="text-lg font-black">{correct}</div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {t("results", "correctAnswers")}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400">
              <div className="text-lg font-black">{wrong}</div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {t("results", "wrongAnswers")}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400">
              <div className="text-lg font-black">{unanswered}</div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {t("results", "unanswered")}
              </div>
            </div>
          </div>

          {/* Zero Mistakes 100% Badge */}
          {wrong === 0 && (
            <div className="mb-6 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-2">
              <SparklesIcon size={16} />
              <span>{t("results", "allCorrectBadge")}</span>
            </div>
          )}

          {/* Action Button Hierarchy */}
          <div className="space-y-2.5">
            {/* 1. Review Mistakes CTA (Primary - only if mistakes exist) */}
            {wrong > 0 && (
              <button
                type="button"
                onClick={() => {
                  setReviewFilter("mistakes");
                  setView("review");
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <SearchIcon size={16} />
                <span>{t("results", "reviewMistakes")}</span>
              </button>
            )}

            {/* 2. Retry Test CTA (Outline) */}
            <button
              type="button"
              onClick={() => startTestEngine(selectedTopicId, selectedCount)}
              className="w-full py-3 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcwIcon size={16} />
              <span>{t("results", "retryTest")}</span>
            </button>

            {/* 3. Back to Home (Ghost) */}
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className="w-full py-2.5 px-6 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              {t("results", "backHome")}
            </button>
          </div>
        </div>
      </main>
    );
  };

  // ============================================================================
  // RENDER VIEW 7: REVIEW VIEW
  // ============================================================================
  const renderReview = () => {
    const list = activeQuestions
      .map((q, idx) => ({ q, idx, ans: userAnswers[idx] }))
      .filter((item) => {
        if (reviewFilter === "mistakes") {
          return item.ans !== undefined && item.ans !== item.q.correct_option;
        }
        return true;
      });

    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
        {/* Review Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111C44]/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {t("review", "title")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {list.length} ta savol
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Pill */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setReviewFilter("mistakes")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  reviewFilter === "mistakes"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {t("review", "filterMistakes")}
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter("all")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  reviewFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {t("review", "filterAll")}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setView("results")}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t("review", "backToResults")}
            </button>
          </div>
        </div>

        {/* List of Review Questions */}
        <div className="space-y-4">
          {list.map(({ q, idx, ans }) => {
            const isCorrect = ans === q.correct_option;

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-[#111C44]/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {t("review", "questionNumber").replace("{{num}}", String(idx + 1))}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      isCorrect
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400"
                    }`}
                  >
                    {isCorrect ? "To'g'ri" : "Xato"}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">
                  {getLocalizedText(q, "question")}
                </h3>

                {/* Option list */}
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isUserAns = ans === optIdx;
                    const isRightAns = optIdx === q.correct_option;

                    let bg = "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60";
                    if (isRightAns) {
                      bg = "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40";
                    } else if (isUserAns) {
                      bg = "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40";
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${bg}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{String.fromCharCode(65 + optIdx)})</span>
                          <span>{getLocalizedText(opt, "text")}</span>
                        </div>
                        {isRightAns && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ {t("review", "correctAnswer")}
                          </span>
                        )}
                        {isUserAns && !isRightAns && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            ✕ {t("review", "yourAnswer")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* YHQ Rule Explanation */}
                {q.explanation_uzl && (
                  <div className="mt-4 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                      {t("review", "yhqExplanation")}:
                    </span>
                    {getLocalizedText(q, "explanation")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    );
  };

  // ============================================================================
  // MAIN CONTAINER WITH TOKENIZED WCAG CONTRAST ROOTS
  // ============================================================================
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-white transition-colors duration-200 selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {renderHeader()}

      <div className="flex-1">
        {view === "dashboard" && renderDashboard()}
        {view === "setup" && renderSetup()}
        {view === "testing" && renderTesting()}
        {view === "results" && renderResults()}
        {view === "review" && renderReview()}
      </div>

      {renderFooter()}
    </div>
  );
}
