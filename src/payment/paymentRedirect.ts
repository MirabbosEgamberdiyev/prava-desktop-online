/**
 * Payment provider redirects.
 *
 * The provider URL comes from our backend, but it is still treated as untrusted:
 * only HTTPS URLs on the known Click / Payme checkout hosts are opened, and they are
 * opened in the user's EXTERNAL browser (never inside the Tauri webview, which holds
 * the auth tokens and must not navigate to third-party pages).
 */
export const PAYMENT_ALLOWED_HOSTS: readonly string[] = Object.freeze([
  "my.click.uz",
  "checkout.paycom.uz",
  "test.paycom.uz",
  "checkout.test.paycom.uz",
]);

/** True only for https://<allowed host>/… (exact host match, no credentials, default port). */
export function isAllowedPaymentUrl(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  return PAYMENT_ALLOWED_HOSTS.includes(url.hostname.toLowerCase());
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Open a payment URL in the external browser. Throws when the URL is not allow-listed.
 * Uses @tauri-apps/plugin-opener (permitted by `opener:default` in src-tauri/capabilities).
 */
export async function openPaymentUrl(raw: string): Promise<void> {
  if (!isAllowedPaymentUrl(raw)) {
    throw new Error("PAYMENT_URL_NOT_ALLOWED");
  }
  const url = new URL(raw).toString();
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  // Plain browser (vite dev without Tauri): new tab, never replace the app page.
  window.open(url, "_blank", "noopener,noreferrer");
}
