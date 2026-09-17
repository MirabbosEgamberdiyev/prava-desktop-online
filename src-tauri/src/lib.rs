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
    let mut lock = state.license_key.lock().unwrap_or_else(|e| e.into_inner());
    *lock = Some(license_key);
    Ok(status)
}

#[tauri::command]
fn check_license(state: tauri::State<AppState>) -> Result<license::LicenseStatus, String> {
    let key = license::load_license_file(&state.app_data_dir).map_err(|e| e.to_string())?;
    let status = verify_any(&key).map_err(|e| e.to_string())?;
    let mut lock = state.license_key.lock().unwrap_or_else(|e| e.into_inner());
    *lock = Some(key);
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

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct InstalledBrowser {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub path: String,
    pub is_default: bool,
}

#[tauri::command]
fn get_installed_browsers() -> Vec<InstalledBrowser> {
    let mut browsers = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let local_appdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let appdata = std::env::var("APPDATA").unwrap_or_default();

        let candidates = [
            (
                "chrome",
                "Google Chrome",
                "chrome",
                vec![
                    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe".to_string(),
                    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe".to_string(),
                    format!("{}\\Google\\Chrome\\Application\\chrome.exe", local_appdata),
                ],
            ),
            (
                "edge",
                "Microsoft Edge",
                "edge",
                vec![
                    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe".to_string(),
                    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe".to_string(),
                ],
            ),
            (
                "firefox",
                "Mozilla Firefox",
                "firefox",
                vec![
                    "C:\\Program Files\\Mozilla Firefox\\firefox.exe".to_string(),
                    "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe".to_string(),
                ],
            ),
            (
                "brave",
                "Brave Browser",
                "brave",
                vec![
                    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe".to_string(),
                    format!("{}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe", local_appdata),
                ],
            ),
            (
                "opera",
                "Opera",
                "opera",
                vec![
                    format!("{}\\Programs\\Opera\\launcher.exe", local_appdata),
                    format!("{}\\Opera Software\\Opera Stable\\launcher.exe", appdata),
                    "C:\\Program Files\\Opera\\launcher.exe".to_string(),
                ],
            ),
        ];

        let mut default_assigned = false;

        for (id, name, icon, paths) in candidates {
            for path in paths {
                if !path.is_empty() && std::path::Path::new(&path).exists() {
                    let is_default = if !default_assigned && (id == "chrome" || id == "edge") {
                        default_assigned = true;
                        true
                    } else {
                        false
                    };

                    browsers.push(InstalledBrowser {
                        id: id.to_string(),
                        name: name.to_string(),
                        icon: icon.to_string(),
                        path,
                        is_default,
                    });
                    break;
                }
            }
        }

        if !default_assigned && !browsers.is_empty() {
            browsers[0].is_default = true;
        }
    }

    #[cfg(target_os = "macos")]
    {
        let mac_candidates = [
            ("chrome", "Google Chrome", "chrome", "/Applications/Google Chrome.app"),
            ("safari", "Safari", "safari", "/Applications/Safari.app"),
            ("edge", "Microsoft Edge", "edge", "/Applications/Microsoft Edge.app"),
            ("firefox", "Mozilla Firefox", "firefox", "/Applications/Firefox.app"),
            ("brave", "Brave Browser", "brave", "/Applications/Brave Browser.app"),
        ];
        for (id, name, icon, path) in mac_candidates {
            if std::path::Path::new(path).exists() {
                browsers.push(InstalledBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    icon: icon.to_string(),
                    path: path.to_string(),
                    is_default: id == "chrome" || id == "safari",
                });
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let linux_candidates = [
            ("chrome", "Google Chrome", "chrome", "/usr/bin/google-chrome"),
            ("firefox", "Mozilla Firefox", "firefox", "/usr/bin/firefox"),
            ("brave", "Brave Browser", "brave", "/usr/bin/brave-browser"),
            ("edge", "Microsoft Edge", "edge", "/usr/bin/microsoft-edge"),
        ];
        for (id, name, icon, path) in linux_candidates {
            if std::path::Path::new(path).exists() {
                browsers.push(InstalledBrowser {
                    id: id.to_string(),
                    name: name.to_string(),
                    icon: icon.to_string(),
                    path: path.to_string(),
                    is_default: id == "chrome" || id == "firefox",
                });
            }
        }
    }

    browsers
}

fn is_safe_auth_url(url: &str) -> bool {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return false;
    }
    if url.contains('\0') || url.contains('\r') || url.contains('\n') || url.contains('\"') || url.contains('\'') {
        return false;
    }
    url.starts_with("https://pravaonline.uz")
        || url.starts_with("http://localhost")
        || url.starts_with("https://accounts.google.com")
        || url.starts_with("https://t.me")
        || url.starts_with("https://telegram.me")
}

fn is_safe_browser_binary(path: &str) -> bool {
    let lower = path.to_lowercase();
    let allowed_endings = [
        "chrome.exe",
        "msedge.exe",
        "firefox.exe",
        "brave.exe",
        "launcher.exe",
        "opera.exe",
        "google chrome.app",
        "safari.app",
        "microsoft edge.app",
        "firefox.app",
        "brave browser.app",
        "/google-chrome",
        "/firefox",
        "/brave-browser",
        "/microsoft-edge",
        "/opera",
    ];
    let path_obj = std::path::Path::new(path);
    if !path_obj.exists() {
        return false;
    }
    for ending in allowed_endings {
        if lower.ends_with(ending) {
            return true;
        }
    }
    false
}

#[tauri::command]
fn launch_browser_url(browser_path: Option<String>, url: String) -> Result<(), String> {
    if !is_safe_auth_url(&url) {
        return Err("Ruxsat berilmagan yoki xavfli URL manzil".to_string());
    }

    if let Some(path) = browser_path {
        if !path.is_empty() && is_safe_browser_binary(&path) {
            #[cfg(target_os = "windows")]
            {
                std::process::Command::new(&path)
                    .arg(&url)
                    .spawn()
                    .map_err(|e| format!("Failed to spawn browser: {}", e))?;
                return Ok(());
            }

            #[cfg(target_os = "macos")]
            {
                std::process::Command::new("open")
                    .arg("-a")
                    .arg(&path)
                    .arg(&url)
                    .spawn()
                    .map_err(|e| format!("Failed to launch browser: {}", e))?;
                return Ok(());
            }

            #[cfg(target_os = "linux")]
            {
                std::process::Command::new(&path)
                    .arg(&url)
                    .spawn()
                    .map_err(|e| format!("Failed to spawn browser: {}", e))?;
                return Ok(());
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL via system handler: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

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
            get_installed_browsers,
            launch_browser_url,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri app ishga tushmadi");
}
