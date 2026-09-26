/**
 * Open an http(s) link in the user's default browser (never inside the app webview).
 * Other schemes (javascript:, file:, custom protocols) are refused.
 */
export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function openExternal(raw: string): Promise<boolean> {
  if (!isSafeExternalUrl(raw)) return false;
  const url = new URL(raw).toString();
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return true;
  } catch {
    return false;
  }
}
