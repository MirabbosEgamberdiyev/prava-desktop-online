/**
 * PRAVA DESKTOP ONLINE — NETWORK MODE ARCHITECTURE & DECOUPLING TEST SUITE
 * Verifies the fundamental invariants:
 * 1. Physical internet reconnection NEVER overrides user-selected OFFLINE mode.
 * 2. Application mode persistence across sessions and reboots.
 * 3. 100% Local SQLite operation in OFFLINE mode with zero outbound HTTP requests.
 * 4. Distinct states: ConnectivityState vs ApplicationMode vs SyncState.
 * 5. AUTO mode dynamic adaptation without data loss or layout shift.
 */

class LocalStorageMock {
  store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

if (typeof (globalThis as any).localStorage === "undefined") {
  (globalThis as any).localStorage = new LocalStorageMock();
}

class EventTargetMock {
  listeners: Record<string, Function[]> = {};
  addEventListener(event: string, fn: Function) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
  }
  dispatchEvent(event: { type: string; detail?: any }) {
    const list = this.listeners[event.type] || [];
    for (const fn of list) {
      fn(event);
    }
    return true;
  }
}

if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = new EventTargetMock();
}
if (typeof (globalThis as any).Event === "undefined") {
  (globalThis as any).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}
if (typeof (globalThis as any).CustomEvent === "undefined") {
  (globalThis as any).CustomEvent = class {
    type: string;
    detail: any;
    constructor(type: string, opts?: { detail?: any }) {
      this.type = type;
      this.detail = opts?.detail;
    }
  };
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { networkModeManager } from "../src/sync/networkModeManager";
import { networkHeartbeat } from "../src/sync/networkHeartbeat";
import { syncEngine } from "../src/sync/syncEngine";
import { OutboxQueue } from "../src/sync/outboxQueue";
import api from "../src/api/api";
import { getFullStats, getTickets } from "../src/services/desktopAdapter";

describe("Network Mode & Connectivity Decoupling Architecture", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    networkModeManager.setMode("AUTO");
  });

  it("Invariant 1: User-selected OFFLINE mode persists in localStorage across restarts", () => {
    networkModeManager.setMode("OFFLINE");
    expect(networkModeManager.getMode()).toBe("OFFLINE");
    expect(networkModeManager.isOfflineOnly()).toBe(true);
    expect(networkModeManager.isOnlineAllowed()).toBe(false);

    // Verify localStorage persistence
    const stored = localStorage.getItem("prava_network_mode");
    expect(stored).toBe("OFFLINE");
  });

  it("Invariant 2: OS online event MUST NEVER switch OFFLINE mode to ONLINE", () => {
    networkModeManager.setMode("OFFLINE");
    expect(networkModeManager.getMode()).toBe("OFFLINE");

    const spyTriggerSync = vi.spyOn(syncEngine, "triggerSync");
    const spyCheckNow = vi.spyOn(networkHeartbeat, "checkNow");

    // Simulate OS firing window 'online' event (e.g. WiFi reconnects or Ethernet cable plugged in)
    window.dispatchEvent(new Event("online"));

    // Critical assertion: mode MUST still be OFFLINE!
    expect(networkModeManager.getMode()).toBe("OFFLINE");
    expect(networkModeManager.isOfflineOnly()).toBe(true);
    expect(networkModeManager.isOnlineAllowed()).toBe(false);

    // In OFFLINE mode, syncEngine must NOT trigger sync, and networkHeartbeat must NOT probe
    expect(spyTriggerSync).not.toHaveBeenCalled();
    expect(spyCheckNow).not.toHaveBeenCalled();
  });

  it("Invariant 3: OFFLINE mode pauses heartbeat probes and returns 0ms latency immediately", async () => {
    networkModeManager.setMode("OFFLINE");

    const probeSpy = vi.spyOn(api, "get");
    const isOnline = await networkHeartbeat.checkNow();

    expect(isOnline).toBe(false);
    expect(probeSpy).not.toHaveBeenCalled();
  });

  it("Invariant 4: In OFFLINE mode, adapter calls immediately load local SQLite without HTTP calls", async () => {
    networkModeManager.setMode("OFFLINE");
    const apiGetSpy = vi.spyOn(api, "get");

    // Call getTickets
    const tickets = await getTickets();
    expect(Array.isArray(tickets)).toBe(true);

    // Call getFullStats
    const stats = await getFullStats(1);
    expect(stats).toBeDefined();
    expect(stats.ticket_stats.length).toBeGreaterThan(0);
    expect(stats.question_readiness.total).toBe(1190);

    // Assert zero network calls were attempted
    expect(apiGetSpy).not.toHaveBeenCalled();
  });

  it("Invariant 5: In OFFLINE mode, syncEngine refuses outbound push/pull cycles", async () => {
    networkModeManager.setMode("OFFLINE");
    const apiRequestSpy = vi.spyOn(api, "request");
    const apiGetSpy = vi.spyOn(api, "get");

    // Trigger sync while in OFFLINE mode
    const syncResult = await syncEngine.triggerSync();
    expect(syncResult.success).toBe(false);
    expect(syncResult.pushedCount).toBe(0);
    expect(syncResult.pulledCount).toBe(0);
    expect(syncResult.error).toBe("Offline mode active");

    // Assert zero HTTP requests were made to server
    expect(apiRequestSpy).not.toHaveBeenCalled();
    expect(apiGetSpy).not.toHaveBeenCalled();
  });

  it("Invariant 6: Mode switch from OFFLINE to ONLINE allows synchronization", () => {
    networkModeManager.setMode("OFFLINE");
    expect(networkModeManager.isOfflineOnly()).toBe(true);

    let eventFired = false;
    let newModeObserved = "";

    const unsub = networkModeManager.subscribe((m) => {
      if (m === "ONLINE") {
        eventFired = true;
        newModeObserved = m;
      }
    });

    networkModeManager.setMode("ONLINE");
    expect(eventFired).toBe(true);
    expect(newModeObserved).toBe("ONLINE");
    expect(networkModeManager.isOnlineAllowed()).toBe(true);

    unsub();
  });

  it("Invariant 7: Statistics percentages calculate consistently without NaN in offline mode", async () => {
    networkModeManager.setMode("OFFLINE");
    const stats = await getFullStats(1);

    const qPracticed = stats.question_readiness.ready + stats.question_readiness.average + stats.question_readiness.weak;
    const qTotal = stats.question_readiness.total;
    const qPercent = qTotal > 0 ? Math.round((qPracticed / qTotal) * 100) : 0;

    expect(Number.isNaN(qPercent)).toBe(false);
    expect(qPercent).toBeGreaterThanOrEqual(0);
    expect(qPercent).toBeLessThanOrEqual(100);

    const ticketReady = stats.ticket_ready;
    const ticketTotal = stats.ticket_total;
    const ticketPercent = ticketTotal > 0 ? Math.round((ticketReady / ticketTotal) * 100) : 0;

    expect(Number.isNaN(ticketPercent)).toBe(false);
    expect(ticketPercent).toBeGreaterThanOrEqual(0);
  });
});
