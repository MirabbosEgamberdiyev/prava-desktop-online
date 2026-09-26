import { createTheme, type MantineColorsTuple } from "@mantine/core";
/**
 * SINGLE SOURCE of design values: src/theme/design-tokens.json (identical copy of the web
 * prava-test tokens — do not edit values here). CSS variables in styles/desktop.css mirror
 * the same JSON (guarded by tests/designTokens.test.ts).
 */
import tokens from "./theme/design-tokens.json";

const BRAND_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;
const brand = tokens.color.brand as Record<(typeof BRAND_STEPS)[number], string>;
const primaryBlue = BRAND_STEPS.map((k) => brand[k]) as unknown as MantineColorsTuple;

const FONT_STACK = `"${tokens.font.family}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const px = (n: number) => `${n}px`;

export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    blue: primaryBlue,
  },

  /**
   * `primaryShade` — light: 6-shade (brand.600 #0284c7, ~4.7:1 on white),
   * dark: 4-shade (brand.400 #38bdf8, ~7.5:1 on the dark background). Same as web.
   */
  primaryShade: { light: 6, dark: 4 },

  /**
   * `autoContrast` — "filled" variantlarda matn rangi fon yorqinligiga qarab
   * avtomatik qora/oq bo'ladi. Bu sariq/yashil filled badge va tugmalardagi
   * oq-matn-sariq-fon (~1.8:1) kabi WCAG buzilishlarini yopadi.
   */
  autoContrast: true,
  luminanceThreshold: 0.3,

  fontFamily: FONT_STACK,

  /**
   * Imtihon davomida foydalanuvchi ketma-ket 20-50 ta savol o'qiydi.
   * Mantine standart line-height (md = 1.55) uzoq o'qish uchun zich.
   * Quyidagi shkala savol/javob matnini havodorroq qiladi.
   */
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
  },
  lineHeights: {
    xs: "1.45",
    sm: "1.5",
    md: "1.6",
    lg: "1.65",
    xl: "1.65",
  },

  headings: {
    fontFamily: FONT_STACK,
    sizes: {
      h1: { fontSize: "2.125rem", lineHeight: "1.3", fontWeight: "700" },
      h2: { fontSize: "1.625rem", lineHeight: "1.35", fontWeight: "700" },
      h3: { fontSize: "1.325rem", lineHeight: "1.4", fontWeight: "600" },
      h4: { fontSize: "1.125rem", lineHeight: "1.45", fontWeight: "600" },
      // h5/h6 yetishmayotgan edi — Mantine default (0.875rem / 0.75rem) ga
      // tushib ketardi va h4 dan keskin kichrayib ierarxiyani buzardi.
      h5: { fontSize: "1rem", lineHeight: "1.5", fontWeight: "600" },
      h6: { fontSize: "0.9375rem", lineHeight: "1.5", fontWeight: "600" },
    },
  },

  // Kodda tugmalar/kartalar allaqachon `radius="md"` ni qo'lda uzatardi —
  // defaultni "md" qilib, `sm` bilan aralashib ketishiga chek qo'yamiz.
  defaultRadius: "md",
  radius: {
    xs: px(Math.round(tokens.radius.sm / 2)),
    sm: px(tokens.radius.sm),
    md: px(tokens.radius.md),
    lg: px(tokens.radius.lg),
    xl: px(tokens.radius.xl),
  },

  components: {
    Card: {
      defaultProps: {
        radius: "lg",
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});
