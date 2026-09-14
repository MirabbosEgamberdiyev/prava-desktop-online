// Re-export from centralized LanguageContext for 100% reactive state across all components
export {
  useLanguage,
  normalizeLanguage,
  APP_LANGUAGES,
  type AppLanguage,
  type LanguageOption,
  type LanguageContextType,
} from "../context/LanguageContext";

export { getLocalizedText } from "../context/LanguageContext";
