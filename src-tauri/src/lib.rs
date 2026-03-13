use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

#[derive(Serialize, Clone)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
    pub icon: String,
}

#[derive(Serialize)]
pub struct PlatformInfo {
    pub platform: String,
    pub has_app_path_tab: bool,
    pub script_extensions: Vec<String>,
}

/// 获取平台信息
#[tauri::command]
fn get_platform_info() -> PlatformInfo {
    #[cfg(target_os = "macos")]
    {
        PlatformInfo {
            platform: "macos".to_string(),
            has_app_path_tab: false,
            script_extensions: vec![
                ".sh".to_string(),
                ".command".to_string(),
                ".workflow".to_string(),
                ".scpt".to_string(),
                ".applescript".to_string(),
            ],
        }
    }
    #[cfg(target_os = "windows")]
    {
        PlatformInfo {
            platform: "windows".to_string(),
            has_app_path_tab: true,
            script_extensions: vec![
                ".bat".to_string(),
                ".cmd".to_string(),
                ".ps1".to_string(),
                ".vbs".to_string(),
                ".wsf".to_string(),
            ],
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        PlatformInfo {
            platform: "linux".to_string(),
            has_app_path_tab: true,
            script_extensions: vec![".sh".to_string(), ".py".to_string()],
        }
    }
}

/// 从 macOS .app 提取 Base64 图标
#[cfg(target_os = "macos")]
fn extract_mac_icon(app_path: &std::path::Path) -> Option<String> {
    use std::io::Read;
    // 读 Info.plist 找图标文件名
    let plist_path = app_path.join("Contents/Info.plist");
    if !plist_path.exists() {
        return None;
    }
    let output = Command::new("defaults")
        .args(["read", &plist_path.to_string_lossy(), "CFBundleIconFile"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let mut icon_name = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if icon_name.is_empty() {
        return None;
    }
    if !icon_name.ends_with(".icns") {
        icon_name.push_str(".icns");
    }
    let icns_path = app_path.join("Contents/Resources").join(&icon_name);
    if !icns_path.exists() {
        return None;
    }
    // 用 sips 转 PNG 到临时文件
    let tmp_png = format!("/tmp/app_icon_{}.png", std::process::id());
    let status = Command::new("sips")
        .args(["-s", "format", "png", "-z", "64", "64",
               &icns_path.to_string_lossy(), "--out", &tmp_png])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .ok()?;
    if !status.success() {
        return None;
    }
    // 读取 PNG 文件并 base64 编码
    let mut file = fs::File::open(&tmp_png).ok()?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).ok()?;
    let _ = fs::remove_file(&tmp_png);

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Some(format!("data:image/png;base64,{}", b64))
}

/// 从 Windows .exe 提取 Base64 图标
#[cfg(target_os = "windows")]
fn extract_win_icon(exe_path: &str) -> Option<String> {
    use std::io::Read;
    let tmp_png = format!("{}\\app_icon_{}.png",
        std::env::temp_dir().to_string_lossy(), std::process::id());
    let ps_script = format!(
        r#"Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{}'); if ($icon) {{ $bmp = $icon.ToBitmap(); $bmp.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $icon.Dispose() }}"#,
        exe_path.replace("'", "''"),
        tmp_png.replace("'", "''")
    );
    let status = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .ok()?;
    if !status.success() {
        return None;
    }
    let tmp_path = std::path::Path::new(&tmp_png);
    if !tmp_path.exists() {
        return None;
    }
    let mut file = fs::File::open(&tmp_png).ok()?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).ok()?;
    let _ = fs::remove_file(&tmp_png);

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Some(format!("data:image/png;base64,{}", b64))
}

/// 获取已安装应用列表
#[tauri::command]
fn get_installed_apps() -> Vec<InstalledApp> {
    let mut apps: Vec<InstalledApp> = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let app_dirs = vec![
            PathBuf::from("/Applications"),
            dirs_home().map(|h| h.join("Applications")).unwrap_or_default(),
        ];

        for app_dir in app_dirs {
            if let Ok(entries) = fs::read_dir(&app_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |ext| ext == "app") {
                        let name = path
                            .file_stem()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();

                        // 提取真实图标
                        let icon = extract_mac_icon(&path)
                            .unwrap_or_else(|| "📱".to_string());

                        apps.push(InstalledApp {
                            name,
                            path: path.to_string_lossy().to_string(),
                            icon,
                        });
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let mut start_menu_dirs = vec![
            PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"),
        ];

        if let Some(home) = dirs_home() {
            start_menu_dirs.push(
                home.join(r"AppData\Roaming\Microsoft\Windows\Start Menu\Programs"),
            );
        }

        for dir in &start_menu_dirs {
            scan_windows_dir(dir, &mut apps);
        }

        let program_dirs = vec![
            PathBuf::from(r"C:\Program Files"),
            PathBuf::from(r"C:\Program Files (x86)"),
        ];

        for dir in &program_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        if let Ok(sub_entries) = fs::read_dir(&path) {
                            for sub_entry in sub_entries.flatten() {
                                let sub_path = sub_entry.path();
                                if sub_path.extension().map_or(false, |ext| ext == "exe") {
                                    let name = sub_path
                                        .file_stem()
                                        .unwrap_or_default()
                                        .to_string_lossy()
                                        .to_string();

                                    if !name.to_lowercase().contains("uninstall")
                                        && !name.to_lowercase().contains("uninst")
                                    {
                                        apps.push(InstalledApp {
                                            name,
                                            path: sub_path.to_string_lossy().to_string(),
                                            icon: "💻".to_string(),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 提取 Windows 应用图标（限前50个以提高性能）
        for app in apps.iter_mut().take(50) {
            let exe_path = if app.path.ends_with(".lnk") {
                // 解析 .lnk 快捷方式获取目标路径
                if let Some(target) = resolve_lnk_target(&app.path) {
                    target
                } else {
                    continue;
                }
            } else {
                app.path.clone()
            };
            if let Some(icon_b64) = extract_win_icon(&exe_path) {
                app.icon = icon_b64;
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    apps
}

/// 解析 Windows .lnk 快捷方式的目标路径
#[cfg(target_os = "windows")]
fn resolve_lnk_target(lnk_path: &str) -> Option<String> {
    let ps_script = format!(
        r#"$sh = New-Object -ComObject WScript.Shell; $sc = $sh.CreateShortcut('{}'); Write-Output $sc.TargetPath"#,
        lnk_path.replace("'", "''")
    );
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps_script])
        .output()
        .ok()?;
    if output.status.success() {
        let target = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !target.is_empty() {
            return Some(target);
        }
    }
    None
}

/// 启动应用
#[tauri::command]
fn launch_app(app_path: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&app_path)
            .spawn()
            .map_err(|e| format!("启动失败: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        if app_path.ends_with(".lnk") {
            Command::new("cmd")
                .args(["/C", "start", "", &app_path])
                .spawn()
                .map_err(|e| format!("启动失败: {}", e))?;
        } else {
            Command::new(&app_path)
                .spawn()
                .map_err(|e| format!("启动失败: {}", e))?;
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Command::new("xdg-open")
            .arg(&app_path)
            .spawn()
            .map_err(|e| format!("启动失败: {}", e))?;
    }

    Ok(format!("已启动: {}", app_path))
}

/// 设置窗口关闭行为
#[tauri::command]
fn set_close_behavior(app: tauri::AppHandle, minimize_to_tray: bool) -> Result<(), String> {
    let state = app.state::<CloseBehavior>();
    state.0.store(minimize_to_tray, std::sync::atomic::Ordering::Relaxed);
    Ok(())
}

struct CloseBehavior(std::sync::atomic::AtomicBool);

/// 获取用户主目录
fn dirs_home() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}

/// 扫描 Windows 目录下的快捷方式
#[cfg(target_os = "windows")]
fn scan_windows_dir(dir: &PathBuf, apps: &mut Vec<InstalledApp>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                scan_windows_dir(&path, apps);
            } else if path.extension().map_or(false, |ext| ext == "lnk") {
                let name = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                apps.push(InstalledApp {
                    name,
                    path: path.to_string_lossy().to_string(),
                    icon: "💻".to_string(),
                });
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_autostart::MacosLauncher;

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .manage(CloseBehavior(std::sync::atomic::AtomicBool::new(true)))
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            get_platform_info,
            launch_app,
            set_close_behavior
        ]);

    // Windows 系统托盘 + 窗口关闭拦截
    #[cfg(target_os = "windows")]
    let builder = {
        use tauri::{
            menu::{Menu, MenuItem},
            tray::TrayIconBuilder,
        };
        builder.setup(|app| {
            let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("自启精灵")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                if let Some(state) = app.try_state::<CloseBehavior>() {
                    let minimize = state.0.load(std::sync::atomic::Ordering::Relaxed);
                    if minimize {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            }
        })
    };

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
