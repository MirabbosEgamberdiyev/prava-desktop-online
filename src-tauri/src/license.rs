use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseData {
    pub machine_id: String,
    pub expires_at: DateTime<Utc>,
    pub issued_at: DateTime<Utc>,
    pub product: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_valid: bool,
    pub is_expired: bool,
    pub days_remaining: i64,
    pub expires_at: String,
    pub machine_id: String,
}

/// Windows 7-11 uchun barqaror Machine ID:
/// BIOS SerialNumber + CPU ProcessorId + Disk SerialNumber
/// Agar WMI ishlamasa (kam ehtimol), fallback sifatida hostname + OS info ishlatiladi.
pub fn get_machine_id() -> String {
    let mut hasher = Sha256::new();

    // 1) BIOS serial (Win7+ da ishlaydi)
    if let Some(val) = wmi_value("bios", "SerialNumber") {
        hasher.update(val.as_bytes());
    }

    // 2) CPU ProcessorId (hardware ID, Win7+ da ishlaydi)
    if let Some(val) = wmi_value("cpu", "ProcessorId") {
        hasher.update(val.as_bytes());
    }

    // 3) Boot disk serial (C: disk)
    if let Some(val) = disk_serial() {
        hasher.update(val.as_bytes());
    }

    // Fallback: hostname (agar hamma WMI ishlamay qolsa ham unique bo'lishi uchun)
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        hasher.update(name.as_bytes());
    }

    let result = hasher.finalize();
    hex::encode(&result[..16])
}

fn wmi_value(alias: &str, prop: &str) -> Option<String> {
    let output = Command::new("wmic")
        .args([alias, "get", prop])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let val = text
        .lines()
        .filter_map(|l| {
            let t = l.trim();
            if t.is_empty() || t.eq_ignore_ascii_case(prop) {
                None
            } else {
                Some(t.to_string())
            }
        })
        .next()?;
    if val.is_empty() { None } else { Some(val) }
}

fn disk_serial() -> Option<String> {
    let output = Command::new("wmic")
        .args(["diskdrive", "where", "Index=0", "get", "SerialNumber"])
        .creation_flags(0x08000000)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let val = text
        .lines()
        .filter_map(|l| {
            let t = l.trim();
            if t.is_empty() || t.eq_ignore_ascii_case("SerialNumber") {
                None
            } else {
                Some(t.to_string())
            }
        })
        .next()?;
    if val.is_empty() { None } else { Some(val) }
}

const SECRET_KEY: &[u8; 32] = b"PrAvA-SeCrEt-KeY-2024-OnLiNe!!X!";

pub fn verify_license(license_key: &str) -> Result<LicenseStatus> {
    let machine_id = get_machine_id();

    let encrypted_data = general_purpose::URL_SAFE_NO_PAD
        .decode(license_key.trim())
        .map_err(|e| anyhow!("Noto'g'ri license format: {}", e))?;

    if encrypted_data.len() < 12 {
        return Err(anyhow!("License key juda qisqa"));
    }

    let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let key = Key::<Aes256Gcm>::from_slice(SECRET_KEY);
    let cipher = Aes256Gcm::new(key);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| anyhow!("License key noto'g'ri yoki buzilgan"))?;

    let license_data: LicenseData =
        serde_json::from_slice(&plaintext).map_err(|e| anyhow!("License ma'lumoti xato: {}", e))?;

    if license_data.machine_id != machine_id {
        return Err(anyhow!(
            "Bu license key boshqa kompyuter uchun. Machine ID mos kelmaydi."
        ));
    }

    if license_data.product != "prava-online" {
        return Err(anyhow!("Noto'g'ri mahsulot uchun license"));
    }

    let now = Utc::now();
    let is_expired = now > license_data.expires_at;
    let days_remaining = (license_data.expires_at - now).num_days().max(0);

    Ok(LicenseStatus {
        is_valid: !is_expired,
        is_expired,
        days_remaining,
        expires_at: license_data.expires_at.format("%d.%m.%Y").to_string(),
        machine_id,
    })
}

pub fn save_license_file(license_key: &str, app_data_dir: &std::path::Path) -> Result<()> {
    std::fs::write(app_data_dir.join("license.key"), license_key)?;
    Ok(())
}

pub fn load_license_file(app_data_dir: &std::path::Path) -> Result<String> {
    let content = std::fs::read_to_string(app_data_dir.join("license.key"))
        .map_err(|_| anyhow!("License fayl topilmadi"))?;
    Ok(content.trim().to_string())
}

pub fn check_license_exists(app_data_dir: &std::path::Path) -> bool {
    app_data_dir.join("license.key").exists()
}
