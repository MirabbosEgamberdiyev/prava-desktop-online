import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Enterprise Scroll Management (Stripe & Linear UX standard)
 * - PUSH / REPLACE navigation: scroll smoothly/instantly to top (0, 0)
 * - Hash navigation: smoothly scrolls to target element ID
 * - POP (Back/Forward): preserves browser native scroll restoration
 */
export function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // If navigating to a specific hash (e.g. #pricing-plans)
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    // For brand-new route transitions, scroll instantly to top so the page doesn't start midway
    if (navType !== "POP") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [pathname, search, hash, navType]);

  return null;
}
