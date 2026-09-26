/**
 * Exam sound effects — synthesized with the Web Audio API (no audio files).
 *
 * Settings live in localStorage `prava_sfx` = {"enabled":boolean,"volume":0..1}.
 * The Settings page can use getSfxEnabled / setSfxEnabled / getSfxVolume / setSfxVolume;
 * the exam UI subscribes with subscribeSfx to reflect the mute state (M key).
 *
 * The AudioContext is created lazily on the first user gesture (autoplay policy).
 */
export type SfxKind = "correct" | "wrong" | "warning" | "finish";

export const SFX_STORAGE_KEY = "prava_sfx";

interface SfxSettings {
  enabled: boolean;
  volume: number;
}

const DEFAULTS: SfxSettings = { enabled: true, volume: 0.6 };

function clampVolume(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULTS.volume;
}

function read(): SfxSettings {
  try {
    const raw = localStorage.getItem(SFX_STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      enabled: typeof p?.enabled === "boolean" ? p.enabled : DEFAULTS.enabled,
      volume: clampVolume(p?.volume ?? DEFAULTS.volume),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let settings: SfxSettings | null = null;
const listeners = new Set<() => void>();

function current(): SfxSettings {
  if (!settings) settings = read();
  return settings;
}

function write(next: SfxSettings): void {
  settings = next;
  try {
    localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — in-memory value still applies
  }
  listeners.forEach((l) => l());
}

export function getSfxEnabled(): boolean {
  return current().enabled;
}
export function setSfxEnabled(enabled: boolean): void {
  write({ ...current(), enabled: !!enabled });
}
export function toggleSfxEnabled(): boolean {
  const next = !getSfxEnabled();
  setSfxEnabled(next);
  return next;
}
export function getSfxVolume(): number {
  return current().volume;
}
export function setSfxVolume(volume: number): void {
  write({ ...current(), volume: clampVolume(volume) });
}
export function subscribeSfx(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Audio engine ─────────────────────────────────────────────────────────────
let ctx: AudioContext | null = null;
let gestureHooked = false;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor: typeof AudioContext | undefined =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Create / resume the AudioContext on the first pointer or key gesture. Idempotent. */
export function primeSfxOnFirstGesture(): void {
  if (gestureHooked || typeof window === "undefined") return;
  gestureHooked = true;
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    const c = getCtx();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

interface Tone {
  freq: number;
  /** Start offset (s). */
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  /** Optional glide target frequency. */
  to?: number;
}

/** Soft, short "Fluent-like" earcons: sine/triangle, fast attack, exponential decay. */
const PATTERNS: Record<SfxKind, Tone[]> = {
  correct: [
    { freq: 880, at: 0, dur: 0.12, type: "sine", gain: 0.5 },
    { freq: 1318.5, at: 0.07, dur: 0.18, type: "sine", gain: 0.45 },
  ],
  wrong: [
    { freq: 311, at: 0, dur: 0.16, type: "triangle", gain: 0.55, to: 262 },
    { freq: 233, at: 0.1, dur: 0.22, type: "triangle", gain: 0.45 },
  ],
  warning: [
    { freq: 988, at: 0, dur: 0.1, type: "sine", gain: 0.45 },
    { freq: 988, at: 0.18, dur: 0.1, type: "sine", gain: 0.45 },
  ],
  finish: [
    { freq: 523.25, at: 0, dur: 0.16, type: "sine", gain: 0.45 },
    { freq: 659.25, at: 0.1, dur: 0.16, type: "sine", gain: 0.45 },
    { freq: 783.99, at: 0.2, dur: 0.3, type: "sine", gain: 0.45 },
  ],
};

export function playSfx(kind: SfxKind): void {
  const s = current();
  if (!s.enabled || s.volume <= 0) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    const master = c.createGain();
    master.gain.value = s.volume * 0.35;
    master.connect(c.destination);
    const t0 = c.currentTime + 0.01;
    let end = t0;
    for (const tone of PATTERNS[kind]) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = tone.type ?? "sine";
      const start = t0 + tone.at;
      const stop = start + tone.dur;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, stop);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(tone.gain ?? 0.5, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, stop);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(stop + 0.02);
      end = Math.max(end, stop);
    }
    window.setTimeout(() => master.disconnect(), Math.ceil((end - c.currentTime + 0.1) * 1000));
  } catch {
    // audio unavailable — silently ignore
  }
}
