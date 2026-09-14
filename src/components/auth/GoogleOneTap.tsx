/**
 * Google One Tap Login Component
 *
 * Autentifikatsiya bo'lmagan barcha sahifalarda Google One Tap popupni ko'rsatadi.
 * Faqat OAuth callback va reset-password sahifalarida ko'rsatilmaydi.
 * Logout dan keyin qayta ko'rsatiladi.
 * Har sahifaga o'tganda prompt qayta chaqiriladi (SPA navigatsiya uchun).
 * GSI yuklanmasa — boshqa login usullari ta'sirlanmaydi (silent fail).
 */

import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { ENV } from "../../config/env";
import api from "../../api/api";
import { getErrorMessage } from "../../types/errors";

// ----- Google GSI type declarations -----
interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface PromptMomentNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    auto_select?: boolean;
    context?: string;
    itp_support?: boolean;
  }): void;
  prompt(momentListener?: (notification: PromptMomentNotification) => void): void;
  cancel(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}
// ----------------------------------------

const GSI_SCRIPT_ID = "google-gsi-script";
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

/**
 * One Tap ko'rsatilmaydigan sahifalar — bu sahifalarda o'zlarining auth oqimlari bor.
 */
const EXCLUDED_PATHS = [
  "/auth/telegram-callback",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export function GoogleOneTap() {
  const { isAuthenticated, login: authLogin } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // GSI bir marta initialize qilinganini kuzatadi
  const gsiInitializedRef = useRef(false);
  // Joriy handleCredential ni ref da saqlash — stale closure muammosidan qochish
  const handleCredentialRef = useRef<((r: CredentialResponse) => Promise<void>) | null>(null);

  const isExcluded = EXCLUDED_PATHS.some((p) => location.pathname.startsWith(p));
  const shouldShow = !isAuthenticated && !!ENV.GOOGLE_CLIENT_ID && !isExcluded;

  // handleCredential ni doim yangilab turish (i18n, navigate, t o'zgarganda ham)
  useEffect(() => {
    handleCredentialRef.current = async (response: CredentialResponse) => {
      try {
        const apiResponse = await api.post("/api/v1/auth/google", {
          idToken: response.credential,
        });

        if (apiResponse.data.success) {
          const userLang = apiResponse.data.data.user?.preferredLanguage;
          if (userLang) {
            i18n.changeLanguage(userLang.toLowerCase());
          }
          authLogin(apiResponse.data.data);
          navigate("/me", { replace: true });
          notifications.show({
            title: t("auth.google.successTitle"),
            message: t("auth.google.successMessage"),
            color: "green",
            withBorder: true,
          });
        }
      } catch (err: unknown) {
        notifications.show({
          color: "red",
          title: t("common.error"),
          message: getErrorMessage(err, t("auth.google.errorMessage")),
        });
      }
    };
  }); // har render da yangilanadi — stale closure yo'q

  // Stable prompt funksiyasi
  const showPrompt = useCallback(() => {
    window.google?.accounts?.id?.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.debug("[GoogleOneTap] Not displayed:", notification.getNotDisplayedReason());
      }
    });
  }, []);

  // Logout bo'lganda reset — isAuthenticated false bo'lganda
  useEffect(() => {
    if (!isAuthenticated) {
      gsiInitializedRef.current = false;
      window.google?.accounts?.id?.cancel();
    }
  }, [isAuthenticated]);

  // GSI yuklab, bir marta initialize qilish
  // use_fedcm_for_prompt olib tashlandi — Firefox/Safari da ishlamaydi va promptni bloklaydi
  useEffect(() => {
    if (!shouldShow) {
      window.google?.accounts?.id?.cancel();
      return;
    }

    // Wrapper: doim eng so'nggi handleCredential ni chaqiradi
    function callbackWrapper(response: CredentialResponse) {
      handleCredentialRef.current?.(response);
    }

    function initGSI() {
      if (!window.google?.accounts?.id) return;

      // initialize() faqat bir marta chaqiriladi (Google GSI talabi)
      if (!gsiInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: ENV.GOOGLE_CLIENT_ID,
          callback: callbackWrapper,
          cancel_on_tap_outside: false,
          auto_select: true,
          context: "signin",
          itp_support: true,
        });
        gsiInitializedRef.current = true;
      }

      showPrompt();
    }

    // GSI allaqachon yuklangan bo'lsa — darhol ishga tushuramiz
    if (window.google?.accounts?.id) {
      initGSI();
      return () => {
        window.google?.accounts?.id?.cancel();
      };
    }

    // Script DOM da bormi?
    let script = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = GSI_SCRIPT_ID;
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.warn("[GoogleOneTap] GSI script yuklanmadi — One Tap o'chirildi");
      };
      document.head.appendChild(script);
    }

    script.addEventListener("load", initGSI, { once: true });

    // Race condition: addEventListener va window.google tekshiruvi orasida yuklangan bo'lsa
    if (window.google?.accounts?.id) {
      script.removeEventListener("load", initGSI);
      initGSI();
    }

    return () => {
      script?.removeEventListener("load", initGSI);
      window.google?.accounts?.id?.cancel();
    };
  }, [shouldShow, showPrompt]);

  // SPA navigatsiyada har sahifaga o'tganda prompt qayta ko'rsatiladi
  // Bu holat: GSI allaqachon initialize qilingan, faqat prompt qayta kerak
  useEffect(() => {
    if (!shouldShow || !gsiInitializedRef.current) return;
    showPrompt();
  }, [location.pathname, shouldShow, showPrompt]);

  return null;
}

export default GoogleOneTap;
