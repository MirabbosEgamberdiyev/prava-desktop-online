mod activation;
mod license;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub app_data_dir: PathBuf,
    pub license_key: Mutex<Option<String>>,
}

#[tauri::command]
fn get_machine_id_cmd() -> String {
    license::get_machine_id()
}

/// Activation code yoki licenseni tekshiradi.
///
/// - Agar kalit ichida `.` belgisi bo'lsa → Ed25519 (backend chiqargan format).
/// - Aks holda → eski AES-GCM license formatiga fallback.
fn verify_any(key: &str) -> anyhow::Result<license::LicenseStatus> {
    if activation::is_activation_code(key) {
        let mid = license::get_machine_id();
        activation::verify_activation_code(key, &mid)
    } else {
        license::verify_license(key)
    }
}

#[tauri::command]
fn activate_license(
    license_key: String,
    state: tauri::State<AppState>,
) -> Result<license::LicenseStatus, String> {
    let status = verify_any(&license_key).map_err(|e| e.to_string())?;
    license::save_license_file(&license_key, &state.app_data_dir).map_err(|e| e.to_string())?;
    *state.license_key.lock().unwrap() = Some(license_key);
    Ok(status)
}

#[tauri::command]
fn check_license(state: tauri::State<AppState>) -> Result<license::LicenseStatus, String> {
    let key = license::load_license_file(&state.app_data_dir).map_err(|e| e.to_string())?;
    let status = verify_any(&key).map_err(|e| e.to_string())?;
    *state.license_key.lock().unwrap() = Some(key);
    Ok(status)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // tauri_plugin_shell olib tashlandi: frontend uni umuman ishlatmaydi,
        // lekin `shell:allow-open` ruxsati ochiq turgani IPC hujum yuzasini
        // keraksiz kengaytirardi (ixtiyoriy URL/fayl ochish).
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("App data dir topilmadi");
            std::fs::create_dir_all(&app_data_dir)
                .expect("App data dir yaratib bo'lmadi");

            app.manage(AppState {
                app_data_dir,
                license_key: Mutex::new(None),
            });

            // Asosiy oyna yaratish — Google va Telegram OAuth popup (window.open) uchun ruxsat bilan:
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                .title("Prava Online - Haydovchilik imtihoniga tayyorlanish")
                .inner_size(1280.0, 800.0)
                .min_inner_size(1024.0, 700.0)
                .resizable(true)
                .fullscreen(false)
                .center()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
                .on_new_window(|_url, _features| {
                    tauri::webview::NewWindowResponse::Allow
                })
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_machine_id_cmd,
            activate_license,
            check_license,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri app ishga tushmadi");
}
