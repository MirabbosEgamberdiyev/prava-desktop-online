// Environment configuration
export const ENV = {
  GOOGLE_CLIENT_ID:
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "237372892439-4bju17u6k3cjoil26p148m21ilmecd9s.apps.googleusercontent.com",
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "https://pravaonline.uz",
  TELEGRAM_BOT_ID: Number(import.meta.env.VITE_TELEGRAM_BOT_ID) || 8485868847,
  TELEGRAM_BOT_USERNAME:
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "pravaonlineuzbot",
};
