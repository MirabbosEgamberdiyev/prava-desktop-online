import { createTheme, type MantineColorsTuple } from "@mantine/core";

const primaryBlue: MantineColorsTuple = [
  "#e7f5ff",
  "#d0ebff",
  "#a5d8ff",
  "#74c0fc",
  "#4dabf7",
  "#339af0",
  "#228be6",
  "#1c7ed6",
  "#1971c2",
  "#1864ab",
];

export const theme = createTheme({
  primaryColor: "blue",
  colors: {
    blue: primaryBlue,
  },

  /**
   * `primaryShade` — light rejimda 7-shade (#1c7ed6) ishlatiladi.
   * Sabab: 6-shade (#228be6) oq fonda ~3.3:1 kontrast beradi — WCAG AA (4.5:1)
   * dan past. 7-shade ~4.6:1 beradi. Dark rejimda yorqinroq 5-shade kerak.
   */
  primaryShade: { light: 7, dark: 5 },

  /**
   * `autoContrast` — "filled" variantlarda matn rangi fon yorqinligiga qarab
   * avtomatik qora/oq bo'ladi. Bu sariq/yashil filled badge va tugmalardagi
   * oq-matn-sariq-fon (~1.8:1) kabi WCAG buzilishlarini yopadi.
   */
  autoContrast: true,
  luminanceThreshold: 0.3,

  fontFamily: '"Montserrat", sans-serif',

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
    fontFamily: '"Montserrat", sans-serif',
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
