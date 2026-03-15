use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use tauri::Emitter;

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

/// 获取已安装应用列表（快速返回，不提取图标）
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

                        apps.push(InstalledApp {
                            name,
                            path: path.to_string_lossy().to_string(),
                            icon: String::new(), // 图标由 get_app_icon 懒加载
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

                                    let name_lower = name.to_lowercase();
                                    // 过滤卸载程序和系统工具
                                    let is_system = name_lower.contains("uninstall")
                                        || name_lower.contains("uninst")
                                        || name_lower.contains("remove")
                                        || name_lower.contains("setup")
                                        || name_lower.contains("install")
                                        || name_lower.contains("update")
                                        || name_lower.contains("crash")
                                        || name_lower.contains("repair")
                                        || name_lower.contains("helper")
                                        || name_lower.contains("service")
                                        || name_lower.contains("daemon")
                                        || name_lower.contains("worker")
                                        || name_lower.starts_with("qt")
                                        || name_lower == "cmd"
                                        || name.starts_with("卸载")
                                        || name.starts_with("Uninstall");

                                    if !is_system {
                                        // Filter garbled names
                                        let has_garbled = name.contains('\u{FFFD}') || name.len() < 2
                                            || name.chars().any(|c| c.is_control());
                                        if !has_garbled {
                                            apps.push(InstalledApp {
                                                name,
                                                path: sub_path.to_string_lossy().to_string(),
                                                icon: String::new(),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    // Windows only: 同一目录只保留一个应用 (Mac apps are all in /Applications, so skip)
    #[cfg(target_os = "windows")]
    {
        let mut seen_dirs = std::collections::HashSet::new();
        apps.retain(|app| {
            if let Some(parent) = std::path::Path::new(&app.path).parent() {
                let dir_key = parent.to_string_lossy().to_lowercase();
                seen_dirs.insert(dir_key)
            } else {
                true
            }
        });
    }
    apps
}

/// 懒加载单个应用图标（前端逐个调用，不阻塞列表加载）
#[tauri::command]
async fn get_app_icon(app_path: String) -> Result<String, String> {
    // 在后台线程中提取图标，避免阻塞 UI
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "macos")]
        {
            extract_mac_icon(std::path::Path::new(&app_path))
                .unwrap_or_default()
        }
        #[cfg(target_os = "windows")]
        {
            // 先尝试解析 .lnk 快捷方式
            let actual_path = if app_path.ends_with(".lnk") {
                resolve_lnk_target(&app_path).unwrap_or(app_path.clone())
            } else {
                app_path.clone()
            };
            extract_win_icon(&actual_path).unwrap_or_default()
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            let _ = app_path;
            String::new()
        }
    })
    .await
    .map_err(|e| format!("图标提取失败: {}", e))
}

/// 从 macOS .app 提取 Base64 图标
#[cfg(target_os = "macos")]
fn extract_mac_icon(app_path: &std::path::Path) -> Option<String> {
    use std::io::Read;
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
    // 用唯一临时文件名避免冲突
    let tmp_png = format!("/tmp/app_icon_{}_{}.png", std::process::id(),
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    let status = Command::new("sips")
        .args(["-s", "format", "png", "-z", "48", "48",
               &icns_path.to_string_lossy(), "--out", &tmp_png])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .ok()?;
    if !status.success() {
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

/// 从 Windows .exe 提取 Base64 图标（隐藏窗口版本）
#[cfg(target_os = "windows")]
fn extract_win_icon(exe_path: &str) -> Option<String> {
    use std::io::Read;
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let tmp_png = format!("{}\\app_icon_{}_{}.png",
        std::env::temp_dir().to_string_lossy(), std::process::id(),
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    let ps_script = format!(
        r#"Add-Type -AssemblyName System.Drawing; try {{ $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{}'); if ($icon) {{ $bmp = $icon.ToBitmap(); $bmp.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $icon.Dispose() }} }} catch {{}}"#,
        exe_path.replace("'", "''"),
        tmp_png.replace("'", "''")
    );
    let status = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
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

/// 解析 Windows .lnk 快捷方式的目标路径
#[cfg(target_os = "windows")]
fn resolve_lnk_target(lnk_path: &str) -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let ps_script = format!(
        r#"$sh = New-Object -ComObject WScript.Shell; $sc = $sh.CreateShortcut('{}'); Write-Output $sc.TargetPath"#,
        lnk_path.replace("'", "''")
    );
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
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
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if app_path.ends_with(".lnk") {
            Command::new("cmd")
                .args(["/C", "start", "", &app_path])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| format!("启动失败: {}", e))?;
        } else {
            Command::new(&app_path)
                .creation_flags(CREATE_NO_WINDOW)
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

/// 检查更新（使用系统 curl，绕过 Mac WebView 的 ATS 限制）
#[tauri::command]
async fn check_update(platform: String, version: String) -> Result<String, String> {
    let url = format!("http://aacc.fun:3001/api/updates/check?platform={}&version={}", platform, version);
    let result = tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        let output = {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            Command::new("curl")
                .args(["-s", "-L", "--connect-timeout", "10", "--max-time", "15", &url])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
        };
        #[cfg(not(target_os = "windows"))]
        let output = Command::new("curl")
            .args(["-s", "-L", "--connect-timeout", "10", "--max-time", "15", &url])
            .output();
        let output = output.map_err(|e| format!("curl 执行失败: {}", e))?;
        if output.status.success() {
            String::from_utf8(output.stdout)
                .map_err(|e| format!("响应解析失败: {}", e))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(format!("请求失败: {}", stderr))
        }
    }).await.map_err(|e| format!("任务失败: {}", e))?;
    result
}

/// 下载更新文件（使用系统 curl，跨平台可靠）
#[tauri::command]
async fn download_update(app: tauri::AppHandle, url: String) -> Result<String, String> {
    // 确定下载路径
    let ext = if url.contains(".dmg") { ".dmg" } else { ".exe" };
    let filename = format!("update_{}{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs(), ext);
    let download_path = std::env::temp_dir().join(&filename);
    let download_path_str = download_path.to_string_lossy().to_string();

    // 发送开始事件
    let _ = app.emit("download-progress", serde_json::json!({
        "status": "downloading",
        "downloaded": 0u64,
        "total": 0u64,
        "speed": 0u64,
        "path": &download_path_str
    }));

    // 启动进度监控线程（通过文件大小监控下载进度）
    let app_clone = app.clone();
    let path_clone = download_path_str.clone();
    let progress_handle = std::thread::spawn(move || {
        let start = std::time::Instant::now();
        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));
            if let Ok(meta) = std::fs::metadata(&path_clone) {
                let size = meta.len();
                let elapsed = start.elapsed().as_secs_f64();
                let speed = if elapsed > 0.0 { (size as f64 / elapsed) as u64 } else { 0 };
                let _ = app_clone.emit("download-progress", serde_json::json!({
                    "status": "downloading",
                    "downloaded": size,
                    "total": 0u64,
                    "speed": speed,
                    "path": &path_clone
                }));
            }
            // 检查文件是否还在被写入（最多等5分钟）
            if start.elapsed().as_secs() > 300 {
                break;
            }
        }
    });

    // 使用系统 curl 下载（Mac/Win10+ 都自带 curl）
    let curl_result = tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            Command::new("curl")
                .args(["-L", "-o", &download_path.to_string_lossy(), &url, "--connect-timeout", "30", "--max-time", "300"])
                .creation_flags(CREATE_NO_WINDOW)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
        }
        #[cfg(not(target_os = "windows"))]
        {
            Command::new("curl")
                .args(["-L", "-o", &download_path.to_string_lossy(), &url, "--connect-timeout", "30", "--max-time", "300"])
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
        }
    }).await.map_err(|e| format!("下载任务失败: {}", e))?;

    // 停止进度监控
    let _ = progress_handle;

    match curl_result {
        Ok(status) if status.success() => {
            // 获取最终文件大小
            let final_size = std::fs::metadata(&download_path_str).map(|m| m.len()).unwrap_or(0);
            let _ = app.emit("download-progress", serde_json::json!({
                "status": "completed",
                "downloaded": final_size,
                "total": final_size,
                "speed": 0u64,
                "path": &download_path_str
            }));
            Ok(download_path_str)
        }
        Ok(_) => Err("下载失败: curl 返回错误".to_string()),
        Err(e) => Err(format!("下载失败: {}", e)),
    }
}

/// 安装更新并重启
#[tauri::command]
async fn install_update(app: tauri::AppHandle, file_path: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        // macOS: 打开 .dmg 文件
        Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开安装包失败: {}", e))?;
        // 延迟退出，让用户看到提示
        let app_clone = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(2));
            app_clone.exit(0);
        });
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        // Windows: 运行 NSIS .exe 安装程序
        Command::new("cmd")
            .args(["/C", "start", "", &file_path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("运行安装程序失败: {}", e))?;
        let app_clone = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(2));
            app_clone.exit(0);
        });
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (&app, &file_path);
    }
    Ok("安装中...".to_string())
}

/// 设置窗口标题栏主题
#[tauri::command]
async fn set_window_theme(app: tauri::AppHandle, theme: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        match theme.as_str() {
            "dark" => { let _ = window.set_theme(Some(tauri::Theme::Dark)); }
            "light" => { let _ = window.set_theme(Some(tauri::Theme::Light)); }
            _ => { let _ = window.set_theme(None); } // auto / follow system
        }
    }
    Ok(())
}

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
                // Filter out uninstall shortcuts
                let name_lower = name.to_lowercase();
                let is_uninstall = name_lower.starts_with("uninstall")
                    || name_lower.starts_with("uninst")
                    || name.starts_with("卸载")
                    || name_lower.contains("uninstall")
                    || name_lower.contains("remove")
                    || name_lower.contains("repair");
                if !is_uninstall {
                    // Filter out garbled/unreadable names
                    let has_garbled = name.contains('\u{FFFD}') || name.len() < 2
                        || name.chars().any(|c| c.is_control());
                    if !has_garbled {
                        apps.push(InstalledApp {
                            name,
                            path: path.to_string_lossy().to_string(),
                            icon: String::new(),
                        });
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_autostart::MacosLauncher;

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
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
            get_app_icon,
            get_platform_info,
            launch_app,
            set_close_behavior,
            set_window_theme,
            check_update,
            download_update,
            install_update
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
                .icon(tauri::include_image!("icons/tray-icon.png"))
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
