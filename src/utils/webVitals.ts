import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * Core Web Vitals'ni MAHALLIY konsolga chiqaruvchi reporter.
 *
 * `web-vitals` paketi loyihaga o'rnatilgan, lekin hech qayerda ulanmagan edi —
 * ya'ni bog'liqlik bor, foydasi yo'q. Loyihada analitika backendi yo'q,
 * shuning uchun HECH QANDAY tarmoq so'rovi (beacon/fetch) yuborilmaydi:
 * ko'rsatkichlar faqat `console.debug` orqali chiqadi.
 *
 * Bu modul faqat `import.meta.env.DEV` shartida dinamik import qilinadi,
 * shuning uchun production bundle'ga tushmaydi.
 */

// web.dev tavsiya qilgan chegaralar (good / needs-improvement)
const THRESHOLDS: Record<string, [number, number]> = {
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  INP: [200, 500],
  LCP: [2500, 4000],
  TTFB: [800, 1800],
};

function report(metric: Metric) {
  const [good, poor] = THRESHOLDS[metric.name] ?? [0, 0];
  const rating =
    metric.value <= good ? "good" : metric.value <= poor ? "needs-improvement" : "poor";

  console.debug(
    `[web-vitals] ${metric.name}: ${Math.round(metric.value * 1000) / 1000} (${rating})`,
    { id: metric.id, navigationType: metric.navigationType },
  );
}

export function reportWebVitals() {
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
