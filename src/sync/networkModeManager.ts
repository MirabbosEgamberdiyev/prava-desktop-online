/**
 * PRAVA DESKTOP ONLINE — NETWORK MODE MANAGER
 * Strictly decouples physical Internet Connectivity from Application Work Mode:
 * - AUTO: Dynamic network sensing. Automatically uses online sync when connected, local SQLite when offline.
 * - ONLINE: Explicit online mode. Prioritizes real-time sync with server. (Legacy alias: ONLINE_SYNC)
 * - OFFLINE: Explicit offline mode. 100% local database operations. Zero background network traffic. (Legacy alias: OFFLINE_ONLY)
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * When the user selects OFFLINE mode, physical network reconnection (OS 'online' event)
 * MUST NEVER automatically switch the application back to ONLINE mode.
 * The user's explicit choice is strictly persistent across sessions and reboots.
 */

export type ApplicationMode = "AUTO" | "ONLINE" | "OFFLINE";
export type NetworkMode = ApplicationMode | "ONLINE_SYNC" | "OFFLINE_ONLY";
export type ConnectivityState = "CONNECTED" | "DISCONNECTED" | "UNKNOWN";

export const NETWORK_MODE_STORAGE_KEY = "prava_network_mode";
const DEFAULT_MODE: NetworkMode = "AUTO";

export type NetworkModeListener = (mode: NetworkMode) => void;

function validateMode(raw: string | null | undefined): NetworkMode {
  if (!raw) return DEFAULT_MODE;
  if (raw === "OFFLINE" || raw === "OFFLINE_ONLY") return raw as NetworkMode;
  if (raw === "ONLINE" || raw === "ONLINE_SYNC") return raw as NetworkMode;
  if (raw === "AUTO") return "AUTO";
  return DEFAULT_MODE;
}

class NetworkModeManager {
  private currentMode: NetworkMode = DEFAULT_MODE;
  private listeners: Set<NetworkModeListener> = new Set();

  constructor() {
    this.currentMode = this.loadStoredMode();
  }

  private loadStoredMode(): NetworkMode {
    if (typeof localStorage === "undefined") return DEFAULT_MODE;
    try {
      const stored = localStorage.getItem(NETWORK_MODE_STORAGE_KEY);
      return validateMode(stored);
    } catch {
      // ignore
    }
    return DEFAULT_MODE;
  }

  public getMode(): NetworkMode {
    return this.currentMode;
  }

  public isOfflineOnly(): boolean {
    return this.currentMode === "OFFLINE" || this.currentMode === "OFFLINE_ONLY";
  }

  public isOnlineAllowed(): boolean {
    return !this.isOfflineOnly();
  }

  public isAuto(): boolean {
    return this.currentMode === "AUTO";
  }

  public isOnline(): boolean {
    return this.currentMode === "ONLINE" || this.currentMode === "ONLINE_SYNC";
  }

  public setMode(mode: NetworkMode): void {
    const validMode = validateMode(mode);
    if (this.currentMode === validMode) return;

    const previousMode = this.currentMode;
    this.currentMode = validMode;

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(NETWORK_MODE_STORAGE_KEY, validMode);
      }
    } catch (e) {
      console.warn("[NetworkModeManager] Failed to persist mode:", e);
    }

    // Notify internal subscribers
    for (const listener of this.listeners) {
      try {
        listener(validMode);
      } catch (err) {
        console.error("[NetworkModeManager] Listener error:", err);
      }
    }

    // Broadcast system-wide event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("network-mode-changed", {
          detail: { mode: validMode, previousMode },
        })
      );
    }

    console.info(`[NetworkModeManager] Switched from ${previousMode} to ${validMode}`);
  }

  public subscribe(listener: NetworkModeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentMode);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkModeManager = new NetworkModeManager();
