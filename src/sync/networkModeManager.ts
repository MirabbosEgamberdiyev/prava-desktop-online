/**
 * PRAVA DESKTOP ONLINE — NETWORK MODE MANAGER
 * Manages user-selected operational modes:
 * - AUTO: Dynamic network sensing. Syncs automatically when online.
 * - ONLINE_SYNC: Force active connection. Probes aggressively and syncs whenever available.
 * - OFFLINE_ONLY: Explicit offline mode. 100% local database operations. Zero background network traffic.
 */

export type NetworkMode = "AUTO" | "ONLINE_SYNC" | "OFFLINE_ONLY";

const NETWORK_MODE_STORAGE_KEY = "prava_network_mode";
const DEFAULT_MODE: NetworkMode = "AUTO";

export type NetworkModeListener = (mode: NetworkMode) => void;

class NetworkModeManager {
  private currentMode: NetworkMode = DEFAULT_MODE;
  private listeners: Set<NetworkModeListener> = new Set();

  constructor() {
    this.currentMode = this.loadStoredMode();
  }

  private loadStoredMode(): NetworkMode {
    if (typeof localStorage === "undefined") return DEFAULT_MODE;
    try {
      const stored = localStorage.getItem(NETWORK_MODE_STORAGE_KEY) as NetworkMode | null;
      if (stored === "AUTO" || stored === "ONLINE_SYNC" || stored === "OFFLINE_ONLY") {
        return stored;
      }
    } catch {
      // ignore
    }
    return DEFAULT_MODE;
  }

  public getMode(): NetworkMode {
    return this.currentMode;
  }

  public isOfflineOnly(): boolean {
    return this.currentMode === "OFFLINE_ONLY";
  }

  public isOnlineAllowed(): boolean {
    return this.currentMode !== "OFFLINE_ONLY";
  }

  public setMode(mode: NetworkMode): void {
    if (this.currentMode === mode) return;

    const previousMode = this.currentMode;
    this.currentMode = mode;

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(NETWORK_MODE_STORAGE_KEY, mode);
      }
    } catch (e) {
      console.warn("[NetworkModeManager] Failed to persist mode:", e);
    }

    // Notify internal subscribers
    for (const listener of this.listeners) {
      try {
        listener(mode);
      } catch (err) {
        console.error("[NetworkModeManager] Listener error:", err);
      }
    }

    // Broadcast system-wide event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("network-mode-changed", {
          detail: { mode, previousMode },
        })
      );
    }

    console.info(`[NetworkModeManager] Switched from ${previousMode} to ${mode}`);
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
