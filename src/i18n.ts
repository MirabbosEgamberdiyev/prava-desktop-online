import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import uzl from "./locales/uzl/translation.json";
import uzc from "./locales/uzc/translation.json";
import ru from "./locales/ru/translation.json";
import en from "./locales/en/translation.json";

const LANG_KEY = "prava_lang";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      uzl: { translation: uzl },
      uzc: { translation: uzc },
      ru:  { translation: ru },
      en:  { translation: en },
    },
    lng: localStorage.getItem(LANG_KEY) || "uzl",
    fallbackLng: "uzl",
    interpolation: { escapeValue: false },
  });

export function setLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem(LANG_KEY, lang);
}

export const LANGUAGES = [
  { code: "uzl", label: "O'zbek",  flag: "🇺🇿" },
  { code: "uzc", label: "Ўзбек",   flag: "🇺🇿" },
  { code: "ru",  label: "Русский", flag: "🇷🇺" },
  { code: "en",  label: "English", flag: "🇬🇧" },
];

export default i18n;
