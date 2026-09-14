import { useState, useRef, useEffect } from "react";
import { useLanguage, APP_LANGUAGES, type AppLanguage } from "../../context/LanguageContext";

export const LANGUAGES = APP_LANGUAGES.map((l) => ({
  code: l.code,
  label: l.label,
}));

export default function LanguagePicker() {
  const { language, setLanguage, currentLanguageOption } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (code: AppLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className="lang-picker" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} type="button">
        <span className="lang-btn-label">{currentLanguageOption.label}</span>
        <span className="lang-btn-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          {APP_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`lang-option${lang.code === language ? " active" : ""}`}
              onClick={() => handleSelect(lang.code)}
            >
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
