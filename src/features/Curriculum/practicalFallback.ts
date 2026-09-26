/** Official 12 autodrom exercises — offline fallback (ported from the web app). */
export interface ExerciseFallback {
  number: number;
  title: { uzl: string; uzc: string; ru: string };
  description: { uzl: string; uzc: string; ru: string };
}

export const PRACTICAL_EXERCISES_FALLBACK: ExerciseFallback[] = [
  {
    number: 1,
    title: {
      uzl: "Harakatni boshlash (START)",
      uzc: "Ҳаракатни бошлаш (СТАРТ)",
      ru: "Начало движения (СТАРТ)",
    },
    description: {
      uzl: "Start chizig'ida to'xtab, chapga burilish chirog'ini yoqib harakatni boshlash.",
      uzc: "Старт чизиғида тўхтаб, чапга бурилиш чироғини ёқиб ҳаракатни бошлаш.",
      ru: "Остановиться у линии старта, включить левый указатель поворота и начать движение.",
    },
  },
  {
    number: 2,
    title: {
      uzl: "Piyodalar o'tish joyi",
      uzc: "Пиёдалар ўтиш жойи",
      ru: "Пешеходный переход",
    },
    description: {
      uzl: "Piyodalar o'tish joyi oldida piyodaga yo'l berish va to'xtash.",
      uzc: "Пиёдалар ўтиш жойи олдида пиёдага йўл бериш ва тўхташ.",
      ru: "Уступить дорогу пешеходу перед пешеходным переходом и остановиться.",
    },
  },
  {
    number: 3,
    title: {
      uzl: "To'xtash va tik balandlikka ko'tarilish (Estakada)",
      uzc: "Тўхташ ва тик баландликка кўтарилиш (Эстакада)",
      ru: "Остановка и трогание на подъёме (Эстакада)",
    },
    description: {
      uzl: "Estakadada to'xtash, orqaga 20 sm dan ortiq ketmasdan siljish.",
      uzc: "Эстакадада тўхташ, орқага 20 см дан ортиқ кетмасдан силжиш.",
      ru: "Остановка на эстакаде (подъеме), начало движения без отката назад более чем на 20 см.",
    },
  },
  {
    number: 4,
    title: {
      uzl: "90 gradus burchak ostida burilishlar",
      uzc: "90 градус бурчак остида бурилишлар",
      ru: "Повороты под углом 90 градусов",
    },
    description: {
      uzl: "90 gradus burchak ostida o'ng va chap tomonga aniq burilish.",
      uzc: "90 градус бурчак остида ўнг ва чап томонга аниқ бурилиш.",
      ru: "Повороты под углом 90 градусов направо и налево без заезда на ограничители.",
    },
  },
  {
    number: 5,
    title: {
      uzl: "Ilon izi",
      uzc: "Илон изи",
      ru: "Змейка",
    },
    description: {
      uzl: "Konuslarni urmasdan ilon izi bo'ylab ravon o'tish.",
      uzc: "Конусларни урмасдан илон изи бўйлаб равон ўтиш.",
      ru: "Плавное прохождение «змейки» без сбивания конусов и наезда на линии разметки.",
    },
  },
  {
    number: 6,
    title: {
      uzl: "Harakat tartibga solingan chorraha",
      uzc: "Ҳаракат тартибга солинган чорраҳа",
      ru: "Регулируемый перекрёсток",
    },
    description: {
      uzl: "Svetoforning ruxsat etuvchi ishorasida chorrahani kesib o'tish.",
      uzc: "Светофорнинг рухсат этувчи ишорасида чорраҳани кесиб ўтиш.",
      ru: "Проезд регулируемого перекрестка на разрешающий сигнал светофора.",
    },
  },
  {
    number: 7,
    title: {
      uzl: "Tor joyda qayrilib olish uchun boksga kirish",
      uzc: "Тор жойда қайрилиб олиш учун боксга кириш",
      ru: "Въезд в бокс для разворота в ограниченном пространстве",
    },
    description: {
      uzl: "Tor maydonda 90 gradus burchak ostida orqaga burilib boksga kirish.",
      uzc: "Тор майдонда 90 градус бурчак остида орқага бурилиб боксга кириш.",
      ru: "Въезд в бокс (гараж) задним ходом под углом 90 градусов в ограниченном пространстве.",
    },
  },
  {
    number: 8,
    title: {
      uzl: "Temir yo'l kesishmasi (tartibga solinmagan)",
      uzc: "Темир йўл кесишмаси (тартибга солинмаган)",
      ru: "Железнодорожный переезд (нерегулируемый)",
    },
    description: {
      uzl: "Temir yo'l kesishmasi to'xtash chizig'ida to'xtab, yo'l bo'shligiga ishonch hosil qilish.",
      uzc: "Темир йўл кесишмаси тўхташ чизиғида тўхтаб, йўл бўшлигига ишонч ҳосил қилиш.",
      ru: "Остановка перед стоп-линией железнодорожного переезда, оценка безопасности и возобновление движения.",
    },
  },
  {
    number: 9,
    title: {
      uzl: "Tezlashish bo'lagi",
      uzc: "Тезлашиш бўлаги",
      ru: "Участок разгона",
    },
    description: {
      uzl: "Tezlanish yo'lagida 30-40 km/soatgacha tezlanib, uzatmani almashtirish.",
      uzc: "Тезланиш йўлагида 30-40 км/соатгача тезланиб, узатмани алмаштириш.",
      ru: "Разгон на полосе разгона до 30-40 км/ч с переключением передачи и своевременным торможением.",
    },
  },
  {
    number: 10,
    title: {
      uzl: "Avariya holatda to'xtash",
      uzc: "Авария ҳолатда тўхташ",
      ru: "Аварийная остановка",
    },
    description: {
      uzl: "Avariya chiroqlarini yoqib, shoshilinch to'xtashni amalga oshirish.",
      uzc: "Авария чироқларини ёқиб, шошилинч тўхташни амалга ошириш.",
      ru: "Экстренное торможение с включением аварийной световой сигнализации.",
    },
  },
  {
    number: 11,
    title: {
      uzl: "Orqaga harakatlanib parallel to'xtash (Parkovka)",
      uzc: "Орқага ҳаракатланиб параллел тўхташ (Парковка)",
      ru: "Параллельная парковка задним ходом",
    },
    description: {
      uzl: "Ikki avtomobil orasiga orqa uzatma bilan parallel parkovka qilish.",
      uzc: "Икки автомобиль орасига орқа узатма билан параллел парковка қилиш.",
      ru: "Параллельная парковка задним ходом между двумя транспортными средствами.",
    },
  },
  {
    number: 12,
    title: {
      uzl: "Harakatni yakunlash (FINISH)",
      uzc: "Ҳаракатни якунлаш (ФИНИШ)",
      ru: "Завершение движения (ФИНИШ)",
    },
    description: {
      uzl: "Finish chizig'ida to'xtab, to'xtab turish tormozini (ruchnik) tortish va dvigatelni o'chirish.",
      uzc: "Финиш чизиғида тўхтаб, тўхтаб туриш тормозини (ручник) тортиш ва двигателни ўчириш.",
      ru: "Остановка у линии финиша, включение стояночного тормоза и выключение двигателя.",
    },
  },
];
