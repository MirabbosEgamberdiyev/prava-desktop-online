import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Popover } from "@mantine/core";
import { IconBell, IconChecks, IconFlame, IconInfoCircle, IconSparkles, IconTarget, IconTrash } from "@tabler/icons-react";
import { getActiveUserId, scopedStorageKey } from "../../utils/userScope";
import "./dashboard.css";

export interface InAppNotification {
  id: string;
  title: string;
  description: string;
  /** epoch ms */
  createdAt: number;
  read: boolean;
  type: "info" | "success" | "reminder" | "streak";
}

const BASE_KEY = "prava_inapp_notifications_v2";
const CHANGED_EVENT = "prava-notifications-changed";
const MAX_ITEMS = 50;

const storageKey = () => scopedStorageKey(BASE_KEY, getActiveUserId());

function load(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as InAppNotification[]) : [];
  } catch {
    return [];
  }
}

function save(list: InAppNotification[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // ignore quota errors
  }
}

/**
 * Local, per-user inbox API. Only real app events should be pushed here (no demo items).
 */
export function pushLocalNotification(n: Omit<InAppNotification, "id" | "createdAt" | "read">): void {
  const list = load();
  list.unshift({ ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), read: false });
  save(list);
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

const ICON = {
  streak: <IconFlame size={16} color="#f59e0b" />,
  reminder: <IconTarget size={16} color="#0284c7" />,
  success: <IconSparkles size={16} color="#10b981" />,
  info: <IconInfoCircle size={16} color="#6366f1" />,
};

/** Header bell with the local inbox (web NotificationCenter parity, without browser push). */
export default function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<InAppNotification[]>(load);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const reload = () => setItems(load());
    window.addEventListener(CHANGED_EVENT, reload);
    return () => window.removeEventListener(CHANGED_EVENT, reload);
  }, []);

  const update = useCallback((next: InAppNotification[]) => {
    setItems(next);
    save(next);
  }, []);

  const unread = items.filter((n) => !n.read).length;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(i18n.language === "ru" ? "ru-RU" : "uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <Popover opened={opened} onChange={setOpened} width={360} position="bottom-end" shadow="lg" radius="md" trapFocus returnFocus>
      <Popover.Target>
        <button
          type="button"
          className="dash-icon-btn"
          onClick={() => setOpened((o) => !o)}
          aria-label={t("dashboard.notificationsTitle", "Bildirishnomalar")}
          title={t("dashboard.notificationsTitle", "Bildirishnomalar")}
          aria-haspopup="dialog"
          aria-expanded={opened}
        >
          <IconBell size={18} stroke={1.8} />
          {unread > 0 && (
            <span className="dash-badge-dot" aria-label={t("notifications.unreadCount", { count: unread, defaultValue: "{{count}}" })}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 14, color: "var(--text)" }}>{t("dashboard.notificationsTitle", "Bildirishnomalar")}</strong>
            {unread > 0 && (
              <Badge size="xs" variant="filled">
                {unread} {t("dashboard.unread", "yangi")}
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <button type="button" className="dash-link" onClick={() => update(items.map((n) => ({ ...n, read: true })))}>
              <IconChecks size={15} /> {t("notifications.markAllReadShort", "Barchasi o'qildi")}
            </button>
          )}
        </div>
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {items.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
              <IconBell size={32} stroke={1.5} style={{ opacity: 0.4, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13 }}>{t("notifications.empty", "Hozircha hech qanday bildirishnoma yo'q")}</p>
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className="dash-list-item"
                style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)", alignItems: "flex-start", background: n.read ? "transparent" : "var(--primary-light)" }}
                onClick={() => update(items.map((x) => (x.id === n.id ? { ...x, read: !x.read } : x)))}
              >
                <span style={{ marginTop: 2 }}>{ICON[n.type] ?? ICON.info}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: n.read ? 600 : 800 }}>{n.title}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", margin: "3px 0" }}>{n.description}</span>
                  <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{fmt(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="dash-link" style={{ color: "var(--text-muted)" }} onClick={() => update([])}>
              <IconTrash size={13} /> {t("notifications.clearAll", "Tozalash")}
            </button>
          </div>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
