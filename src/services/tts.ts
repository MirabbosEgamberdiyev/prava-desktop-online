/**
 * Text-to-speech for exam questions (window.speechSynthesis).
 *
 * Voice choice by app language:
 *   ru        → a ru-* voice (prefers ru-RU), else default voice;
 *   uzl / uzc → a uz-* voice if Windows has one, else the default voice
 *               (and the UI shows a one-time "Uzbek voice not installed" notice).
 *
 * Settings: localStorage `prava_tts_auto` = "1" | "0" (auto-read each new question).
 * One-time notice flag: localStorage `prava_tts_uz_notice_shown` = "1".
 */
export const TTS_AUTO_KEY = "prava_tts_auto";
export const TTS_UZ_NOTICE_KEY = "prava_tts_uz_notice_shown";

export type TtsLang = "uzl" | "uzc" | "ru" | string;

export interface VoiceLike {
  lang: string;
  name: string;
  default?: boolean;
  localService?: boolean;
}

export interface VoiceChoice<V extends VoiceLike = VoiceLike> {
  voice: V | null;
  /** BCP-47 tag to set on the utterance. */
  lang: string;
  /** True when the preferred language had no installed voice → default voice is used. */
  fallback: boolean;
}

function norm(tag: string): string {
  return (tag || "").replace("_", "-").toLowerCase();
}

/** Pure voice selection (unit-tested). */
export function selectVoice<V extends VoiceLike>(lang: TtsLang, voices: readonly V[]): VoiceChoice<V> {
  const want = lang === "ru" ? "ru" : "uz";
  const preferredTag = want === "ru" ? "ru-RU" : lang === "uzc" ? "uz-Cyrl-UZ" : "uz-Latn-UZ";
  const matches = voices.filter((v) => norm(v.lang) === want || norm(v.lang).startsWith(`${want}-`));
  if (matches.length > 0) {
    const exact =
      want === "ru"
        ? matches.find((v) => norm(v.lang) === "ru-ru")
        : matches.find((v) =>
            lang === "uzc" ? norm(v.lang).includes("cyrl") : norm(v.lang).includes("latn") || norm(v.lang) === "uz-uz"
          );
    const voice = exact ?? matches.find((v) => v.localService) ?? matches[0];
    return { voice, lang: voice.lang || preferredTag, fallback: false };
  }
  const def = voices.find((v) => v.default) ?? voices[0] ?? null;
  return { voice: def, lang: def?.lang || preferredTag, fallback: true };
}

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function getTtsAuto(): boolean {
  try {
    return localStorage.getItem(TTS_AUTO_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTtsAuto(on: boolean): void {
  try {
    localStorage.setItem(TTS_AUTO_KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
}

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isTtsSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length > 0) {
    voicesCache = now;
    return Promise.resolve(now);
  }
  if (voicesCache.length > 0) return Promise.resolve(voicesCache);
  // Chromium/WebView2 populates voices asynchronously.
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.("voiceschanged", finish);
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    };
    synth.addEventListener?.("voiceschanged", finish);
    setTimeout(finish, 800);
  });
}

let speakToken = 0;

export function stopSpeaking(): void {
  speakToken++;
  if (isTtsSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function isSpeaking(): boolean {
  return isTtsSupported() && window.speechSynthesis.speaking;
}

export interface SpeakResult {
  /** Uzbek (uzl/uzc) requested but no uz-* voice installed — show the one-time notice. */
  showUzNotice: boolean;
  supported: boolean;
}

/** Read the given parts (question, then options) aloud. Cancels any current speech. */
export async function speakParts(parts: string[], lang: TtsLang): Promise<SpeakResult> {
  if (!isTtsSupported()) return { showUzNotice: false, supported: false };
  stopSpeaking();
  const token = speakToken;
  const voices = await loadVoices();
  if (token !== speakToken) return { showUzNotice: false, supported: true };
  const choice = selectVoice(lang, voices);
  const synth = window.speechSynthesis;
  for (const text of parts) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const u = new SpeechSynthesisUtterance(clean);
    if (choice.voice) u.voice = choice.voice;
    u.lang = choice.lang;
    u.rate = 1;
    synth.speak(u);
  }
  let showUzNotice = false;
  if (choice.fallback && lang !== "ru") {
    try {
      if (localStorage.getItem(TTS_UZ_NOTICE_KEY) !== "1") {
        localStorage.setItem(TTS_UZ_NOTICE_KEY, "1");
        showUzNotice = true;
      }
    } catch {
      showUzNotice = false;
    }
  }
  return { showUzNotice, supported: true };
}
