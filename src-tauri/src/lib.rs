// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Clone)]
pub struct InstalledApp {
    pub name: String,
    pub path: String,
    pub icon: String, // base64 encoded icon or empty
}

#[derive(Serialize)]
pub struct PlatformInfo {
    pub platform: String,        // "macos" or "windows"
    pub has_app_path_tab: bool, // Mac: false, Windows: true
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
        // 扫描 /Applications 目录
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

                        // 尝试读取应用图标 (Info.plist → CFBundleIconFile)
                        let icon = get_mac_app_icon(&path);

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
        // 扫描开始菜单快捷方式
        let start_menu_dirs = vec![
            PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"),
        ];

        // 也扫描用户开始菜单
        if let Some(home) = dirs_home() {
            start_menu_dirs.push(
                home.join(r"AppData\Roaming\Microsoft\Windows\Start Menu\Programs"),
            );
        }

        for dir in &start_menu_dirs {
            scan_windows_dir(dir, &mut apps);
        }

        // 扫描 Program Files
        let program_dirs = vec![
            PathBuf::from(r"C:\Program Files"),
            PathBuf::from(r"C:\Program Files (x86)"),
        ];

        for dir in &program_dirs {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        // 在程序目录中查找 .exe 文件
                        if let Ok(sub_entries) = fs::read_dir(&path) {
                            for sub_entry in sub_entries.flatten() {
                                let sub_path = sub_entry.path();
                                if sub_path.extension().map_or(false, |ext| ext == "exe") {
                                    let name = sub_path
                                        .file_stem()
                                        .unwrap_or_default()
                                        .to_string_lossy()
                                        .to_string();

                                    // 过滤掉 uninstall 相关的
                                    if !name.to_lowercase().contains("uninstall")
                                        && !name.to_lowercase().contains("uninst")
                                    {
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

    // 按名称排序并去重
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    apps
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

/// 获取 macOS 应用图标 (简化版，返回空字符串，前端用默认图标)
#[cfg(target_os = "macos")]
fn get_mac_app_icon(_app_path: &PathBuf) -> String {
    // 完整实现需要读取 Info.plist 并提取 .icns 文件
    // 这里先返回空，前端使用默认图标
    String::new()
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
                    icon: String::new(),
                });
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            get_platform_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
