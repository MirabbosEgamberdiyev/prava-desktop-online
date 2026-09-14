export interface LicenseStatus {
  is_valid: boolean;
  is_expired: boolean;
  days_remaining: number;
  expires_at: string;
  machine_id: string;
}

/**
 * Detect if running inside a Tauri webview window.
 */
export function isTauriApp(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/**
 * Call Tauri IPC command `get_machine_id_cmd`
 */
export async function getMachineId(): Promise<string> {
  if (!isTauriApp()) {
    return "DEV-BROWSER-MACHINE-ID";
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("get_machine_id_cmd");
}

/**
 * Call Tauri IPC command `activate_license`
 */
export async function activateLicense(licenseKey: string): Promise<LicenseStatus> {
  if (!isTauriApp()) {
    return {
      is_valid: true,
      is_expired: false,
      days_remaining: 365,
      expires_at: "2027-12-31",
      machine_id: "DEV-BROWSER-MACHINE-ID",
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<LicenseStatus>("activate_license", { licenseKey });
}

/**
 * Call Tauri IPC command `check_license`
 */
export async function checkLicense(): Promise<LicenseStatus> {
  if (!isTauriApp()) {
    // In web browser dev preview, consider license valid
    return {
      is_valid: true,
      is_expired: false,
      days_remaining: 365,
      expires_at: "2027-12-31",
      machine_id: "DEV-BROWSER-MACHINE-ID",
    };
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<LicenseStatus>("check_license");
}
