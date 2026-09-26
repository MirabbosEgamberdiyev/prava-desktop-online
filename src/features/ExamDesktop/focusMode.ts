/**
 * Optional bridge to the shell's focus mode (src/shell/focusMode.ts, owned by the shell).
 * Resolved with import.meta.glob so the build never fails if that module is absent;
 * when it is missing this is a no-op.
 */
type FocusModeModule = {
  requestFocusMode?: () => () => void;
  setFocusMode?: (on: boolean) => void;
};

const loaders = import.meta.glob<FocusModeModule>("../../shell/focusMode.ts");
const load = Object.values(loaders)[0] as (() => Promise<FocusModeModule>) | undefined;

/** Request shell focus mode (sidebar hidden) while the exam view is mounted. Returns a release fn. */
export function acquireExamFocusMode(): () => void {
  if (!load) return () => {};
  let release: (() => void) | null = null;
  let cancelled = false;
  load()
    .then((m) => {
      if (cancelled) return;
      if (m.requestFocusMode) release = m.requestFocusMode();
      else if (m.setFocusMode) {
        m.setFocusMode(true);
        release = () => m.setFocusMode?.(false);
      }
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    release?.();
    release = null;
  };
}
