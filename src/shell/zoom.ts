/**
 * UI scale steps (Settings → Ko'rinish, Ctrl+= / Ctrl+- / Ctrl+0). Exact steps only, so the
 * WebView zoom always lands on values that render text crisply at 100/125/150/200% DPI.
 */
export const UI_SCALE_STEPS = [0.9, 1, 1.1, 1.25] as const;
export type UiScale = (typeof UI_SCALE_STEPS)[number];

export const UI_SCALE_KEY = "prava-ui-scale";
/** Legacy key (small / standard / large) — migrated once on read. */
export const LEGACY_TEXT_SIZE_KEY = "prava-text-size";

export function isUiScale(v: unknown): v is UiScale {
  return typeof v === "number" && (UI_SCALE_STEPS as readonly number[]).includes(v);
}

/** Parse a stored value; legacy small/large map to the nearest new step. */
export function parseUiScale(raw: string | null, legacy: string | null = null): UiScale {
  if (raw != null) {
    const n = Number(raw);
    if (isUiScale(n)) return n;
  }
  if (legacy === "small") return 0.9;
  if (legacy === "large") return 1.1;
  return 1;
}

export function stepUiScale(current: number, dir: 1 | -1): UiScale {
  const steps = UI_SCALE_STEPS as readonly number[];
  let idx = steps.indexOf(current);
  if (idx === -1) {
    // Unknown value: snap to the closest step first.
    idx = steps.reduce((best, s, i) => (Math.abs(s - current) < Math.abs(steps[best] - current) ? i : best), 0);
    return steps[idx] as UiScale;
  }
  const next = Math.min(steps.length - 1, Math.max(0, idx + dir));
  return steps[next] as UiScale;
}

export function formatUiScale(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
