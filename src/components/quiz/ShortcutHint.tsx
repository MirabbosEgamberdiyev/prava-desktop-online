import { memo } from "react";
import { useTranslation } from "react-i18next";
import { IconKeyboard } from "@tabler/icons-react";

interface ShortcutHintProps {
  /** Show the bookmark shortcut (only where bookmarking exists). */
  bookmark?: boolean;
}

/** Always-visible keyboard shortcut legend shown under every exam screen. */
export const ShortcutHint = memo(function ShortcutHint({ bookmark = true }: ShortcutHintProps) {
  const { t } = useTranslation();
  const items: Array<[string, string]> = [
    ["1–5 / A–E", t("shortcuts.answer", "javob")],
    ["← →", t("shortcuts.navigate", "savollar")],
    ["Enter", t("shortcuts.confirm", "yakunlash / tasdiqlash")],
    ["Esc", t("shortcuts.close", "yopish")],
  ];
  if (bookmark) items.push(["Shift+B", t("shortcuts.bookmark", "saqlash")]);

  return (
    <div className="exam-shortcut-hint" aria-label={t("shortcuts.title", "Klaviatura")}>
      <IconKeyboard size={14} stroke={1.8} aria-hidden="true" />
      {items.map(([keys, label]) => (
        <span key={keys} className="exam-shortcut-item">
          <kbd>{keys}</kbd> {label}
        </span>
      ))}
    </div>
  );
});

export default ShortcutHint;
