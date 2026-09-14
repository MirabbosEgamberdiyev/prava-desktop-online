/**
 * PRAVA DESKTOP ONLINE — NETWORK HEARTBEAT ENGINE
 * Dual-tier connection monitor with real HTTP probes, sleep/wake detection, and debounce.
 */

import api from "../api/api";

export type NetworkStatusListener = (isOnline: boolean, latencyMs: number | null) => void;

class NetworkHeartbeat {
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private latencyMs: number | null = null;
  private lastCheckedAt: number | null = null;
  private listeners: Set<NetworkStatusListener> = new Set();
  private checkTimer: any = null;
  private sleepWatchTimer: any = null;
  private lastTick: number = Date.now();
  private isChecking: boolean = false;
  private consecutiveFailures: number = 0;

  // Configuration
  private readonly PING_INTERVAL_MS = 15000; // 15 seconds regular ping
  private readonly PING_TIMEOUT_MS = 5000;   // 5 seconds timeout
  private readonly SLEEP_THRESHOLD_MS = 12000; // If gap > 12s, machine woke up from sleep
  private readonly MAX_CONSECUTIVE_FAILURES = 2; // Require 2 failed probes before marking offline

  constructor() {
    this.setupSystemListeners();
    this.startSleepWatcher();
    this.startPeriodicProbe();
  }

  /**
   * System OS Online / Offline Event Listeners (Tier 1)
   */
  private setupSystemListeners(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      // OS says online — verify with real probe immediately
      this.checkNow();
    });

    window.addEventListener("offline", () => {
      // OS says offline — instantly update state to prevent unnecessary outbound timeouts
      this.updateStatus(false, null);
    });
  }

  /**
   * Sleep / Wakeup Detector
   * Detects laptop lid closing, hibernation, and system sleep.
   */
  private startSleepWatcher(): void {
    if (typeof window === "undefined") return;

    this.lastTick = Date.now();
    this.sleepWatchTimer = setInterval(() => {
      const now = Date.now();
      const delta = now - this.lastTick;

      if (delta > this.SLEEP_THRESHOLD_MS) {
        // System just woke up from sleep or suspended state
        console.info(`[NetworkHeartbeat] System resumed from sleep (delta: ${delta}ms). Probing connection...`);
        window.dispatchEvent(new CustomEvent("system-resumed-from-sleep", { detail: { delta } }));
        // Give network 1 second to stabilize before probing
        setTimeout(() => this.checkNow(), 1000);
      }

      this.lastTick = now;
    }, 3000);
  }

  /**
   * Periodic Probe (Tier 2)
   */
  private startPeriodicProbe(): void {
    if (typeof window === "undefined") return;

    this.checkTimer = setInterval(() => {
      this.checkNow();
    }, this.PING_INTERVAL_MS);
  }

  /**
   * Real HTTP probe against backend health/config endpoint
   */
  public async checkNow(): Promise<boolean> {
    if (this.isChecking) return this.isOnline;
    this.isChecking = true;

    const startTime = Date.now();
    try {
      // Fast, lightweight, non-authenticated endpoint
      await api.get("/api/v1/auth/config", {
        timeout: this.PING_TIMEOUT_MS,
        skipDeduplication: true,
        headers: { "Cache-Control": "no-cache" },
      } as any);

      const latency = Date.now() - startTime;
      this.consecutiveFailures = 0;
      this.updateStatus(true, latency);
      return true;
    } catch (err: any) {
      // Agar backend javob bergan bo'lsa (masalan 401 yoki 404), demak tarmoq BOR
      if (err.response) {
        const latency = Date.now() - startTime;
        this.consecutiveFailures = 0;
        this.updateStatus(true, latency);
        return true;
      }

      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES || !navigator.onLine) {
        this.updateStatus(false, null);
      }
      return false;
    } finally {
      this.isChecking = false;
      this.lastCheckedAt = Date.now();
    }
  }

  /**
   * Update internal state and notify all subscribers
   */
  private updateStatus(online: boolean, latency: number | null): void {
    const statusChanged = this.isOnline !== online;
    this.isOnline = online;
    this.latencyMs = latency;

    if (statusChanged) {
      console.info(`[NetworkHeartbeat] Connection state changed: ${online ? "ONLINE" : "OFFLINE"}`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("network-status-changed", {
            detail: { isOnline: online, latencyMs: latency },
          })
        );
      }
    }

    for (const listener of this.listeners) {
      try {
        listener(online, latency);
      } catch (e) {
        console.error("[NetworkHeartbeat] Listener error:", e);
      }
    }
  }

  /**
   * Public API
   */
  public getStatus(): { isOnline: boolean; latencyMs: number | null; lastCheckedAt: number | null } {
    return {
      isOnline: this.isOnline,
      latencyMs: this.latencyMs,
      lastCheckedAt: this.lastCheckedAt,
    };
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke with current state
    listener(this.isOnline, this.latencyMs);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
    if (this.sleepWatchTimer) clearInterval(this.sleepWatchTimer);
    this.listeners.clear();
  }
}

export const networkHeartbeat = new NetworkHeartbeat();
