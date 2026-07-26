import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage, LANGUAGES } from "../i18n";
import "./LanguagePicker.css";

export default function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⚠️ Dropdown ilgari faqat sichqoncha bilan yopilardi: Escape ishlamasdi va
  // ochiq ro'yxatdan Tab bilan chiqib ketilganda ham osilib qolardi.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onFocusOut = () => {
      // setTimeout — fokus yangi elementga o'tib ulgursin
      setTimeout(() => {
        if (ref.current && !ref.current.contains(document.activeElement)) setOpen(false);
      }, 0);
    };
    document.addEventListener("keydown", onKey);
    ref.current?.addEventListener("focusout", onFocusOut);
    const node = ref.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      node?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <div className="lang-picker" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="lang-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language.select", { defaultValue: "Tilni tanlash" })}: ${current.label}`}
      >
        <span className="lang-btn-label">{current.label}</span>
        <span className="lang-btn-arrow" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="lang-dropdown" role="listbox" aria-label={t("language.select", { defaultValue: "Tilni tanlash" })}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === i18n.language}
              className={`lang-option${lang.code === i18n.language ? " active" : ""}`}
              onClick={() => { setLanguage(lang.code); setOpen(false); btnRef.current?.focus(); }}
            >
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
