import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage, LANGUAGES } from "../i18n";
import "./LanguagePicker.css";

export default function LanguagePicker() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <div className="lang-picker" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)}>
        <span className="lang-btn-label">{current.label}</span>
        <span className="lang-btn-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-option${lang.code === i18n.language ? " active" : ""}`}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
            >
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
