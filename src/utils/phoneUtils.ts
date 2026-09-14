/**
 * Utilities for formatting, validating, and normalizing Uzbekistan phone numbers (+998 XX XXX XX XX).
 */

/**
 * Format raw input string into "+998 XX XXX XX XX"
 */
export function formatUzPhone(value: string): string {
  if (!value) return "";

  // Extract all numeric digits
  let digits = value.replace(/\D/g, "");

  // If empty after stripping
  if (!digits) return "";

  // Handle various paste scenarios:
  // e.g. "8901234567" -> replace leading 8 with 998 if 10 digits
  if (digits.length === 10 && digits.startsWith("8")) {
    digits = "998" + digits.slice(1);
  } else if (!digits.startsWith("998")) {
    // If user starts typing e.g. "90...", auto-prepend "998"
    digits = "998" + digits;
  }

  // Cap at 12 digits (998 + 9 digits)
  digits = digits.slice(0, 12);

  // Build formatted string: +998 XX XXX XX XX
  const parts: string[] = ["+998"];

  if (digits.length > 3) {
    // Operator code: XX
    parts.push(digits.slice(3, Math.min(5, digits.length)));
  }
  if (digits.length > 5) {
    // First 3 digits: XXX
    parts.push(digits.slice(5, Math.min(8, digits.length)));
  }
  if (digits.length > 8) {
    // Next 2 digits: XX
    parts.push(digits.slice(8, Math.min(10, digits.length)));
  }
  if (digits.length > 10) {
    // Final 2 digits: XX
    parts.push(digits.slice(10, 12));
  }

  return parts.join(" ");
}

/**
 * Normalize phone number to backend format "+998XXXXXXXXX"
 */
export function normalizeUzPhone(value: string): string {
  if (!value) return "";
  let digits = value.replace(/\D/g, "");

  if (digits.length === 9) {
    digits = "998" + digits;
  }

  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits}`;
  }

  return digits.length > 0 ? `+${digits}` : "";
}

/**
 * Validates whether the phone number is a valid 12-digit Uzbekistan number (+998XXXXXXXXX)
 */
export function isValidUzPhone(value: string): boolean {
  const normalized = normalizeUzPhone(value);
  return /^\+998\d{9}$/.test(normalized);
}
