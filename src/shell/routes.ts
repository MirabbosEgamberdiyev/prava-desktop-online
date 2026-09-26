/**
 * Route classification for the desktop shell (pure; no React / auth imports so it is
 * cheap to unit test). Mirrors `isSearchBlockedPath` in features/Search/GlobalSearchHost.
 */
import { LEARN_SECTIONS } from "../features/Curriculum/learnSections";

/** Exam / quiz routes: leaving by accident must be prevented, sidebar is hidden. */
export function isExamPath(pathname: string): boolean {
  return (
    pathname === "/exam" ||
    (pathname.startsWith("/exam/") && !pathname.startsWith("/exam/result")) ||
    /^\/tickets\/\d+/.test(pathname) ||
    /^\/packages\/\d+/.test(pathname) ||
    pathname === "/wrong-exam" ||
    pathname === "/marafon" ||
    pathname === "/survival"
  );
}

export function isLearnPath(pathname: string): boolean {
  return LEARN_SECTIONS.some((s) => pathname === s.path || pathname.startsWith(`${s.path}/`));
}
