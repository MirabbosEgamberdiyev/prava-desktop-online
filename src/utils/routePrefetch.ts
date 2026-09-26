/**
 * Route prefetcher system for instant navigation (Vercel / Linear / Stripe UX standard).
 * Preloads dynamic page chunks into the browser cache on link hover, focus, or touch.
 */

const prefetchMap: Record<string, () => Promise<unknown>> = {
  "/auth/login": () => import("../page/Auth/login"),
  "/auth/register": () => import("../page/Auth/register"),
  "/auth/forgot-password": () => import("../page/Auth/forgot-password"),
  "/me": () => import("../page/me"),
  "/packages": () => import("../page/Packages"),
  "/tickets": () => import("../page/Ticket"),
  "/topics": () => import("../page/Topics"),
  "/marafon": () => import("../page/Marafon"),
  "/exam": () => import("../page/Exam"),
  "/history": () => import("../page/History"),
  "/leaderboard": () => import("../page/Leaderboard"),
  "/statistics": () => import("../page/Statistics"),
  "/settings": () => import("../page/Settings"),
  "/wrong-answers": () => import("../page/WrongAnswers"),
  "/saved-questions": () => import("../page/SavedQuestions"),
  "/signs": () => import("../page/RoadSigns"),
  "/markings": () => import("../page/RoadMarkings"),
  "/rules": () => import("../page/TrafficRules"),
  "/penalties": () => import("../page/Penalties"),
  "/exam-centers": () => import("../page/ExamCenters"),
  "/practical-exam": () => import("../page/PracticalExam"),
};

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(to: string): void {
  if (!to || typeof to !== "string" || to.startsWith("http") || to.startsWith("mailto:") || to.startsWith("tel:")) {
    return;
  }
  const cleanPath = to.split("?")[0].split("#")[0];
  if (prefetchedRoutes.has(cleanPath)) return;

  const prefetcher = prefetchMap[cleanPath];
  if (prefetcher) {
    prefetchedRoutes.add(cleanPath);

    // Run in idle cycle so prefetching never competes with user inputs (INP < 50ms)
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(
        () => {
          prefetcher().catch(() => {
            prefetchedRoutes.delete(cleanPath);
          });
        },
        { timeout: 2000 }
      );
    } else {
      setTimeout(() => {
        prefetcher().catch(() => {
          prefetchedRoutes.delete(cleanPath);
        });
      }, 30);
    }
  }
}
