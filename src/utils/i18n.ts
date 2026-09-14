// utils/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

/** Build-time stamp — har deploy paytida yangi → cache bypass */
const BUILD_VERSION = String(__BUILD_TIME__ ?? Date.now());

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["uzl", "uzc", "ru"],
    fallbackLng: "uzl",
    preload: ["uzl", "uzc", "ru"], // Preload all 3 languages into memory immediately for <10ms switches
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "cookie", "navigator"],
      lookupLocalStorage: "prava_lang",
      lookupCookie: "i18next",
      caches: ["localStorage", "cookie"],
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
      queryStringParams: { v: BUILD_VERSION },
    },
    react: {
      useSuspense: false,
      bindI18n: "languageChanged loaded",
      bindI18nStore: "added removed",
    },
  });

export default i18n;
