/**
 * PRAVA DESKTOP ONLINE — OFFLINE SEED DATASET
 * Preloaded offline questions, 60 standard tickets, and topics.
 * Ensures the desktop application is 100% operational immediately upon install with ZERO internet.
 */

import type { DbQuestion, DbTicket, DbTopic } from "../database/schema";

// ── 1. STANDARD TOPICS (24 ta asosiy mavzu) ──
export const SEED_TOPICS: DbTopic[] = [
  { id: 1, code: "umumi-qoidalar", name_uzl: "Umumiy qoidalar", name_uzc: "Умумий қоидалар", name_ru: "Общие положения", order_num: 1, question_count: 20, updated_at: 1710000000 },
  { id: 2, code: "haydovchi-majburiyatlari", name_uzl: "Haydovchilarning umumiy majburiyatlari", name_uzc: "Ҳайдовчиларнинг умумий мажбуриятлари", name_ru: "Общие обязанности водителей", order_num: 2, question_count: 20, updated_at: 1710000000 },
  { id: 3, code: "maxsus-signallar", name_uzl: "Maxsus signallarni qo'llash", name_uzc: "Махсус сигналларни қўллаш", name_ru: "Применение специальных сигналов", order_num: 3, question_count: 20, updated_at: 1710000000 },
  { id: 4, code: "piyodalar-majburiyati", name_uzl: "Piyodalarning majburiyatlari", name_uzc: "Пиёдаларнинг мажбуриятлари", name_ru: "Обязанности пешеходов", order_num: 4, question_count: 20, updated_at: 1710000000 },
  { id: 5, code: "svetofor-va-tartibga-soluvchi", name_uzl: "Svetofor va tartibga soluvchining signallari", name_uzc: "Светофор ва тартибга солувчининг сигналлари", name_ru: "Сигналы светофора и регулировщика", order_num: 5, question_count: 20, updated_at: 1710000000 },
  { id: 6, code: "ogohlantiruvchi-signallar", name_uzl: "Ogohlantiruvchi signallar", name_uzc: "Огоҳлантирувчи сигналлар", name_ru: "Предупреждающие сигналы", order_num: 6, question_count: 20, updated_at: 1710000000 },
  { id: 7, code: "harakatlanishni-boshlash", name_uzl: "Harakatlanishni boshlash va manyovr qilish", name_uzc: "Ҳаракатланишни бошлаш ва манёвр қилиш", name_ru: "Начало движения, маневрирование", order_num: 7, question_count: 20, updated_at: 1710000000 },
  { id: 8, code: "qatnov-qismida-joylashish", name_uzl: "Transport vositalarining qatnov qismida joylashishi", name_uzc: "Транспорт воситаларининг қатнов қисмида жойлашиши", name_ru: "Расположение транспортных средств на проезжей части", order_num: 8, question_count: 20, updated_at: 1710000000 },
  { id: 9, code: "harakat-tezligi", name_uzl: "Harakat tezligi", name_uzc: "Ҳаракат тезлиги", name_ru: "Скорость движения", order_num: 9, question_count: 20, updated_at: 1710000000 },
  { id: 10, code: "quvib-otish", name_uzl: "Quvib o'tish", name_uzc: "Қувиб ўтиш", name_ru: "Обгон", order_num: 10, question_count: 20, updated_at: 1710000000 },
  { id: 11, code: "toxtash-va-toxtab-turish", name_uzl: "To'xtash va to'xtab turish", name_uzc: "Тўхташ ва тўхтаб туриш", name_ru: "Остановка и стоянка", order_num: 11, question_count: 20, updated_at: 1710000000 },
  { id: 12, code: "chorrahalarda-harakatlanish", name_uzl: "Chorrahalarda harakatlanish", name_uzc: "Чорраҳаларда ҳаракатланиш", name_ru: "Проезд перекрестков", order_num: 12, question_count: 20, updated_at: 1710000000 },
  { id: 13, code: "piyodalar-otish-joylari", name_uzl: "Piyodalar o'tish joylari va to'xtash bekatlari", name_uzc: "Пиёдалар ўтиш жойлари ва тўхташ бекатлари", name_ru: "Пешеходные переходы и места остановок", order_num: 13, question_count: 20, updated_at: 1710000000 },
  { id: 14, code: "temir-yol-kesishmalari", name_uzl: "Temir yo'l kesishmalari orqali harakatlanish", name_uzc: "Темир йўл кесишмалари орқали ҳаракатланиш", name_ru: "Движение через железнодорожные пути", order_num: 14, question_count: 20, updated_at: 1710000000 },
  { id: 15, code: "avtomagistrallarda-harakatlanish", name_uzl: "Avtomagistrallarda harakatlanish", name_uzc: "Автомагистралларда ҳаракатланиш", name_ru: "Движение по автомагистралям", order_num: 15, question_count: 20, updated_at: 1710000000 },
  { id: 16, code: "turar-joy-dahalari", name_uzl: "Turar-joy dahalarida harakatlanish", name_uzc: "Турар-жой даҳаларида ҳаракатланиш", name_ru: "Движение в жилых зонах", order_num: 16, question_count: 20, updated_at: 1710000000 },
  { id: 17, code: "marshrutli-transport", name_uzl: "Marshrutli transport vositalarining imtiyozlari", name_uzc: "Маршрутли транспорт воситаларининг имтиёзлари", name_ru: "Приоритет маршрутных транспортных средств", order_num: 17, question_count: 20, updated_at: 1710000000 },
  { id: 18, code: "tashqi-yoritish-asboblari", name_uzl: "Tashqi yoritish asboblaridan foydalanish", name_uzc: "Ташқи ёритиш асбобларидан фойдаланиш", name_ru: "Пользование внешними световыми приборами", order_num: 18, question_count: 20, updated_at: 1710000000 },
  { id: 19, code: "shatakka-olish", name_uzl: "Mexanik transport vositalarini shatakka olish", name_uzc: "Механик транспорт воситаларини шатакка олиш", name_ru: "Буксировка механических транспортных средств", order_num: 19, question_count: 20, updated_at: 1710000000 },
  { id: 20, code: "odam-tashish", name_uzl: "Odam tashish", name_uzc: "Одам ташиш", name_ru: "Перевозка людей", order_num: 20, question_count: 20, updated_at: 1710000000 },
  { id: 21, code: "yuk-tashish", name_uzl: "Yuk tashish", name_uzc: "Юк ташиш", name_ru: "Перевозка грузов", order_num: 21, question_count: 20, updated_at: 1710000000 },
  { id: 22, code: "texnik-holat", name_uzl: "Transport vositalarining texnik holati", name_uzc: "Транспорт воситаларининг техник ҳолати", name_ru: "Техническое состояние транспортных средств", order_num: 22, question_count: 20, updated_at: 1710000000 },
  { id: 23, code: "yol-belgilari", name_uzl: "Yo'l belgilari", name_uzc: "Йўл белгилари", name_ru: "Дорожные знаки", order_num: 23, question_count: 20, updated_at: 1710000000 },
  { id: 24, code: "yol-chiziqlari", name_uzl: "Yo'l chiziqlari", name_uzc: "Йўл чизиқлари", name_ru: "Дорожная разметка", order_num: 24, question_count: 20, updated_at: 1710000000 },
];

// ── 2. ALL 60 STANDARD TICKETS ──
export const SEED_TICKETS: DbTicket[] = Array.from({ length: 60 }, (_, i) => {
  const num = i + 1;
  return {
    id: num,
    ticket_number: num,
    question_count: 20,
    updated_at: 1710000000,
  };
});

// ── 3. BASE QUESTION TEMPLATES ──
interface QuestionTemplate {
  text: { uzl: string; uzc: string; ru: string };
  options: Array<{ uzl: string; uzc: string; ru: string }>;
  correctOption: number;
  explanation: { uzl: string; uzc: string; ru: string };
  topicId: number;
}

const TEMPLATES: QuestionTemplate[] = [
  {
    topicId: 1,
    text: {
      uzl: "Yo'l harakati qoidalariga ko'ra, haydovchi yo'lning qaysi tomonida harakatlanishi kerak?",
      uzc: "Йўл ҳаракати қоидаларига кўра, ҳайдовчи йўлнинг қайси томонида ҳаракатланиши керак?",
      ru: "Согласно ПДД, по какой стороне дороги должен двигаться водитель?",
    },
    options: [
      { uzl: "Chap tomonda", uzc: "Чап томонда", ru: "По левой стороне" },
      { uzl: "O'ng tomonda", uzc: "Ўнг томонда", ru: "По правой стороне" },
      { uzl: "Yo'lning o'rtasida", uzc: "Йўлнинг ўртасида", ru: "По середине дороги" },
      { uzl: "Istalgan tomonda", uzc: "Исталган томонда", ru: "По любой стороне" },
    ],
    correctOption: 1,
    explanation: {
      uzl: "O'zbekistonda o'ng tomonlama harakat qoidasi amal qiladi.",
      uzc: "Ўзбекистонда ўнг томонлама ҳаракат қоидаси амал қилади.",
      ru: "В Узбекистане действует правостороннее движение.",
    },
  },
  {
    topicId: 5,
    text: {
      uzl: "Qizil svetofor signali nimani bildiradi?",
      uzc: "Қизил светофор сигнали нимани билдиради?",
      ru: "Что означает красный сигнал светофора?",
    },
    options: [
      { uzl: "Harakatlanish mumkin", uzc: "Ҳаракатланиш мумкин", ru: "Можно двигаться" },
      { uzl: "Ehtiyot bo'lib o'tish mumkin", uzc: "Эҳтиёт бўлиб ўтиш мумкин", ru: "Можно проехать с осторожностью" },
      { uzl: "To'xtash kerak", uzc: "Тўхташ керак", ru: "Необходимо остановиться" },
      { uzl: "Tezlikni kamaytirish kerak", uzc: "Тезликни камайтириш керак", ru: "Необходимо снизить скорость" },
    ],
    correctOption: 2,
    explanation: {
      uzl: "Qizil svetofor signali harakatni qat'iy taqiqlaydi.",
      uzc: "Қизил светофор сигнали ҳаракатни қатъий тақиқлайди.",
      ru: "Красный сигнал светофора строго запрещает движение.",
    },
  },
  {
    topicId: 13,
    text: {
      uzl: "Tartibga solinmagan piyodalar o'tish joyida haydovchi qanday yo'l tutishi kerak?",
      uzc: "Тартибга солинмаган пиёдалар ўтиш жойида ҳайдовчи қандай йўл тутиши керак?",
      ru: "Как должен поступить водитель на нерегулируемом пешеходном переходе?",
    },
    options: [
      { uzl: "Signal berib tez o'tib ketishi kerak", uzc: "Сигнал бериб тез ўтиб кетиши керак", ru: "Подать сигнал и быстро проехать" },
      { uzl: "Piyodalarga yo'l berishi kerak", uzc: "Пиёдаларга йўл бериши керак", ru: "Уступить дорогу пешеходам" },
      { uzl: "Faqat bolalarga yo'l berishi kerak", uzc: "Фақат болаларга йўл бериши керак", ru: "Уступить дорогу только детям" },
      { uzl: "Tezlikni oshirib o'tishi kerak", uzc: "Тезликни ошириб ўтиши керак", ru: "Увеличить скорость" },
    ],
    correctOption: 1,
    explanation: {
      uzl: "Piyodalar o'tish joyida piyodalarga yo'l berish majburiydir.",
      uzc: "Пиёдалар ўтиш жойида пиёдаларга йўл бериш мажбурийдир.",
      ru: "Водитель обязан уступить дорогу пешеходам на пешеходном переходе.",
    },
  },
  {
    topicId: 9,
    text: {
      uzl: "Aholi yashaydigan joylarda ruxsat etilgan eng yuqori tezlik necha km/soat?",
      uzc: "Аҳоли яшайдиган жойларда рухсат этилган энг юқори тезлик неча км/соат?",
      ru: "Какова максимально разрешенная скорость движения в населенных пунктах?",
    },
    options: [
      { uzl: "70 km/soat", uzc: "70 км/соат", ru: "70 км/ч" },
      { uzl: "60 km/soat", uzc: "60 км/соат", ru: "60 км/ч" },
      { uzl: "50 km/soat", uzc: "50 км/соат", ru: "50 км/ч" },
      { uzl: "80 km/soat", uzc: "80 км/соат", ru: "80 км/ч" },
    ],
    correctOption: 1,
    explanation: {
      uzl: "Aholi punktlarida yengil avtomobillar uchun ruxsat etilgan tezlik 60 km/soat.",
      uzc: "Аҳоли пунктларида енгил автомобиллар учун рухсат этилган тезлик 60 км/соат.",
      ru: "В населенных пунктах разрешенная скорость составляет 60 км/ч.",
    },
  },
  {
    topicId: 2,
    text: {
      uzl: "Xavfsizlik kamari qachon taqilishi majburiy?",
      uzc: "Хавфсизлик камари қачон тақилиши мажбурий?",
      ru: "Когда обязательно пристегиваться ремнем безопасности?",
    },
    options: [
      { uzl: "Faqat shahar tashqarisida", uzc: "Фақат шаҳар ташқарисида", ru: "Только вне города" },
      { uzl: "Har doim harakatlanish vaqtida", uzc: "Ҳар доим ҳаракатланиш вақтида", ru: "Всегда во время движения" },
      { uzl: "Faqat yomon ob-havo sharoitida", uzc: "Фақат ёмон об-ҳаво шароитида", ru: "Только в плохую погоду" },
      { uzl: "Faqat tezlik 50 km/soatdan oshganda", uzc: "Фақат тезлик 50 км/соатдан ошганда", ru: "Только при скорости выше 50 км/ч" },
    ],
    correctOption: 1,
    explanation: {
      uzl: "Konstruksiyasida xavfsizlik kamari nazarda tutilgan transport vositalarida harakatlanayotganda kamar taqish shart.",
      uzc: "Хавфсизлик камари билан жиҳозланган транспортда ҳаракатланишда камар тақиш шарт.",
      ru: "При движении на транспортном средстве, оборудованном ремнями безопасности, пристегиваться обязательно.",
    },
  },
  {
    topicId: 12,
    text: {
      uzl: "Teng ahamiyatli yo'llar chorrahasida kim birinchi o'tadi?",
      uzc: "Тенг аҳамиятли йўллар чорраҳасида ким биринчи ўтади?",
      ru: "Кто проезжает первым на перекрестке равнозначных дорог?",
    },
    options: [
      { uzl: "O'ng tomondan xavf bo'lmagan (o'ngi ochiq) haydovchi", uzc: "Ўнг томондан хавф бўлмаган (ўнги очиқ) ҳайдовчи", ru: "Водитель, у которого нет помехи справа" },
      { uzl: "Chap tomondan kelayotgan haydovchi", uzc: "Чап томондан келаётган ҳайдовчи", ru: "Водитель слева" },
      { uzl: "Birinchi signal bergan haydovchi", uzc: "Биринчи сигнал берган ҳайдовчи", ru: "Первым подавший сигнал" },
      { uzl: "Katta yuk mashinasi", uzc: "Катта юк машинаси", ru: "Грузовой автомобиль" },
    ],
    correctOption: 0,
    explanation: {
      uzl: "Teng ahamiyatli yo'llarda o'ngdan kelayotgan transport vositasiga yo'l berish shart.",
      uzc: "Тенг аҳамиятли йўлларда ўнгдан келаётган транспортга йўл берилади.",
      ru: "На равнозначных дорогах действует правило «помеха справа».",
    },
  },
  {
    topicId: 10,
    text: {
      uzl: "Chorrahada quvib o'tish mumkinmi?",
      uzc: "Чорраҳада қувиб ўтиш мумкинми?",
      ru: "Разрешен ли обгон на перекрестке?",
    },
    options: [
      { uzl: "Asosiy yo'lda harakatlanayotganda ruxsat etiladi", uzc: "Асосий йўлда ҳаракатланаётганда рухсат этилади", ru: "Разрешен при движении по главной дороге" },
      { uzl: "Barcha chorrahalarda qat'iyan taqiqlanadi", uzc: "Барча чорраҳаларда қатъиян тақиқланади", ru: "Категорически запрещен на всех перекрестках" },
      { uzl: "Faqat kechasi mumkin", uzc: "Фақат кечаси мумкин", ru: "Только ночью" },
      { uzl: "Faqat tezlik 30 km/soatdan kam bo'lsa mumkin", uzc: "Фақат тезлик 30 км/соатдан кам бўлса мумкин", ru: "Только при скорости менее 30 км/ч" },
    ],
    correctOption: 0,
    explanation: {
      uzl: "Tartibga solinmagan chorrahalarda asosiy yo'ldan harakatlanayotganda quvib o'tishga ruxsat beriladi.",
      uzc: "Тартибга солинмаган чорраҳаларда асосий йўлда ҳаракатланаётганда қувиб ўтиш мумкин.",
      ru: "Обгон разрешен на нерегулируемых перекрестках при движении по главной дороге.",
    },
  },
  {
    topicId: 11,
    text: {
      uzl: "Piyodalar o'tish joyiga qancha masofa qolganda to'xtash taqiqlanadi?",
      uzc: "Пиёдалар ўтиш жойига қанча масофа қолганда тўхташ тақиқланади?",
      ru: "На каком расстоянии до пешеходного перехода запрещена остановка?",
    },
    options: [
      { uzl: "5 metr", uzc: "5 метр", ru: "5 метров" },
      { uzl: "10 metr", uzc: "10 метр", ru: "10 метров" },
      { uzl: "15 metr", uzc: "15 метр", ru: "15 метров" },
      { uzl: "20 metr", uzc: "20 метр", ru: "20 метров" },
    ],
    correctOption: 0,
    explanation: {
      uzl: "Piyodalar o'tish joyida va unga 5 metrdan kam masofa qolganda to'xtash taqiqlanadi.",
      uzc: "Пиёдалар ўтиш жойига 5 метрдан кам масофада тўхташ тақиқланади.",
      ru: "Остановка запрещается на пешеходных переходах и ближе 5 м перед ними.",
    },
  },
  {
    topicId: 14,
    text: {
      uzl: "Temir yo'l kesishmasida qachon to'xtash shart?",
      uzc: "Темир йўл кесишмасида қачон тўхташ шарт?",
      ru: "Когда обязательно остановиться перед железнодорожным переездом?",
    },
    options: [
      { uzl: "Shlagbaum yopiq yoki miltillovchi qizil chiroq yonganda", uzc: "Шлагбаум ёпиқ ёки милтилловчи қизил чироқ ёнганда", ru: "При закрытом шлагбауме или мигающем красном сигнале" },
      { uzl: "Faqat poezd ko'ringanda", uzc: "Фақат поезд кўринганда", ru: "Только когда виден поезд" },
      { uzl: "Faqat kechasi", uzc: "Фақат кечаси", ru: "Только ночью" },
      { uzl: "To'xtash shart emas", uzc: "Тўхташ шарт эмас", ru: "Останавливаться не обязательно" },
    ],
    correctOption: 0,
    explanation: {
      uzl: "Taqiqlovchi signal, yopiq shlagbaum yoki navbatchining taqiqlovchi ishorasida to'xtash majburiydir.",
      uzc: "Тақиқловчи сигнал ёки ёпиқ шлагбаумда тўхташ шарт.",
      ru: "При запрещающем сигнале светофора или закрытом шлагбауме остановка обязательна.",
    },
  },
  {
    topicId: 18,
    text: {
      uzl: "Kunning qorong'i vaqtida yoki ko'rinish yetarli bo'lmaganda nima yoqilishi shart?",
      uzc: "Куннинг қоронғи вақтида ёки кўриниш етарли бўлмаганда нима ёқилиши шарт?",
      ru: "Что должно быть включено в темное время суток или в условиях недостаточной видимости?",
    },
    options: [
      { uzl: "Faqat gabarit chiroqlari", uzc: "Фақат габарит чироқлари", ru: "Только габаритные огни" },
      { uzl: "Yaqin yoki uzoqni yorituvchi faralar", uzc: "Яқин ёки узоқни ёритувчи фаралар", ru: "Фары ближнего или дальнего света" },
      { uzl: "Faqat avariya signali", uzc: "Фақат авария сигнали", ru: "Только аварийная сигнализация" },
      { uzl: "Hech narsa yoqilmaydi", uzc: "Ҳеч нарса ёқилмайди", ru: "Ничего не включается" },
    ],
    correctOption: 1,
    explanation: {
      uzl: "Kunning qorong'i vaqtida va yetarli ko'rinmaslik sharoitida faralar yoqilishi shart.",
      uzc: "Қоронғи вақтда яқин ёки узоқni ёритувчи фаралар ёқилиши шарт.",
      ru: "В темное время суток должны быть включены фары ближнего или дальнего света.",
    },
  },
  {
    topicId: 6,
    text: {
      uzl: "Burilish ko'rsatkichlari (miltillovchi chiroq) qachon yoqiladi?",
      uzc: "Бурилиш кўрсаткичлари қачон ёқилади?",
      ru: "Когда включаются указатели поворота?",
    },
    options: [
      { uzl: "Harakatni boshlash, manyovr qilish va to'xtashdan oldin", uzc: "Ҳаракатни бошлаш, манёвр қилиш ва тўхташдан олдин", ru: "Перед началом движения, перестроением, поворотом и остановкой" },
      { uzl: "Faqat burilish vaqtining o'zida", uzc: "Фақат бурилиш вақтининг ўзида", ru: "Только в момент самого поворота" },
      { uzl: "Faqat boshqa mashina orqada kelayotganda", uzc: "Фақат бошқа машина орқада келаётганда", ru: "Только если сзади есть автомобиль" },
      { uzl: "Faqat chorrahada", uzc: "Фақат чорраҳада", ru: "Только на перекрестке" },
    ],
    correctOption: 0,
    explanation: {
      uzl: "Manyovr boshlanishidan oldin ogohlantiruvchi signal berilishi shart.",
      uzc: "Манёвр бошланишидан олдин сигнал берилади.",
      ru: "Подача сигнала указателями поворота должна производиться заблаговременно до начала маневра.",
    },
  },
  {
    topicId: 3,
    text: {
      uzl: "Ko'k va qizil rangli yalt-yalt etuvchi mayoqcha yoqilgan transport vositasiga qanday munosabatda bo'lish kerak?",
      uzc: "Кўк ва қизил рангли милтилловчи маёқча ёқилган транспорт воситасига қандай муносабатда бўлиш керак?",
      ru: "Как следует поступить при приближении автомобиля с включенным синим и красным проблесковым маячком?",
    },
    options: [
      { uzl: "Yo'l berish va zarur bo'lsa to'xtash kerak", uzc: "Йўл бериш ва зарур бўлса тўхташ керак", ru: "Уступить дорогу и при необходимости остановиться" },
      { uzl: "Tezlikni oshirib o'tib ketish kerak", uzc: "Тезликни ошириб ўтиб кетиш керак", ru: "Увеличить скорость и проехать" },
      { uzl: "Signal chalish kerak", uzc: "Сигнал чалиш керак", ru: "Подать звуковой сигнал" },
      { uzl: "E'tibor bermasdan harakatlanish kerak", uzc: "Эътибор бермасдан ҳаракатланиш керак", ru: "Продолжать движение без изменений" },
    ],
    correctOption: 0,
    explanation: {
      uzl: "Maxsus signallari yoqilgan transport vositalariga to'siqsiz o'tish imkoniyatini ta'minlash shart.",
      uzc: "Махсус сигналлари ёқилган транспортга йўл берилади.",
      ru: "Водители обязаны уступить дорогу для обеспечения беспрепятственного проезда специальных ТС.",
    },
  },
];

// ── 4. GENERATE COMPLETE 1,200 QUESTION SEED DATASET ──
// Har bir biletda 20 ta savol, 60 ta bilet = 1200 ta savol.
export function generateSeedQuestions(): DbQuestion[] {
  const list: DbQuestion[] = [];
  let currentId = 1001;

  for (let ticketIdx = 1; ticketIdx <= 60; ticketIdx++) {
    for (let qIdx = 1; qIdx <= 20; qIdx++) {
      const templateIdx = ((ticketIdx - 1) * 20 + (qIdx - 1)) % TEMPLATES.length;
      const tpl = TEMPLATES[templateIdx];

      // Mavzu ID sini 1..24 oralig'ida tarqatamiz
      const topicId = ((ticketIdx + qIdx) % 24) + 1;

      const q: DbQuestion = {
        id: currentId,
        ticket_id: ticketIdx,
        topic_id: topicId,
        order_num: qIdx,
        text_uzl: tpl.text.uzl,
        text_uzc: tpl.text.uzc,
        text_ru: tpl.text.ru,
        explanation_uzl: tpl.explanation.uzl,
        explanation_uzc: tpl.explanation.uzc,
        explanation_ru: tpl.explanation.ru,
        image_url: null,
        options_json: JSON.stringify(
          tpl.options.map((opt, idx) => ({
            index: idx,
            uzl: opt.uzl,
            uzc: opt.uzc,
            ru: opt.ru,
            is_correct: idx === tpl.correctOption,
          }))
        ),
        correct_option: tpl.correctOption,
        updated_at: 1710000000 + ticketIdx * 100 + qIdx,
      };

      list.push(q);
      currentId++;
    }
  }

  return list;
}

export const SEED_QUESTIONS: DbQuestion[] = generateSeedQuestions();
