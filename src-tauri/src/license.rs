use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Utc};
use mac_address::get_mac_address;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sysinfo::System;

/// License ma'lumotlari
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseData {
    pub machine_id: String,
    pub expires_at: DateTime<Utc>,
    pub issued_at: DateTime<Utc>,
    pub product: String,
}

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

/// Encryption key (Prava-desktop bilan 100% bir xil — bir xil litsenziya ikkalasida ham ishlaydi)
const SECRET_KEY: &[u8; 32] = b"PrAvA-SeCrEt-KeY-2024-OfFlInE!!!";

/// License key'ni decrypt qilish va tekshirish
pub fn verify_license(license_key: &str) -> Result<LicenseStatus> {
    let machine_id = get_machine_id();

    // Base64 decode
    let encrypted_data = general_purpose::URL_SAFE_NO_PAD
        .decode(license_key.trim())
        .map_err(|e| anyhow!("Noto'g'ri license format: {}", e))?;

    if encrypted_data.len() < 12 {
        return Err(anyhow!("License key juda qisqa"));
    }

    // Nonce (12 byte) va ciphertext ajratish
    let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    // AES-256-GCM decrypt
    let key = Key::<Aes256Gcm>::from_slice(SECRET_KEY);
    let cipher = Aes256Gcm::new(key);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| anyhow!("License key noto'g'ri yoki buzilgan"))?;

    // JSON parse
    let license_data: LicenseData =
        serde_json::from_slice(&plaintext).map_err(|e| anyhow!("License ma'lumoti xato: {}", e))?;

    // Machine ID tekshirish
    if license_data.machine_id != machine_id {
        return Err(anyhow!(
            "Bu license key boshqa kompyuter uchun. Machine ID mos kelmaydi."
        ));
    }

    // Product tekshirish (Prava-desktop bilan bir xil — bitta litsenziya ikkalasini ham aktivlashtiradi)
    if license_data.product != "prava-desktop" {
        return Err(anyhow!("Noto'g'ri mahsulot uchun license"));
    }

    // Expiration tekshirish
    let now = Utc::now();
    let is_expired = now > license_data.expires_at;
    let days_remaining = (license_data.expires_at - now).num_days().max(0);

    Ok(LicenseStatus {
        is_valid: !is_expired,
        is_expired,
        days_remaining,
        expires_at: license_data
            .expires_at
            .format("%d.%m.%Y")
            .to_string(),
        machine_id: machine_id.clone(),
    })
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
pub fn check_license_exists(app_data_dir: &std::path::Path) -> bool {
    app_data_dir.join("license.key").exists()
}
