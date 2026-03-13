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

                        apps.push(InstalledApp {
                            name,
                            path: path.to_string_lossy().to_string(),
                            icon: "📱".to_string(),
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
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    apps
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
        // 处理 .lnk 快捷方式和 .exe 文件
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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            get_platform_info,
            launch_app
        ]);

    // Windows 系统托盘
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
    };

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
