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

#[tauri::command]
async fn open_oauth_window(app: tauri::AppHandle, provider: Option<String>) -> Result<(), String> {
    use tauri::Manager;
    use tauri::Emitter;

    if let Some(w) = app.get_webview_window("auth-window") {
        let _ = w.set_focus();
        return Ok(());
    }

    let url_str = match provider.as_deref() {
        Some("google") => "https://pravaonline.uz/auth/login?oauth=google",
        Some("telegram") => "https://pravaonline.uz/auth/login?oauth=telegram",
        _ => "https://pravaonline.uz/auth/login",
    };

    let url: tauri::Url = url_str.parse().map_err(|e| format!("{}", e))?;

    let init_script = r#"
        (function() {
            function getCookie(name) {
                const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
                return match ? decodeURIComponent(match[1]) : null;
            }
            let done = false;
            function checkAndTransfer() {
                if (done) return;
                try {
                    const token = getCookie('accessToken');
                    let user = getCookie('userData');
                    if (!user) {
                        try { user = localStorage.getItem('userData'); } catch(e) {}
                    }
                    const refresh = getCookie('refreshToken') || '';
                    if (token && token.length > 20) {
                        done = true;
                        const q = new URLSearchParams();
                        q.set('token', token);
                        if (refresh) q.set('refresh', refresh);
                        if (user) q.set('user', user);
                        window.location.href = 'https://pravaonline.uz/__desktop_oauth_done?' + q.toString();
                    }
                } catch(e) {}
            }
            setInterval(checkAndTransfer, 250);
            checkAndTransfer();

            // Avtomatik provider tugmasini bosish (agar oauth param bo'lsa)
            function autoClick() {
                const params = new URLSearchParams(window.location.search);
                const oauth = params.get('oauth');
                if (!oauth) return;
                const btns = Array.from(document.querySelectorAll('button'));
                if (oauth === 'google') {
                    const googleBtn = btns.find(b => b.textContent && b.textContent.includes('Google'));
                    if (googleBtn) { googleBtn.click(); return; }
                } else if (oauth === 'telegram') {
                    const tgBtn = btns.find(b => b.textContent && b.textContent.includes('Telegram'));
                    if (tgBtn) { tgBtn.click(); return; }
                }
            }
            if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', () => setTimeout(autoClick, 500));
            } else {
                setTimeout(autoClick, 500);
            }
        })();
    "#;

    let app_clone = app.clone();
    let already_emitted = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let emitted_clone = already_emitted.clone();

    let win = tauri::WebviewWindowBuilder::new(&app, "auth-window", tauri::WebviewUrl::External(url))
        .title("Prava Online — Kirish")
        .inner_size(520.0, 720.0)
        .min_inner_size(420.0, 600.0)
        .center()
        .resizable(true)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
        .initialization_script(init_script)
        .on_new_window(|_url, _features| {
            tauri::webview::NewWindowResponse::Allow
        })
        .on_navigation(move |nav_url| {
            if nav_url.as_str().contains("__desktop_oauth_done") {
                if emitted_clone.swap(true, std::sync::atomic::Ordering::SeqCst) {
                    return false;
                }

                let mut token = String::new();
                let mut refresh = String::new();
                let mut user_json = String::new();

                for (key, val) in nav_url.query_pairs() {
                    match key.as_ref() {
                        "token" => token = val.to_string(),
                        "refresh" => refresh = val.to_string(),
                        "user" => user_json = val.to_string(),
                        _ => {}
                    }
                }

                if !token.is_empty() {
                    let parsed_user: serde_json::Value = serde_json::from_str(&user_json).unwrap_or(serde_json::Value::Null);
                    let payload = serde_json::json!({
                        "accessToken": token,
                        "refreshToken": refresh,
                        "user": parsed_user
                    });
                    let _ = app_clone.emit("desktop-auth-success", payload);
                    if let Some(w) = app_clone.get_webview_window("auth-window") {
                        let _ = w.close();
                    }
                }
                return false;
            }
            true
        })
        .build()
        .map_err(|e| e.to_string())?;

    let _ = win.set_focus();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
            open_oauth_window,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri app ishga tushmadi");
}
