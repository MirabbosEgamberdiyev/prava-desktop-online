import { forwardRef, useMemo, type CSSProperties } from "react";
import DOMPurify from "dompurify";
import { openExternal } from "../../utils/openExternal";

/*
 * HTML content coming from the admin panel (traffic rules, sign / marking descriptions)
 * is sanitised with DOMPurify before rendering (ported from the web app): <script>,
 * on* handlers, javascript: URLs, iframes/forms etc. are stripped; plain formatting
 * (p, b, ul, table, img, a ...) is kept.
 */
const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed"],
  FORBID_ATTR: ["srcset"],
  ALLOW_DATA_ATTR: false,
};

let hookInstalled = false;
function ensureLinkHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  // External links open outside the app window, without opener.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (node.tagName === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
    }
  });
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  ensureLinkHook();
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as string;
}

interface SafeHtmlProps {
  html: string | null | undefined;
  className?: string;
  style?: CSSProperties;
  /** Already sanitised HTML (skip the second DOMPurify pass). */
  trusted?: boolean;
}

const SafeHtml = forwardRef<HTMLDivElement, SafeHtmlProps>(function SafeHtml(
  { html, className, style, trusted },
  ref
) {
  const clean = useMemo(() => (trusted ? html || "" : sanitizeHtml(html)), [html, trusted]);
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onClick={(e) => {
        // Links in admin content open in the system browser, never inside the app window.
        const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (href.startsWith("#")) return;
        e.preventDefault();
        void openExternal(a.href);
      }}
      // Sanitised by DOMPurify
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
});

export default SafeHtml;
