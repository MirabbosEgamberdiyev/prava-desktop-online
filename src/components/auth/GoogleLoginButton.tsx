import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";
import api from "../../api/api";
import { getErrorMessage } from "../../types/errors";

interface GoogleLoginButtonProps {
  mode?: "login" | "register";
  compact?: boolean;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.04 24.04 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const GoogleLoginButton = ({ mode = "login", compact = false }: GoogleLoginButtonProps) => {
  const { t, i18n } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/me";

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const response = await api.post("/api/v1/auth/google", {
          accessToken: tokenResponse.access_token,
        });

        if (response.data.success) {
          const userLang = response.data.data.user?.preferredLanguage;
          if (userLang) {
            i18n.changeLanguage(userLang);
          }

          authLogin(response.data.data);
          navigate(from, { replace: true });

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
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: t("common.error"),
        message: t("auth.google.errorMessage"),
      });
    },
  });

  return (
    <Button
      leftSection={<GoogleIcon />}
      variant="default"
      size={compact ? "sm" : "md"}
      h={compact ? 40 : 44}
      fullWidth
      radius="md"
      loading={loading}
      onClick={() => googleLogin()}
      styles={{
        root: { fontWeight: 600, fontSize: compact ? 13 : undefined },
      }}
    >
      {compact
        ? "Google"
        : mode === "login"
        ? t("auth.google.loginButton")
        : t("auth.google.registerButton")}
    </Button>
  );
};

export default GoogleLoginButton;
