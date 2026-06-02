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

#[tauri::command]
fn activate_license(
    license_key: String,
    state: tauri::State<AppState>,
) -> Result<license::LicenseStatus, String> {
    let status = license::verify_license(&license_key).map_err(|e| e.to_string())?;
    license::save_license_file(&license_key, &state.app_data_dir).map_err(|e| e.to_string())?;
    *state.license_key.lock().unwrap() = Some(license_key);
    Ok(status)
}

#[tauri::command]
fn check_license(state: tauri::State<AppState>) -> Result<license::LicenseStatus, String> {
    let key = license::load_license_file(&state.app_data_dir).map_err(|e| e.to_string())?;
    let status = license::verify_license(&key).map_err(|e| e.to_string())?;
    *state.license_key.lock().unwrap() = Some(key);
    Ok(status)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
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
