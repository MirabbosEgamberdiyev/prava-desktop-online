/**
 * Keyboard shortcut catalogue shown in Settings → Klaviatura (and reused in tooltips).
 * Global shortcuts are implemented by src/shell/GlobalHotkeys.tsx (+ Ctrl+K by
 * features/Search/GlobalSearchHost); exam shortcuts by src/hooks/useExamShortcuts.ts.
 */
export interface ShortcutEntry {
  id: string;
  /** Alternatives; each alternative is a list of keys pressed together. */
  keys: string[][];
  labelKey: string;
  fallback: string;
}

export interface ShortcutGroup {
  id: "global" | "exam";
  titleKey: string;
  fallback: string;
  items: ShortcutEntry[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "global",
    titleKey: "desktopShell.settings.groupGlobal",
    fallback: "Umumiy",
    items: [
      { id: "search", keys: [["Ctrl", "K"], ["Ctrl", "F"]], labelKey: "desktopShell.shortcuts.search", fallback: "Global qidiruv" },
      { id: "pageSearch", keys: [["Ctrl", "F"], ["/"]], labelKey: "desktopShell.shortcuts.pageSearch", fallback: "Sahifa ichida qidirish (O'quv materiallari)" },
      { id: "sidebar", keys: [["Ctrl", "B"]], labelKey: "desktopShell.shortcuts.sidebar", fallback: "Yon panelni yig'ish / yoyish" },
      { id: "settings", keys: [["Ctrl", ","]], labelKey: "desktopShell.shortcuts.settings", fallback: "Sozlamalar" },
      { id: "language", keys: [["Ctrl", "L"]], labelKey: "desktopShell.shortcuts.language", fallback: "Tilni almashtirish" },
      { id: "fullscreen", keys: [["F11"]], labelKey: "desktopShell.shortcuts.fullscreen", fallback: "To'liq ekran" },
      { id: "zoomIn", keys: [["Ctrl", "="]], labelKey: "desktopShell.shortcuts.zoomIn", fallback: "Kattalashtirish" },
      { id: "zoomOut", keys: [["Ctrl", "-"]], labelKey: "desktopShell.shortcuts.zoomOut", fallback: "Kichraytirish" },
      { id: "zoomReset", keys: [["Ctrl", "0"]], labelKey: "desktopShell.shortcuts.zoomReset", fallback: "Masshtab 100%" },
    ],
  },
  {
    id: "exam",
    titleKey: "desktopShell.settings.groupExam",
    fallback: "Imtihon va testlar",
    items: [
      { id: "select", keys: [["1", "–", "5"], ["Num 1", "–", "Num 5"]], labelKey: "desktopShell.shortcuts.selectAnswer", fallback: "Javob variantini tanlash" },
      { id: "next", keys: [["Space"], ["Enter"]], labelKey: "desktopShell.shortcuts.nextConfirm", fallback: "Keyingi savol / tasdiqlash" },
      { id: "nav", keys: [["←"], ["→"]], labelKey: "desktopShell.shortcuts.navigate", fallback: "Oldingi / keyingi savol" },
      { id: "close", keys: [["Esc"]], labelKey: "desktopShell.shortcuts.close", fallback: "Oyna yoki rasmni yopish" },
      { id: "bookmark", keys: [["B"], ["Ctrl", "D"]], labelKey: "desktopShell.shortcuts.bookmark", fallback: "Savolni tanlanganlarga qo'shish" },
      { id: "examFullscreen", keys: [["F11"]], labelKey: "desktopShell.shortcuts.fullscreen", fallback: "To'liq ekran" },
      { id: "examLanguage", keys: [["Ctrl", "L"]], labelKey: "desktopShell.shortcuts.language", fallback: "Tilni almashtirish" },
    ],
  },
];

/** "Ctrl+K" style label for tooltips. */
export function shortcutLabel(keys: string[]): string {
  return keys.join("+");
}
