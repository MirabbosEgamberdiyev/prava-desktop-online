mod activation;
mod license;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub app_data_dir: PathBuf,
    pub license_key: Mutex<Option<String>>,
}

/// Sekin/bloklovchi ishni (fayl tizimi, apparat so'rovi, jarayon ishga tushirish) Tokio
/// blocking pool'ida bajaradi — IPC handler va UI (main) thread hech qachon bloklanmaydi.
async fn run_blocking<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("Background task failed: {e}"))?
}

#[tauri::command]
async fn get_machine_id_cmd() -> Result<String, String> {
    run_blocking(|| Ok(license::get_machine_id())).await
}

/// Aktivatsiya kodini tekshiradi — faqat Ed25519 imzoli format qabul qilinadi.
///
/// SECURITY: eski AES-GCM formati olib tashlandi — uning simmetrik kaliti binary ichida
/// edi va istalgan kompyuter uchun litsenziya yasashga imkon berardi.
fn verify_any(key: &str) -> anyhow::Result<license::LicenseStatus> {
    if !activation::is_activation_code(key) {
        anyhow::bail!("Eski formatdagi litsenziya endi qo'llab-quvvatlanmaydi. Yangi aktivatsiya kodini oling.");
    }
    let mid = license::get_machine_id();
    activation::verify_activation_code(key, &mid)
}

#[tauri::command]
async fn activate_license(
    license_key: String,
    state: tauri::State<'_, AppState>,
) -> Result<license::LicenseStatus, String> {
    let dir = state.app_data_dir.clone();
    let key = license_key.clone();
    let status = run_blocking(move || {
        let status = verify_any(&key).map_err(|e| e.to_string())?;
        license::save_license_file(&key, &dir).map_err(|e| e.to_string())?;
        Ok(status)
    })
    .await?;
    let mut lock = state.license_key.lock().unwrap_or_else(|e| e.into_inner());
    *lock = Some(license_key);
    Ok(status)
}

#[tauri::command]
async fn check_license(state: tauri::State<'_, AppState>) -> Result<license::LicenseStatus, String> {
    let dir = state.app_data_dir.clone();
    let (key, status) = run_blocking(move || {
        let key = license::load_license_file(&dir).map_err(|e| e.to_string())?;
        let status = verify_any(&key).map_err(|e| e.to_string())?;
        Ok((key, status))
    })
    .await?;
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
            // Web ilova shu oynada refresh token'ni JS cookie'da saqlasin (HttpOnly emas) —
            // desktop uni o'qib o'z sessiyasiga o'tkazadi. Oddiy brauzerda web HttpOnly rejimda ishlaydi.
            window.__PRAVA_DESKTOP_AUTH__ = true;
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
        .on_new_window(|url, _features| handle_new_window(url.as_str()))
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

/// Disk bo'yicha brauzer qidirish (bir nechta `Path::exists`) — blocking pool'da.
#[tauri::command]
async fn get_installed_browsers() -> Result<Vec<InstalledBrowser>, String> {
    run_blocking(|| Ok(detect_installed_browsers())).await
}

fn detect_installed_browsers() -> Vec<InstalledBrowser> {
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

/// Tashqi brauzerda ochish uchun ruxsat etilgan HTTPS hostlar (aniq moslik).
const SAFE_AUTH_HOSTS: &[&str] = &[
    "pravaonline.uz",
    "www.pravaonline.uz",
    "web.pravaonline.uz",
    "accounts.google.com",
    "t.me",
    "telegram.me",
];

/// P1-D1: avval `starts_with("https://pravaonline.uz")` ishlatilardi —
/// `https://pravaonline.uz.evil.com` yoki `https://pravaonline.uz@evil.com`
/// ham o'tib ketardi. Endi URL to'liq parse qilinadi va scheme + host
/// aniq solishtiriladi.
fn is_safe_auth_url(url: &str) -> bool {
    // Buyruq qatori argumenti sifatida uzatiladi — boshqaruv/qo'shtirnoq belgilar taqiqlanadi
    if url.contains('\0') || url.contains('\r') || url.contains('\n') || url.contains('"') || url.contains('\'') {
        return false;
    }
    let parsed = match tauri::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return false,
    };
    // Login ma'lumotli URL'lar (user:pass@host) rad etiladi
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return false;
    }
    let host = match parsed.host_str() {
        Some(h) => h.to_ascii_lowercase(),
        None => return false,
    };
    match parsed.scheme() {
        "https" => parsed.port().is_none() && SAFE_AUTH_HOSTS.contains(&host.as_str()),
        // Mahalliy dev server faqat debug build'da
        "http" => cfg!(debug_assertions) && (host == "localhost" || host == "127.0.0.1"),
        _ => false,
    }
}

/// OAuth popup'lari (Telegram widget) ochadigan qo'shimcha host — faqat ilova ichidagi
/// yangi oyna uchun (launch_browser_url ro'yxatini kengaytirmaydi).
const EXTRA_POPUP_HOSTS: &[&str] = &["oauth.telegram.org"];

#[derive(Debug, PartialEq, Eq)]
enum NewWindowAction {
    /// Ilova ichida yangi WebView oynasi (faqat ruxsat etilgan auth hostlar).
    AllowInApp,
    /// Tizim brauzerida ochiladi, ilova ichida oyna yaratilmaydi.
    OpenExternal,
    /// Umuman ochilmaydi (javascript:, file:, data:, about:blank, ...).
    Deny,
}

/// window.open / target=_blank uchun qaror: allow-list'dagi auth URL'lar ilova ichida,
/// boshqa http(s) URL'lar tashqi brauzerda, qolganlari rad etiladi.
fn new_window_action(url: &str) -> NewWindowAction {
    if is_safe_auth_url(url) {
        return NewWindowAction::AllowInApp;
    }
    let parsed = match tauri::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return NewWindowAction::Deny,
    };
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return NewWindowAction::Deny;
    }
    match parsed.scheme() {
        "https" => {
            let host = parsed.host_str().unwrap_or("").to_ascii_lowercase();
            if parsed.port().is_none() && EXTRA_POPUP_HOSTS.contains(&host.as_str()) {
                NewWindowAction::AllowInApp
            } else {
                NewWindowAction::OpenExternal
            }
        }
        "http" => NewWindowAction::OpenExternal,
        _ => NewWindowAction::Deny,
    }
}

fn handle_new_window<R: tauri::Runtime>(url: &str) -> tauri::webview::NewWindowResponse<R> {
    match new_window_action(url) {
        NewWindowAction::AllowInApp => tauri::webview::NewWindowResponse::Allow,
        NewWindowAction::OpenExternal => {
            let _ = tauri_plugin_opener::open_url(url, None::<&str>);
            tauri::webview::NewWindowResponse::Deny
        }
        NewWindowAction::Deny => tauri::webview::NewWindowResponse::Deny,
    }
}

#[cfg(test)]
mod new_window_tests {
    use super::{new_window_action, NewWindowAction};

    #[test]
    fn auth_urls_stay_in_app() {
        assert_eq!(new_window_action("https://accounts.google.com/o/oauth2/v2/auth?x=1"), NewWindowAction::AllowInApp);
        assert_eq!(new_window_action("https://pravaonline.uz/auth/login"), NewWindowAction::AllowInApp);
        assert_eq!(new_window_action("https://oauth.telegram.org/auth?bot_id=1"), NewWindowAction::AllowInApp);
    }

    #[test]
    fn other_web_urls_open_externally() {
        assert_eq!(new_window_action("https://tirikchilik.uz/pravaonline"), NewWindowAction::OpenExternal);
        assert_eq!(new_window_action("https://pravaonline.uz.evil.com/"), NewWindowAction::OpenExternal);
        assert_eq!(new_window_action("http://example.com/"), NewWindowAction::OpenExternal);
    }

    #[test]
    fn dangerous_urls_are_denied() {
        assert_eq!(new_window_action("javascript:alert(1)"), NewWindowAction::Deny);
        assert_eq!(new_window_action("file:///C:/Windows/System32/calc.exe"), NewWindowAction::Deny);
        assert_eq!(new_window_action("about:blank"), NewWindowAction::Deny);
        assert_eq!(new_window_action("https://user:pw@evil.com/"), NewWindowAction::Deny);
        assert_eq!(new_window_action("not a url"), NewWindowAction::Deny);
    }
}

#[cfg(test)]
mod safe_auth_url_tests {
    use super::is_safe_auth_url;

    #[test]
    fn allows_exact_hosts() {
        assert!(is_safe_auth_url("https://pravaonline.uz/auth/login?oauth=google"));
        assert!(is_safe_auth_url("https://web.pravaonline.uz/auth/login"));
        assert!(is_safe_auth_url("https://www.pravaonline.uz/"));
        assert!(is_safe_auth_url("https://accounts.google.com/o/oauth2/v2/auth?x=1"));
        assert!(is_safe_auth_url("https://t.me/pravaonlineuzbot"));
    }

    #[test]
    fn rejects_lookalike_hosts() {
        assert!(!is_safe_auth_url("https://pravaonline.uz.evil.com"));
        assert!(!is_safe_auth_url("https://pravaonline.uz.evil.com/auth/login"));
        assert!(!is_safe_auth_url("https://pravaonline.uz@evil.com/"));
        assert!(!is_safe_auth_url("https://evilpravaonline.uz/"));
        assert!(!is_safe_auth_url("https://accounts.google.com.evil.com/"));
        assert!(!is_safe_auth_url("https://t.me.evil.com/"));
    }

    #[test]
    fn rejects_bad_schemes_and_chars() {
        assert!(!is_safe_auth_url("http://pravaonline.uz/"));
        assert!(!is_safe_auth_url("file:///C:/Windows/System32/calc.exe"));
        assert!(!is_safe_auth_url("javascript:alert(1)"));
        assert!(!is_safe_auth_url("https://pravaonline.uz/\" --foo"));
        assert!(!is_safe_auth_url("https://pravaonline.uz:8443/"));
        assert!(!is_safe_auth_url("not a url"));
    }

    #[test]
    fn localhost_only_in_debug() {
        assert_eq!(is_safe_auth_url("http://localhost:1421/"), cfg!(debug_assertions));
        assert!(!is_safe_auth_url("http://localhost.evil.com/"));
    }
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
async fn launch_browser_url(browser_path: Option<String>, url: String) -> Result<(), String> {
    run_blocking(move || launch_browser_url_blocking(browser_path, url)).await
}

fn launch_browser_url_blocking(browser_path: Option<String>, url: String) -> Result<(), String> {
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

            // Main window is built here (tauri.conf.json "windows" is intentionally empty):
            // default 1280x800, desktop minimum 1024x680.
            //
            // Frameless: the React titlebar (src/shell/TitleBar.tsx) draws the caption, drag
            // region (`data-tauri-drag-region`) and min/max/close buttons. `shadow(true)` keeps
            // the Windows 11 drop shadow, 1px border and rounded corners on an undecorated
            // window; resize borders are still handled natively by tao.
            // Limitation: Windows 11 Snap Layouts flyout only appears when hovering a *native*
            // maximize caption button (HTMAXBUTTON hit-test), so it is not shown for the custom
            // button. Win+Z, Win+Arrow snapping and drag-to-edge snapping keep working.
            // The OAuth "auth-window" (open_oauth_window) stays natively decorated.
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                .title("Prava Online - Haydovchilik imtihoniga tayyorlanish")
                .inner_size(1280.0, 800.0)
                .min_inner_size(1024.0, 680.0)
                .resizable(true)
                .decorations(false)
                .shadow(true)
                .fullscreen(false)
                .center()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
                .on_new_window(|url, _features| handle_new_window(url.as_str()))
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
