//! Ed25519 activation code verifier.
//!
//! Backend [`Ed25519LicenseService`] (prava/prava) bilan 100% mos algoritm:
//!
//! ```text
//! EPOCH     = 2024-01-01 UTC
//! data[4]   = [startDays>>8, startDays&0xFF, endDays>>8, endDays&0xFF]
//! message   = UTF8(machineId.toUpperCase()) + 0x7C + data[4]
//! sig[64]   = Ed25519.sign(message, PRIVATE_KEY)
//! token68   = data[4] + sig[64]
//! token     = base64url_no_padding(token68)  +  '.' har 8 belgi
//! ```

use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use chrono::{DateTime, Datelike, TimeZone, Utc};
use ed25519_dalek::{Signature, SigningKey, Verifier, VerifyingKey};

use crate::license::LicenseStatus;

/// Backend Ed25519LicenseService bilan AYNAN BIR XIL seed (32 bayt).
/// ⚠️ Bu kalit backend tomonida ham bor — bir xil bo'lishi shart.
const PRIVATE_SEED: [u8; 32] = [
    0x07, 0x92, 0xb6, 0xf7, 0x25, 0xd9, 0x44, 0x33, 0xf0, 0x82, 0x92, 0x66, 0x85, 0xae, 0x5c, 0x37,
    0xe0, 0xd7, 0x6c, 0x1b, 0xf2, 0x45, 0x2f, 0x0b, 0x7b, 0xc5, 0xf6, 0xc0, 0x87, 0xd0, 0x34, 0x56,
];

fn verifying_key() -> VerifyingKey {
    SigningKey::from_bytes(&PRIVATE_SEED).verifying_key()
}

fn epoch() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap()
}

/// Dot-separated Ed25519 activation tokenini tekshiradi.
///
/// `machine_id` — joriy kompyuter ID (lowercase hex); backend uni `toUpperCase()` qiladi.
pub fn verify_activation_code(token_with_dots: &str, machine_id: &str) -> Result<LicenseStatus> {
    // 1. Dotlarni olib tashlash + base64url decode
    let clean: String = token_with_dots
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '.')
        .collect();

    let bytes = general_purpose::URL_SAFE_NO_PAD
        .decode(&clean)
        .map_err(|e| anyhow!("Noto'g'ri activation code formati: {}", e))?;

    if bytes.len() != 68 {
        return Err(anyhow!(
            "Activation code uzunligi xato: {} bayt (68 kerak)",
            bytes.len()
        ));
    }

    // 2. data[4] + sig[64]
    let data = &bytes[0..4];
    let sig_bytes = &bytes[4..68];

    let start_days = ((data[0] as u32) << 8) | data[1] as u32;
    let end_days = ((data[2] as u32) << 8) | data[3] as u32;

    // 3. Imzolanadigan xabarni qayta qurish
    let mid_upper = machine_id.to_uppercase();
    let mut msg = Vec::with_capacity(mid_upper.len() + 1 + 4);
    msg.extend_from_slice(mid_upper.as_bytes());
    msg.push(0x7C); // '|'
    msg.extend_from_slice(data);

    // 4. Ed25519 verify
    let signature = Signature::from_slice(sig_bytes)
        .map_err(|e| anyhow!("Imzo formatida xato: {}", e))?;
    verifying_key()
        .verify(&msg, &signature)
        .map_err(|_| anyhow!("Activation code yaroqsiz yoki o'zgartirilgan"))?;

    // 5. Sanalarni hisoblash
    let start_at = epoch() + chrono::Duration::days(start_days as i64);
    let expires_at = epoch() + chrono::Duration::days(end_days as i64);

    let now = Utc::now();
    if now < start_at {
        return Err(anyhow!(
            "Activation code hali ishga tushmagan (boshlanish: {})",
            start_at.format("%d.%m.%Y")
        ));
    }
    let is_expired = now > expires_at;
    let days_remaining = (expires_at - now).num_days().max(0);

    Ok(LicenseStatus {
        is_valid: !is_expired,
        is_expired,
        days_remaining,
        expires_at: format!(
            "{:02}.{:02}.{:04}",
            expires_at.day(),
            expires_at.month(),
            expires_at.year()
        ),
        machine_id: machine_id.to_string(),
    })
}

/// Helper: kalitda `.` bormi (dot-format Ed25519 belgisi).
pub fn is_activation_code(s: &str) -> bool {
    s.contains('.')
}
