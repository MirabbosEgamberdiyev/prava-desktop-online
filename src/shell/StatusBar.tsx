import { memo, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconAlertCircle,
  IconClock,
  IconCloudCheck,
  IconCloudUpload,
  IconLanguage,
  IconRefresh,
  IconUser,
  IconUserOff,
  IconZoomIn,
} from "@tabler/icons-react";
import { useAuth } from "../auth/AuthContext";
import { APP_LANGUAGES, useLanguage } from "../context/LanguageContext";
import { useTypography } from "../context/TypographyContext";
import { useExamStatus, type ExamStatus } from "../state/statusBarStore";
import { networkHeartbeat } from "../sync/networkHeartbeat";
import { networkModeManager, type NetworkMode } from "../sync/networkModeManager";
import { syncEngine, type SyncState } from "../sync/syncEngine";
import { dbClient } from "../database/dbClient";
import { nextLanguage } from "./hotkeys";
import { isExamPath } from "./routes";
import { examStatusParts, formatCountdown, formatPending, isCritical, msToNextTick, secondsLeft } from "./statusFormat";
import { formatUiScale } from "./zoom";

/* ───────────────────────── Account + network + sync (left) ───────────────────────── */

function AccountStatus() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const name =
    (user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.phoneNumber || "").trim();
  const label = isAuthenticated ? name || t("desktopShell.status.account", "Hisob") : t("desktopShell.status.guest", "Mehmon");
  const Icon = isAuthenticated ? IconUser : IconUserOff;
  return (
    <span className="shell-status-item" title={label}>
      <Icon size={13} stroke={1.8} />
      <span className="shell-status-text shell-status-name">{label}</span>
    </span>
  );
}

function useNetwork(): { online: boolean; mode: NetworkMode } {
  const [online, setOnline] = useState<boolean>(() => networkHeartbeat.getStatus().isOnline);
  const [mode, setMode] = useState<NetworkMode>(() => networkModeManager.getMode());
  useEffect(() => {
    const unsubHb = networkHeartbeat.subscribe((isOnline) => setOnline(isOnline));
    const unsubMode = networkModeManager.subscribe((m) => setMode(m));
    return () => {
      unsubHb();
      unsubMode();
    };
  }, []);
  return { online, mode };
}

function NetworkStatus({ onOpen }: { onOpen: (() => void) | null }) {
  const { t } = useTranslation();
  const { online, mode } = useNetwork();
  const forcedOffline = mode === "OFFLINE" || mode === "OFFLINE_ONLY";
  const tone = forcedOffline ? "warn" : online ? "ok" : "warn";
  const label = forcedOffline
    ? t("desktopShell.status.offlineMode", "Oflayn rejim")
    : online
    ? t("desktopShell.status.online", "Onlayn")
    : t("desktopShell.status.offline", "Oflayn");
  return (
    <button
      type="button"
      className="shell-status-item is-button"
      onClick={onOpen ?? undefined}
      disabled={!onOpen}
      title={`${t("desktopShell.status.network", "Tarmoq")}: ${label}`}
    >
      <span className={`shell-status-dot is-${tone}`} aria-hidden="true" />
      <span className="shell-status-text">{label}</span>
    </button>
  );
}

/** Outbox count is read lazily (first read 3 s after mount) and only on sync/storage events. */
function SyncStatus() {
  const { t } = useTranslation();
  const [state, setState] = useState<SyncState>(() => syncEngine.getState());
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const load = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        dbClient
          .countPendingOutbox()
          .then((n) => {
            if (alive) setPending(n);
          })
          .catch(() => {});
      }, delay);
    };
    const onSync = (e: Event) => {
      const d = (e as CustomEvent).detail as { state?: SyncState; isRunning?: boolean } | undefined;
      if (d?.state) setState(d.state);
      if (typeof d?.isRunning === "boolean") setRunning(d.isRunning);
      load(400);
    };
    const onStorage = () => load(800);
    window.addEventListener("sync-status-changed", onSync);
    window.addEventListener("prava-storage-changed", onStorage);
    load(3000);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener("sync-status-changed", onSync);
      window.removeEventListener("prava-storage-changed", onStorage);
    };
  }, []);

  const pendingLabel = formatPending(pending);
  if (running || state === "SYNCING") {
    return (
      <span className="shell-status-item" title={t("desktopShell.status.syncing", "Sinxronlanmoqda…")}>
        <IconRefresh size={13} stroke={1.8} className="shell-spin" />
        <span className="shell-status-text">{t("desktopShell.status.syncing", "Sinxronlanmoqda…")}</span>
      </span>
    );
  }
  if (state === "ERROR") {
    return (
      <span className="shell-status-item is-warn" title={t("desktopShell.status.syncError", "Sinxron xatosi")}>
        <IconAlertCircle size={13} stroke={1.8} />
        <span className="shell-status-text">{t("desktopShell.status.syncError", "Sinxron xatosi")}</span>
      </span>
    );
  }
  if (pendingLabel) {
    const text = t("desktopShell.status.pending", { count: pending, value: pendingLabel, defaultValue: "{{value}} ta navbatda" });
    return (
      <span className="shell-status-item" title={text}>
        <IconCloudUpload size={13} stroke={1.8} />
        <span className="shell-status-text">{text}</span>
      </span>
    );
  }
  return (
    <span className="shell-status-item is-muted" title={t("desktopShell.status.synced", "Sinxronlangan")}>
      <IconCloudCheck size={13} stroke={1.8} />
    </span>
  );
}

/* ───────────────────────── Exam status (center / right) ───────────────────────── */

/** Only this component re-renders every second, and only while a deadline exists. */
function Countdown({ deadline }: { deadline: number }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n < deadline) timer = window.setTimeout(tick, msToNextTick(deadline, n));
    };
    timer = window.setTimeout(tick, msToNextTick(deadline, Date.now()));
    return () => window.clearTimeout(timer);
  }, [deadline]);

  const secs = secondsLeft(deadline, now);
  const critical = isCritical(secs);
  return (
    <span
      className={`shell-status-timer${critical ? " is-critical" : ""}`}
      role="timer"
      aria-live={critical ? "polite" : "off"}
      title={t("desktopShell.status.timeLeft", "Qolgan vaqt")}
    >
      <IconClock size={13} stroke={2} />
      {formatCountdown(secs)}
    </span>
  );
}

function ExamSegment({ status }: { status: ExamStatus }) {
  const { t } = useTranslation();
  const parts = examStatusParts(status);
  return (
    <div className="shell-status-exam" aria-label={parts.label}>
      <span className="shell-status-text is-strong">{parts.label}</span>
      <span className="shell-status-sep" aria-hidden="true" />
      <span className="shell-status-text">
        {t("desktopShell.status.question", "Savol")} {parts.progress}
      </span>
      {parts.mistakes && (
        <>
          <span className="shell-status-sep" aria-hidden="true" />
          <span className={`shell-status-text${parts.mistakesOver ? " is-danger" : ""}`}>
            {t("desktopShell.status.mistakes", "Xato")} {parts.mistakes}
          </span>
        </>
      )}
      {status.deadline != null && (
        <>
          <span className="shell-status-sep" aria-hidden="true" />
          <Countdown deadline={status.deadline} />
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Language + zoom (right) ───────────────────────── */

function LanguageIndicator() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const opt = APP_LANGUAGES.find((l) => l.code === language) ?? APP_LANGUAGES[0];
  return (
    <button
      type="button"
      className="shell-status-item is-button"
      onClick={() => void setLanguage(nextLanguage(language))}
      title={`${opt.label} — ${t("desktopShell.status.language", "Tilni almashtirish")} (Ctrl+L)`}
      aria-keyshortcuts="Control+L"
    >
      <IconLanguage size={13} stroke={1.8} />
      <span className="shell-status-text">{opt.flagCode}</span>
    </button>
  );
}

function ZoomIndicator() {
  const { t } = useTranslation();
  const { scale, resetZoom } = useTypography();
  return (
    <button
      type="button"
      className="shell-status-item is-button"
      onClick={resetZoom}
      title={`${t("desktopShell.status.zoom", "Masshtab")}: ${formatUiScale(scale)} — Ctrl+= / Ctrl+- · Ctrl+0 = 100%`}
      aria-keyshortcuts="Control+0"
    >
      <IconZoomIn size={13} stroke={1.8} />
      <span className="shell-status-text">{formatUiScale(scale)}</span>
    </button>
  );
}

/**
 * Bottom status bar (26px, Fluent style): account · network · sync | exam status | language · zoom.
 */
function StatusBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const exam = useExamStatus();
  const canOpenSettings = isAuthenticated && !isExamPath(pathname);

  return (
    <footer className="shell-statusbar" role="contentinfo">
      <div className="shell-status-left">
        <AccountStatus />
        <NetworkStatus onOpen={canOpenSettings ? () => navigate("/settings?tab=desktop") : null} />
        {isAuthenticated && <SyncStatus />}
      </div>
      <div className="shell-status-center">{exam && <ExamSegment status={exam} />}</div>
      <div className="shell-status-right">
        <LanguageIndicator />
        <ZoomIndicator />
      </div>
    </footer>
  );
}

export default memo(StatusBar);
