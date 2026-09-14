import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";
import "./index.css";
import "./styles/desktop.css";
import { theme } from "./theme";

import { Notifications } from "@mantine/notifications";
import { NavigationProgress } from "@mantine/nprogress";
import { SWRConfig } from "swr";
import api from "./api/api.ts";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ENV } from "./config/env.ts";

interface RetryableError {
  response?: { status?: number };
}

/*
 * `web-vitals` bog'liqligi o'rnatilgan edi, ammo hech qayerda ishlatilmagan.
 * Analitika backendi yo'q, shuning uchun ko'rsatkichlar faqat DEV rejimida
 * konsolga chiqariladi (tarmoqqa hech narsa yuborilmaydi).
 * `import.meta.env.DEV` production build'da `false` ga almashadi va bu blok
 * butunlay tree-shake qilinadi — prod bundle'ga ta'siri yo'q.
 */
if (import.meta.env.DEV) {
  import("./utils/webVitals")
    .then(({ reportWebVitals }) => reportWebVitals())
    .catch(() => { /* reporter ixtiyoriy — xato bo'lsa jim o'tamiz */ });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={ENV.GOOGLE_CLIENT_ID}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <SWRConfig
          value={{
            fetcher: (url: string) => api.get(url).then((res) => res.data),
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryCount: 3,
            dedupingInterval: 5000,
            /*
             * Ro'yxat/filtr o'zgarganda ekran bo'sh holatga tushib ketmasin —
             * eski ma'lumot yangisi kelguncha ko'rinib turadi (layout shift yo'q).
             */
            keepPreviousData: true,
            /*
             * BUG FIX: avval faqat `errorRetryCount: 3` bor edi, ya'ni SWR
             * 401/403/404 kabi mijoz xatolarida ham 3 marta qayta urinardi.
             * Bu foydasiz trafik + 401 holatida interceptor'ni bir necha bor
             * ishga tushirib, logout oqimini takrorlardi.
             * Endi 4xx da umuman qayta urinilmaydi.
             */
            onErrorRetry: (error, _key, config, revalidate, { retryCount }) => {
              const status = (error as RetryableError)?.response?.status;
              if (typeof status === "number" && status >= 400 && status < 500) {
                return;
              }
              if (retryCount >= (config.errorRetryCount ?? 3)) return;
              // Eksponensial kechikish (1s, 2s, 4s)
              setTimeout(
                () => revalidate({ retryCount }),
                1000 * 2 ** retryCount,
              );
            },
          }}
        >
          {/* Lazy route chunk yuklanayotganda tepada progress bar */}
          <NavigationProgress />
          {/*
            `limit` — bir vaqtda ko'rinadigan bildirishnomalar soni.
            Avval cheklov yo'q edi: tarmoq uzilganda o'nlab toast ekranni
            to'ldirib, imtihon interfeysini bosib qo'yishi mumkin edi.
            Pozitsiya Mantine defaultida qoldirildi (vizual o'zgarish yo'q).
          */}
          <Notifications limit={3} autoClose={4000} />
          <App />
        </SWRConfig>
      </MantineProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
