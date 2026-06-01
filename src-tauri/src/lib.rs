// Prava-Desktop-Online — minimal Tauri shell
// Barcha logika React (HTTP API calls) da
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("Tauri app ishga tushmadi");
}
