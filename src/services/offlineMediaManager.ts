/**
 * PRAVA DESKTOP ONLINE — OFFLINE MEDIA MANAGER
 * Manages local caching of question diagrams, traffic signs, and attachments.
 * In OFFLINE mode: 100% local cache retrieval with ZERO network requests.
 */

import { ENV } from "../config/env";
import { networkModeManager } from "../sync/networkModeManager";
import { installAutoMediaPreload } from "./offlineMediaManagerPreload";

const MEDIA_CACHE_NAME = "prava_offline_media_v1";
const API_BASE_URL = ENV.API_BASE_URL || "https://pravaonline.uz";

// In-memory object URL cache to avoid re-generating blobs continuously
const memoryBlobMap = new Map<string, string>();

export function normalizeMediaPath(rawPath: string | null | undefined): string | null {
  if (!rawPath || typeof rawPath !== "string") return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // Remove full domain if present
  let clean = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  clean = clean.replace(/^\/+/, "");

  if (clean.startsWith("uploads/")) {
    clean = clean.substring("uploads/".length);
  }
  if (clean.startsWith("api/v1/files/")) {
    clean = clean.substring("api/v1/files/".length);
  }

  return `/api/v1/files/${clean}`;
}

export function getRemoteMediaUrl(imagePath: string): string {
  const normalized = normalizeMediaPath(imagePath);
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${normalized}`;
}

export const offlineMediaManager = {
  /**
   * Check if an image is already cached locally
   */
  async isCached(imagePath: string): Promise<boolean> {
    const key = normalizeMediaPath(imagePath);
    if (!key) return false;

    if (memoryBlobMap.has(key)) return true;

    if (typeof caches === "undefined") return false;
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const match = await cache.match(key);
      return !!match;
    } catch {
      return false;
    }
  },

  /**
   * Get a local object URL (blob:...) for the image.
   * If in OFFLINE mode and not found in cache, returns null (never attempts network!).
   */
  async getLocalImageUrl(imagePath: string): Promise<string | null> {
    const key = normalizeMediaPath(imagePath);
    if (!key) return null;

    if (memoryBlobMap.has(key)) {
      return memoryBlobMap.get(key)!;
    }

    if (typeof caches === "undefined") {
      return null;
    }

    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const res = await cache.match(key);
      if (res) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        memoryBlobMap.set(key, objectUrl);
        return objectUrl;
      }
    } catch (err) {
      console.warn("[OfflineMediaManager] Error reading cache:", err);
    }

    return null;
  },

  /**
   * Cache a single image into local CacheStorage.
   */
  async cacheImage(imagePath: string): Promise<boolean> {
    const key = normalizeMediaPath(imagePath);
    if (!key) return false;

    // Skip if already in cache
    if (await this.isCached(key)) return true;

    // If offline only, do not attempt network fetch
    if (networkModeManager.isOfflineOnly()) return false;

    const remoteUrl = getRemoteMediaUrl(key);
    try {
      const resp = await fetch(remoteUrl, { mode: "cors" });
      if (!resp.ok) return false;

      const blob = await resp.blob();
      if (blob.size === 0) return false;

      const responseToCache = new Response(blob, {
        headers: {
          "Content-Type": resp.headers.get("Content-Type") || "image/png",
          "Content-Length": String(blob.size),
        },
      });

      if (typeof caches !== "undefined") {
        const cache = await caches.open(MEDIA_CACHE_NAME);
        await cache.put(key, responseToCache);
      }

      const objUrl = URL.createObjectURL(blob);
      memoryBlobMap.set(key, objUrl);
      return true;
    } catch (err) {
      console.warn(`[OfflineMediaManager] Failed to cache image ${key}:`, err);
      return false;
    }
  },

  /**
   * Synchronous lookup of an already-resolved local object URL (no I/O).
   * Lets the exam view render a cached image on the very first frame.
   */
  peekLocalImageUrl(imagePath: string | null | undefined): string | null {
    const key = normalizeMediaPath(imagePath);
    return key ? memoryBlobMap.get(key) ?? null : null;
  },

  /**
   * Diagnostic: "missing" (not cached), "broken" (cached but empty / not an image) or "ok".
   */
  async inspectCachedImage(imagePath: string): Promise<"ok" | "missing" | "broken"> {
    const key = normalizeMediaPath(imagePath);
    if (!key) return "broken";
    if (typeof caches === "undefined") return memoryBlobMap.has(key) ? "ok" : "missing";
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const res = await cache.match(key);
      if (!res) return memoryBlobMap.has(key) ? "ok" : "missing";
      const type = res.headers.get("Content-Type") || "";
      if (type && !type.startsWith("image/") && !type.startsWith("application/octet-stream")) return "broken";
      const blob = await res.blob();
      return blob.size > 0 ? "ok" : "broken";
    } catch {
      return "missing";
    }
  },

  /**
   * Remove one cached entry (evicts broken images so they are downloaded again).
   */
  async evict(imagePath: string): Promise<void> {
    const key = normalizeMediaPath(imagePath);
    if (!key) return;
    const url = memoryBlobMap.get(key);
    if (url) {
      memoryBlobMap.delete(key);
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    if (typeof caches === "undefined") return;
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      await cache.delete(key);
    } catch {
      // ignore
    }
  },

  /**
   * Get the total count of cached images
   */
  async getCachedCount(): Promise<number> {
    if (typeof caches === "undefined") return 0;
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const keys = await cache.keys();
      return keys.length;
    } catch {
      return 0;
    }
  },

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    memoryBlobMap.clear();
    if (typeof caches !== "undefined") {
      try {
        await caches.delete(MEDIA_CACHE_NAME);
      } catch {
        // ignore
      }
    }
  },
};

// Background full-media preload after the offline bundle sync (idle-time, throttled, resumable).
// Skipped in unit tests so importing this manager stays side-effect free there.
if (typeof window !== "undefined" && import.meta.env?.MODE !== "test") {
  installAutoMediaPreload();
}
