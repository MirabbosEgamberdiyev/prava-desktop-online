/**
 * Prava Online - Centralized Design Tokens
 * Source of Truth: Prava-desktop design system (src/App.css)
 *
 * Provides typed constants for colors, typography, spacing, shadows,
 * border-radii, transitions, and component presets.
 */

export const colors = {
  light: {
    primary: "#1971c2",
    primaryHover: "#1c7ed6",
    primaryLight: "#e7f5ff",
    primaryMid: "#228be6",
    danger: "#e03131",
    dangerLight: "#fff5f5",
    success: "#2f9e44",
    correct: "#2f9e44",
    wrong: "#e03131",
    warning: "#e67700",
    bg: "#f8f9fa",
    cardBg: "#ffffff",
    text: "#1a1b1e",
    textMuted: "#868e96",
    border: "#dee2e6",
    surface: "#ffffff",
    surfaceMuted: "#f1f3f5",
  },
  dark: {
    primary: "#4dabf7",
    primaryHover: "#74c0fc",
    primaryLight: "rgba(24, 100, 171, 0.25)",
    primaryMid: "#339af0",
    danger: "#ff6b6b",
    dangerLight: "rgba(255, 107, 107, 0.15)",
    success: "#51cf66",
    correct: "#51cf66",
    wrong: "#ff6b6b",
    warning: "#ffd43b",
    bg: "#031824",
    cardBg: "#072033",
    text: "#e6edf3",
    textMuted: "#8b949e",
    border: "#1a364d",
    surface: "#072033",
    surfaceMuted: "#0b2a43",
    surfaceElevated: "#0f314c",
  },
} as const;

export const typography = {
  fontFamily: '"Montserrat", sans-serif',
  weights: {
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
  },
  sizes: {
    xs: "0.75rem",     // 12px
    sm: "0.875rem",    // 14px
    md: "1rem",        // 16px
    lg: "1.125rem",    // 18px
    xl: "1.25rem",     // 20px
    xxl: "1.5rem",     // 24px
    h3: "1.75rem",     // 28px
    h2: "2.125rem",    // 34px
    h1: "2.75rem",     // 44px
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.65,
  },
} as const;

export const spacing = {
  xs: "0.25rem",  // 4px
  sm: "0.5rem",   // 8px
  md: "1rem",     // 16px
  lg: "1.5rem",   // 24px
  xl: "2rem",     // 32px
  xxl: "3rem",    // 48px
  hero: "4rem",   // 64px
} as const;

export const radii = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  xxl: "24px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
  md: "0 4px 16px rgba(0, 0, 0, 0.08)",
  lg: "0 12px 40px rgba(0, 0, 0, 0.14)",
  darkSm: "0 1px 3px rgba(0, 0, 0, 0.42)",
  darkMd: "0 4px 16px rgba(0, 0, 0, 0.4)",
  darkLg: "0 12px 40px rgba(0, 0, 0, 0.5)",
} as const;

export const transitions = {
  fast: "0.15s ease",
  normal: "0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  smooth: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as const;

export const breakpoints = {
  xs: "36em",   // 576px
  sm: "48em",   // 768px
  md: "62em",   // 992px
  lg: "75em",   // 1200px
  xl: "88em",   // 1408px
} as const;

export const zIndex = {
  base: 1,
  dropdown: 100,
  sticky: 110,
  fixed: 120,
  modalBackdrop: 200,
  modal: 201,
  popover: 300,
  toast: 400,
  tooltip: 500,
} as const;

export default {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  transitions,
  breakpoints,
  zIndex,
};
