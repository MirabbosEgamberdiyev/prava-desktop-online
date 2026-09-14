import { notifications, type NotificationData } from "@mantine/notifications";

const recentToasts = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 4000;

/**
 * Deterministic hash for string combination.
 */
function hashKey(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `toast_${Math.abs(hash).toString(36)}`;
}

export interface ToastOptions extends Omit<NotificationData, "message"> {
  message?: React.ReactNode;
  dedupeKey?: string;
  cooldownMs?: number;
}

/**
 * Centralized, deduplicated notification dispatcher.
 * Guarantees 1 event = 1 notification. Prevents duplicate toast spam.
 */
export function showToast(options: ToastOptions): string | undefined {
  const titleStr = typeof options.title === "string" ? options.title : "";
  const msgStr = typeof options.message === "string" ? options.message : "";
  const key = options.dedupeKey || options.id || hashKey(`${titleStr}:${msgStr}`);

  const now = Date.now();
  const cooldown = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const lastShown = recentToasts.get(key) || 0;

  if (now - lastShown < cooldown) {
    // Duplicate detected within cooldown window — suppress
    return undefined;
  }

  recentToasts.set(key, now);

  // Prune stale keys if map exceeds 100 items
  if (recentToasts.size > 100) {
    for (const [k, timestamp] of recentToasts.entries()) {
      if (now - timestamp > 60_000) {
        recentToasts.delete(k);
      }
    }
  }

  const notificationId = options.id || key;

  return notifications.show({
    ...options,
    id: notificationId,
    message: options.message || "",
    autoClose: options.autoClose ?? 4500,
  });
}

export function showSuccessToast(title: string, message?: string, options?: Partial<ToastOptions>) {
  return showToast({
    title,
    message,
    color: "green",
    withBorder: true,
    ...options,
  });
}

export function showErrorToast(title: string, message?: string, options?: Partial<ToastOptions>) {
  return showToast({
    title,
    message,
    color: "red",
    withBorder: true,
    ...options,
  });
}

export function showWarningToast(title: string, message?: string, options?: Partial<ToastOptions>) {
  return showToast({
    title,
    message,
    color: "orange",
    withBorder: true,
    ...options,
  });
}
