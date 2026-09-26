use anyhow::{anyhow, Result};
use mac_address::get_mac_address;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sysinfo::System;

/// License holati
#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_valid: bool,
    pub is_expired: bool,
    pub days_remaining: i64,
    pub expires_at: String,
    pub machine_id: String,
}

/// Kompyuter unique ID ni hisoblash (CPU + MAC + HDD)
pub fn get_machine_id() -> String {
    let mut hasher = Sha256::new();

    // MAC address
    if let Ok(Some(mac)) = get_mac_address() {
        hasher.update(mac.bytes());
    }

    // CPU/System info
    let mut sys = System::new_all();
    sys.refresh_all();

    // Hostname
    if let Some(hostname) = System::host_name() {
        hasher.update(hostname.as_bytes());
    }

    // OS version
    if let Some(os_ver) = System::os_version() {
        hasher.update(os_ver.as_bytes());
    }

    // CPU brand
    for cpu in sys.cpus() {
        hasher.update(cpu.brand().as_bytes());
        break; // Faqat birinchi CPU
    }

    let result = hasher.finalize();
    hex::encode(&result[..16]) // 32 ta hex character
}

/// License file'ni saqlash (AppData ichida)
pub fn save_license_file(license_key: &str, app_data_dir: &std::path::Path) -> Result<()> {
    let license_path = app_data_dir.join("license.key");
    std::fs::write(&license_path, license_key)?;
    Ok(())
}

/// License file'ni o'qish
pub fn load_license_file(app_data_dir: &std::path::Path) -> Result<String> {
    let license_path = app_data_dir.join("license.key");
    let content = std::fs::read_to_string(&license_path)
        .map_err(|_| anyhow!("License fayl topilmadi"))?;
    Ok(content.trim().to_string())
}

/// License bor yoki yo'qligini tekshirish
#[allow(dead_code)]
pub fn check_license_exists(app_data_dir: &std::path::Path) -> bool {
    app_data_dir.join("license.key").exists()
}
