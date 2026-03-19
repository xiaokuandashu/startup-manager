use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use tauri::Emitter;

mod ai_engine;
mod recorder;
mod local_model;
mod accessibility;
mod marketplace;
mod openclaw;
mod ws_server;

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
                                        let is_garbled = name.contains('\u{FFFD}') || name.len() < 2
                                            || name.chars().any(|c| c.is_control()
                                                || ('\u{E000}'..='\u{F8FF}').contains(&c)
                                                || ('\u{FE00}'..='\u{FE0F}').contains(&c)
                                            );
                                        if !is_garbled {
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

        // 使用 cmd.exe /S /C "chcp 65001 >nul & <command>" 运行任意包含中文及参数的路径
        // 这样可以原生支持参数传递、含有空格的路径，以及 UTF-8 编码的 .bat 脚本（防乱码）
        let cmd_str = format!("chcp 65001 >nul & {}", app_path);
        let mut cmd = Command::new("cmd");
        cmd.raw_arg("/S")
           .raw_arg("/C")
           .raw_arg(format!("\"{}\"", cmd_str))
           .creation_flags(CREATE_NO_WINDOW);

        cmd.spawn().map_err(|e| format!("启动失败: {}", e))?;
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
    // 优化下载速度: 使用 --speed-limit/--speed-time 自动重试慢连接, --retry 重试, 
    // 去掉 --max-time 防止大文件下载被强制中断, --compressed 压缩传输
    let curl_result = tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            Command::new("curl")
                .args([
                    "-L", "-o", &download_path.to_string_lossy(), &url,
                    "--connect-timeout", "15",
                    "--retry", "3",
                    "--retry-delay", "2",
                    "--speed-limit", "1000",
                    "--speed-time", "30",
                    "--compressed",
                    "-H", "Connection: keep-alive",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
        }
        #[cfg(not(target_os = "windows"))]
        {
            Command::new("curl")
                .args([
                    "-L", "-o", &download_path.to_string_lossy(), &url,
                    "--connect-timeout", "15",
                    "--retry", "3",
                    "--retry-delay", "2",
                    "--speed-limit", "1000",
                    "--speed-time", "30",
                    "--compressed",
                    "-H", "Connection: keep-alive",
                ])
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

/// AI 局部解析 — 本地规则引擎
#[tauri::command]
fn ai_parse_intent(input: String) -> ai_engine::AiResponse {
    let apps = get_installed_apps();
    let app_infos: Vec<ai_engine::AppInfo> = apps.iter().map(|a| ai_engine::AppInfo {
        name: a.name.clone(),
        name_lower: a.name.to_lowercase(),
        path: a.path.clone(),
    }).collect();
    ai_engine::parse_intent(&input, &app_infos)
}

/// AI 云端解析 — DeepSeek API
#[tauri::command]
async fn ai_cloud_parse(input: String) -> Result<String, String> {
    let api_key = "sk-3d0295d2c9084d8ba7681135c586c505";
    let system_prompt = r#"你是「任务精灵」AI全能助手。你有三种能力：

## 能力一：自由对话
当用户问问题、闲聊、求助时，直接用自然语言回答。输出JSON格式：
{"message":"你的回答内容","response_type":"info","tasks":[]}

## 能力二：创建自动化任务
只有当用户**明确要求创建定时任务、自动化操作**时，才创建任务。
输出JSON格式：
{"message":"确认消息","response_type":"task_created","tasks":[...]}

### 任务类型
1. 简单任务: task_type 为 "application" 或 "script"
2. 链式任务（含"然后"/"接着"/"等X分钟"/"先...再..."）: task_type 为 "chain"，含 steps 数组

### 可用 step 类型
- {"order":N,"type":"open_app","app_path":"路径"}
- {"order":N,"type":"wait","wait_seconds":N} 或 {"order":N,"type":"wait","wait_minutes":N}
- {"order":N,"type":"playback_recording","recording_name":"名称"}
- {"order":N,"type":"execute_script","script_content":"代码","script_type":"bash/applescript/powershell"}
- {"order":N,"type":"browser_action","tool":"browser_navigate","url":"URL"}

### 平台路径
macOS: /Applications/WeChat.app, /Applications/Google Chrome.app, /Applications/DingTalk.app, /Applications/Feishu.app
Windows: C:\Program Files\Tencent\WeChat\WeChat.exe, C:\Program Files\Google\Chrome\Application\chrome.exe

## 能力三：本地执行（通过 OpenClaw）
当用户要求**立即执行**本地操作时，如查看系统信息、创建文件夹、打开应用、执行命令等，使用 OpenClaw 执行。
输出JSON格式：
{"message":"正在执行...","response_type":"execute","execute_command":"要执行的shell命令","tasks":[]}

可执行的操作包括但不限于：
- 查看电脑配置/系统信息：execute_command 为 "system_profiler SPHardwareDataType"(macOS) 或 "systeminfo"(Windows)
- 查看CPU信息：execute_command 为 "sysctl -n machdep.cpu.brand_string"(macOS) 或 "wmic cpu get name"(Windows)
- 查看内存：execute_command 为 "sysctl hw.memsize"(macOS) 或 "wmic memorychip get capacity"(Windows)
- 查看硬盘：execute_command 为 "df -h"(macOS) 或 "wmic diskdrive get size,model"(Windows)
- 创建文件夹：execute_command 为 "mkdir -p ~/Desktop/名称"(macOS) 或 "mkdir %USERPROFILE%\\Desktop\\名称"(Windows)
- 打开文件/应用：execute_command 为 "open 路径"(macOS) 或 "start 路径"(Windows)
- 查看桌面文件：execute_command 为 "ls -la ~/Desktop"(macOS) 或 "dir %USERPROFILE%\\Desktop"(Windows)
- 查看进程：execute_command 为 "ps aux | head -20"(macOS) 或 "tasklist"(Windows)
- 查看网络：execute_command 为 "ifconfig"(macOS) 或 "ipconfig"(Windows)
- 所有终端命令

⚠️ 路径规则（非常重要）：
- macOS 路径必须用 ~ 开头，如 ~/Desktop，不要用 /Users/username/
- Windows 路径用 %USERPROFILE% 开头，不要硬编码用户名
- 中文"桌面"对应 ~/Desktop（macOS），%USERPROFILE%\Desktop（Windows）

## 判断规则（非常重要）
- 用户问问题/闲聊 → response_type:"info"
- 用户要创建定时任务 → response_type:"task_created"
- 用户要查看系统信息/执行命令/创建文件/打开东西/本地操作 → response_type:"execute"
- 不确定时 → 当做问题回答 (info)

## 示例
输入: 我电脑什么配置
输出: {"message":"正在查看您的电脑配置...","response_type":"execute","execute_command":"system_profiler SPHardwareDataType","tasks":[]}

输入: 帮我在桌面创建一个文件夹叫test
输出: {"message":"正在在桌面创建 test 文件夹...","response_type":"execute","execute_command":"mkdir -p ~/Desktop/test","tasks":[]}

输入: 你好
输出: {"message":"你好！👋 我是任务精灵AI助手。\n\n我可以帮你：\n• 🤖 创建自动化任务（如：每天9点打开微信）\n• 🔧 执行本地操作（如：查看系统配置、创建文件夹）\n• 💬 回答各种问题\n\n有什么我能帮到你的吗？","response_type":"info","tasks":[]}

输入: 每天9点打开微信
输出: {"message":"已创建每天打开微信的任务","response_type":"task_created","tasks":[{"task_name":"每天打开微信","task_type":"application","path":"/Applications/WeChat.app","schedule_type":"daily","schedule_time":"09:00","schedule_days":[],"enabled":true,"confidence":0.95}]}

严格输出JSON格式，不要输出任何JSON以外的内容。"#;

    let body = serde_json::json!({
        "model": "deepseek-chat",
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": input }
        ],
        "temperature": 0.3,
        "max_tokens": 1024
    });

    let body_str = body.to_string();

    let result = tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        let output = {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            Command::new("curl")
                .args(["-s", "-X", "POST",
                    "https://api.deepseek.com/chat/completions",
                    "-H", "Content-Type: application/json",
                    &format!("-H"), &format!("Authorization: Bearer {}", api_key),
                    "-d", &body_str,
                    "--connect-timeout", "15",
                    "--max-time", "30",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
        };
        #[cfg(not(target_os = "windows"))]
        let output = Command::new("curl")
            .args(["-s", "-X", "POST",
                "https://api.deepseek.com/chat/completions",
                "-H", "Content-Type: application/json",
                "-H", &format!("Authorization: Bearer {}", api_key),
                "-d", &body_str,
                "--connect-timeout", "15",
                "--max-time", "30",
            ])
            .output();

        let output = output.map_err(|e| format!("API 调用失败: {}", e))?;
        if output.status.success() {
            let resp = String::from_utf8_lossy(&output.stdout).to_string();
            // 从 DeepSeek 响应中提取 content
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&resp) {
                if let Some(content) = json["choices"][0]["message"]["content"].as_str() {
                    return Ok(content.to_string());
                }
            }
            Ok(resp)
        } else {
            Err(format!("API 请求失败: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }).await.map_err(|e| format!("任务失败: {}", e))?;
    result
}

/// Phase 2: 链式任务执行引擎
#[tauri::command]
async fn execute_task_chain(steps: Vec<serde_json::Value>) -> Result<String, String> {
    let total = steps.len();
    let mut results: Vec<String> = Vec::new();

    for (i, step) in steps.iter().enumerate() {
        let step_type = step["type"].as_str().unwrap_or("");
        let step_num = i + 1;

        match step_type {
            "open_app" => {
                let app_path = step["app_path"].as_str().unwrap_or("").to_string();
                if app_path.is_empty() {
                    results.push(format!("[{}/{}] open_app: 路径为空，跳过", step_num, total));
                    continue;
                }
                // 检查路径是否存在
                let path = std::path::Path::new(&app_path);
                if !path.exists() {
                    results.push(format!("[{}/{}] open_app: 路径不存在 {}，跳过", step_num, total, app_path));
                    continue;
                }
                match launch_app(app_path.clone()) {
                    Ok(msg) => results.push(format!("[{}/{}] open_app: {}", step_num, total, msg)),
                    Err(e) => results.push(format!("[{}/{}] open_app 失败: {}", step_num, total, e)),
                }
                // 等待应用启动
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            }
            "wait" => {
                let secs = step["wait_seconds"].as_u64().unwrap_or(0);
                let mins = step["wait_minutes"].as_u64().unwrap_or(0);
                let total_secs = secs + mins * 60;
                if total_secs > 0 {
                    results.push(format!("[{}/{}] wait: 等待 {}秒...", step_num, total, total_secs));
                    tokio::time::sleep(std::time::Duration::from_secs(total_secs)).await;
                    results.push(format!("[{}/{}] wait: 等待完成", step_num, total));
                }
            }
            "playback_recording" => {
                let rec_name = step["recording_name"].as_str().unwrap_or("");
                if rec_name.is_empty() {
                    results.push(format!("[{}/{}] playback_recording: 名称为空，跳过", step_num, total));
                    continue;
                }
                match recorder::list_recordings() {
                    Ok(recordings) => {
                        let found = recordings.iter().find(|r| {
                            r.name == rec_name
                                || r.name.contains(rec_name)
                                || rec_name.contains(&r.name)
                                || r.id == rec_name
                        });
                        if let Some(rec) = found {
                            results.push(format!("[{}/{}] playback_recording: 开始回放 '{}'", step_num, total, rec.name));
                            let steps_clone = rec.steps.clone();
                            let duration_ms = rec.duration_ms;
                            let handle = tokio::task::spawn_blocking(move || {
                                recorder::play_recording(steps_clone)
                            });
                            let wait_ms = duration_ms + 2000;
                            tokio::time::sleep(std::time::Duration::from_millis(wait_ms)).await;
                            match handle.await {
                                Ok(Ok(())) => results.push(format!("[{}/{}] playback_recording: '{}' 回放完成", step_num, total, rec.name)),
                                Ok(Err(e)) => results.push(format!("[{}/{}] playback_recording 失败: {}", step_num, total, e)),
                                Err(e) => results.push(format!("[{}/{}] playback_recording 线程错误: {}", step_num, total, e)),
                            }
                        } else {
                            results.push(format!("[{}/{}] playback_recording: 未找到录制 '{}'，跳过", step_num, total, rec_name));
                        }
                    }
                    Err(e) => {
                        results.push(format!("[{}/{}] playback_recording: 读取录制列表失败: {}", step_num, total, e));
                    }
                }
            }
            "execute_script" => {
                let script_content = step["script_content"].as_str().unwrap_or("");
                let script_type = step["script_type"].as_str().unwrap_or("bash");
                if script_content.is_empty() {
                    results.push(format!("[{}/{}] execute_script: 脚本内容为空，跳过", step_num, total));
                    continue;
                }
                results.push(format!("[{}/{}] execute_script: 执行 {} 脚本...", step_num, total, script_type));
                match run_script_internal(script_content, script_type).await {
                    Ok(output) => results.push(format!("[{}/{}] execute_script: 完成\n{}", step_num, total, output)),
                    Err(e) => results.push(format!("[{}/{}] execute_script 失败: {}", step_num, total, e)),
                }
            }
            "browser_action" => {
                let tool = step["tool"].as_str().unwrap_or("browser_navigate");
                let url = step["url"].as_str().unwrap_or("");
                let text = step["text"].as_str().unwrap_or("");
                let selector = step["selector"].as_str().unwrap_or("");
                
                match tool {
                    "browser_navigate" => {
                        if url.is_empty() {
                            results.push(format!("[{}/{}] browser_navigate: URL 为空，跳过", step_num, total));
                            continue;
                        }
                        results.push(format!("[{}/{}] browser_navigate: 打开 {}", step_num, total, url));
                        let open_result = if cfg!(target_os = "windows") {
                            Command::new("cmd").args(["/C", "start", url]).output()
                        } else {
                            Command::new("open").arg(url).output()
                        };
                        match open_result {
                            Ok(_) => results.push(format!("[{}/{}] browser_navigate: 已打开", step_num, total)),
                            Err(e) => results.push(format!("[{}/{}] browser_navigate 失败: {}", step_num, total, e)),
                        }
                        // 等待页面加载
                        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    }
                    "browser_type" => {
                        results.push(format!("[{}/{}] browser_type: 输入 '{}'", step_num, total, text));
                        #[cfg(target_os = "macos")]
                        {
                            let script = format!("tell application \"System Events\" to keystroke \"{}\"", text.replace('"', "\\\""));
                            let _ = Command::new("osascript").args(["-e", &script]).output();
                        }
                        #[cfg(target_os = "windows")]
                        {
                            let script = format!("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{}')", text);
                            let _ = Command::new("powershell").args(["-NoProfile", "-Command", &script]).output();
                        }
                    }
                    "browser_click" => {
                        let x = step["x"].as_f64().unwrap_or(0.0);
                        let y = step["y"].as_f64().unwrap_or(0.0);
                        results.push(format!("[{}/{}] browser_click: 点击 ({}, {})", step_num, total, x, y));
                        #[cfg(target_os = "macos")]
                        {
                            let script = format!(
                                "tell application \"System Events\" to click at {{{}, {}}}",
                                x as i32, y as i32
                            );
                            let _ = Command::new("osascript").args(["-e", &script]).output();
                        }
                    }
                    _ => {
                        results.push(format!("[{}/{}] browser_action: 未知工具 '{}'，支持 selector '{}'", step_num, total, tool, selector));
                    }
                }
            }
            _ => {
                results.push(format!("[{}/{}] 未知步骤类型: {}，跳过", step_num, total, step_type));
            }
        }
    }

    Ok(results.join("\n"))
}

// ======== 图片理解 + 视觉API ========

use base64::Engine as _;

#[tauri::command]
async fn image_analyze(image_path: String, prompt: Option<String>) -> Result<String, String> {
    let path = std::path::Path::new(&image_path);
    if !path.exists() {
        return Err(format!("图片不存在: {}", image_path));
    }
    
    // 读取图片并转为 base64
    let image_data = fs::read(path).map_err(|e| format!("读取图片失败: {}", e))?;
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&image_data);
    
    // 判断 MIME 类型
    let ext = path.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    };
    
    let user_prompt = prompt.unwrap_or_else(|| "请描述这张图片的内容，用中文回答。".to_string());
    
    // 调用 DeepSeek Vision API
    let api_key = "sk-3d0295d2c9084d8ba7681135c586c505";
    let body = serde_json::json!({
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:{};base64,{}", mime, base64_data)
                        }
                    },
                    {
                        "type": "text",
                        "text": user_prompt
                    }
                ]
            }
        ],
        "max_tokens": 1024
    });
    
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.deepseek.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(60))
        .json(&body)
        .send()
        .await;
    
    match resp {
        Ok(r) if r.status().is_success() => {
            let data: serde_json::Value = r.json().await
                .map_err(|e| format!("解析响应失败: {}", e))?;
            let content = data["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("(无返回内容)")
                .to_string();
            Ok(content)
        }
        Ok(r) => {
            // API 不支持视觉或其他错误，返回文件信息作为 fallback
            let status = r.status();
            let _text = r.text().await.unwrap_or_default();
            let file_size = image_data.len();
            Ok(format!("📷 图片信息\n路径: {}\n格式: {}\n大小: {} KB\n\n⚠️ 视觉API暂不可用 ({}), 可切换到支持视觉的模型", 
                image_path, ext, file_size / 1024, status))
        }
        Err(e) => {
            let file_size = image_data.len();
            Ok(format!("📷 图片信息\n路径: {}\n格式: {}\n大小: {} KB\n\n⚠️ 网络错误: {}", 
                image_path, ext, file_size / 1024, e))
        }
    }
}

#[tauri::command]
async fn image_generate_caption(image_path: String) -> Result<String, String> {
    image_analyze(
        image_path,
        Some("根据这张图片内容，帮我生成一条适合发朋友圈的文案。要求：简短有品味，可以加上合适的emoji。".to_string())
    ).await
}

// ======== 浏览器自动化 commands ========

#[tauri::command]
async fn browser_navigate(url: String) -> Result<String, String> {
    if url.is_empty() {
        return Err("URL 为空".to_string());
    }
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", "start", &url]).output()
    } else {
        Command::new("open").arg(&url).output()
    };
    match result {
        Ok(_) => Ok(format!("已打开: {}", url)),
        Err(e) => Err(format!("打开失败: {}", e)),
    }
}

#[tauri::command]
async fn browser_run_js(_script: String) -> Result<String, String> {
    // 通过 AppleScript / PowerShell 在浏览器中执行 JS
    #[cfg(target_os = "macos")]
    {
        let apple_script = format!(
            "tell application \"Google Chrome\" to execute front window's active tab javascript \"{}\"",
            _script.replace('"', "\\\"")
        );
        let output = Command::new("osascript")
            .args(["-e", &apple_script])
            .output()
            .map_err(|e| format!("osascript 失败: {}", e))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        return Ok(stdout);
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("当前平台暂不支持浏览器 JS 执行".to_string())
    }
}

// ======== 脚本执行引擎 ========

/// 内部脚本执行函数
async fn run_script_internal(script_content: &str, script_type: &str) -> Result<String, String> {
    let output = match script_type {
        "bash" | "sh" | "shell" => {
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", script_content])
                    .output()
                    .map_err(|e| format!("cmd 执行失败: {}", e))?
            }
            #[cfg(not(target_os = "windows"))]
            {
                Command::new("bash")
                    .args(["-c", script_content])
                    .output()
                    .map_err(|e| format!("bash 执行失败: {}", e))?
            }
        }
        "powershell" | "ps1" => {
            Command::new(if cfg!(target_os = "windows") { "powershell" } else { "pwsh" })
                .args(["-NoProfile", "-Command", script_content])
                .output()
                .map_err(|e| format!("powershell 执行失败: {}", e))?
        }
        "applescript" | "osascript" => {
            #[cfg(target_os = "macos")]
            {
                Command::new("osascript")
                    .args(["-e", script_content])
                    .output()
                    .map_err(|e| format!("osascript 执行失败: {}", e))?
            }
            #[cfg(not(target_os = "macos"))]
            {
                return Err("当前系统不支持 AppleScript".to_string());
            }
        }
        "python" | "python3" => {
            Command::new(if cfg!(target_os = "windows") { "python" } else { "python3" })
                .args(["-c", script_content])
                .output()
                .map_err(|e| format!("python 执行失败: {}", e))?
        }
        _ => return Err(format!("不支持的脚本类型: {}", script_type)),
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(if stdout.is_empty() { "(执行成功，无输出)".to_string() } else { stdout })
    } else {
        Err(format!("exit code: {:?}\nstderr: {}", output.status.code(), stderr))
    }
}

#[tauri::command]
async fn execute_script(script_content: String, script_type: String) -> Result<String, String> {
    run_script_internal(&script_content, &script_type).await
}

#[tauri::command]
fn script_auth_check(script_content: String) -> String {
    openclaw::get_auth_level(&script_content).to_string()
}

// ======== 文件系统感知 commands ========

#[derive(Serialize, Clone)]
struct FsEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    extension: String,
}

#[tauri::command]
fn fs_list_dir(dir_path: String) -> Result<Vec<FsEntry>, String> {
    let path = std::path::Path::new(&dir_path);
    if !path.exists() {
        return Err(format!("路径不存在: {}", dir_path));
    }
    if !path.is_dir() {
        return Err(format!("不是目录: {}", dir_path));
    }

    let mut entries = Vec::new();
    let read = fs::read_dir(path).map_err(|e| format!("读取目录失败: {}", e))?;
    for entry in read.flatten() {
        let meta = entry.metadata().unwrap_or_else(|_| fs::metadata(entry.path()).unwrap());
        let name = entry.file_name().to_string_lossy().to_string();
        // 跳过隐藏文件
        if name.starts_with('.') { continue; }
        entries.push(FsEntry {
            name: name.clone(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
            extension: entry.path().extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default(),
        });
    }
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(entries)
}

#[tauri::command]
fn fs_read_text(file_path: String, max_bytes: Option<usize>) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    let meta = fs::metadata(path).map_err(|e| format!("获取文件信息失败: {}", e))?;
    let limit = max_bytes.unwrap_or(1_048_576); // 默认 1MB
    if meta.len() as usize > limit {
        return Err(format!("文件过大: {} bytes (限制 {} bytes)", meta.len(), limit));
    }
    fs::read_to_string(path).map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn fs_get_desktop_path() -> String {
    #[cfg(target_os = "windows")]
    let home = std::env::var("USERPROFILE").unwrap_or_default();
    #[cfg(not(target_os = "windows"))]
    let home = std::env::var("HOME").unwrap_or_default();
    
    let desktop = PathBuf::from(&home).join("Desktop");
    desktop.to_string_lossy().to_string()
}

// ======== OpenClaw 集成 commands ========

#[tauri::command]
async fn openclaw_status() -> Result<openclaw::OpenClawStatus, String> {
    Ok(openclaw::get_status().await)
}

#[tauri::command]
async fn openclaw_execute(prompt: String) -> Result<openclaw::OpenClawTaskResult, String> {
    // 先检查授权级别
    let auth_level = openclaw::get_auth_level(&prompt);
    if auth_level != "none" {
        // 返回需要授权的结果，让前端弹窗确认
        return Ok(openclaw::OpenClawTaskResult {
            success: false,
            output: format!("此操作需要用户授权 (级别: {})", auth_level),
            requires_auth: true,
            auth_level: auth_level.to_string(),
            tool_used: String::new(),
        });
    }
    // 读取 gateway token
    let token = openclaw::read_gateway_token().unwrap_or_default();
    openclaw::execute_task(&prompt, &token).await
}

#[tauri::command]
async fn openclaw_execute_confirmed(prompt: String) -> Result<openclaw::OpenClawTaskResult, String> {
    // 用户已确认，直接执行
    let token = openclaw::read_gateway_token().unwrap_or_default();
    openclaw::execute_task(&prompt, &token).await
}

#[tauri::command]
fn openclaw_auth_check(command: String) -> String {
    openclaw::get_auth_level(&command).to_string()
}

// ======== 录制引擎 Tauri commands ========

#[tauri::command]
fn recording_start() -> Result<String, String> {
    recorder::start_recording()?;
    Ok("recording".into())
}

#[tauri::command]
fn recording_stop() -> Result<Vec<recorder::RecordedStep>, String> {
    recorder::stop_recording()
}

#[tauri::command]
fn recording_pause() -> Result<String, String> {
    recorder::toggle_pause()
}

#[tauri::command]
fn recording_status() -> recorder::RecordingStatus {
    recorder::get_status()
}

#[tauri::command]
fn recording_play(steps: Vec<recorder::RecordedStep>) -> Result<(), String> {
    recorder::play_recording(steps)
}

#[tauri::command]
fn recording_save(name: String, steps: Vec<recorder::RecordedStep>, duration_ms: u64, mode: Option<String>) -> Result<String, String> {
    let rec_mode = match mode.as_deref() {
        Some("mouse_only") => recorder::RecordingMode::MouseOnly,
        Some("keyboard_only") => recorder::RecordingMode::KeyboardOnly,
        Some("smart") => recorder::RecordingMode::Smart,
        Some("screenshot") => recorder::RecordingMode::Screenshot,
        Some("element") => recorder::RecordingMode::Element,
        _ => recorder::RecordingMode::Full,
    };
    let nodes = recorder::steps_to_nodes(&steps);
    let recording = recorder::Recording {
        id: format!("{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()),
        name,
        created_at: {
            let now = std::time::SystemTime::now();
            let since = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
            format!("{}", since.as_secs())
        },
        duration_ms,
        step_count: steps.len(),
        steps,
        mode: rec_mode,
        nodes,
    };
    recorder::save_recording_to_file(&recording)
}

#[tauri::command]
fn recording_list() -> Result<Vec<recorder::Recording>, String> {
    recorder::list_recordings()
}

#[tauri::command]
fn recording_delete(id: String) -> Result<(), String> {
    recorder::delete_recording(&id)
}

// ======== 节点编辑 commands ========

#[tauri::command]
fn recording_update_nodes(id: String, nodes: Vec<recorder::RecordingNode>) -> Result<(), String> {
    let mut recordings = recorder::list_recordings()?;
    if let Some(rec) = recordings.iter_mut().find(|r| r.id == id) {
        rec.nodes = nodes;
        recorder::save_recording_to_file(rec)?;
    }
    Ok(())
}

#[tauri::command]
fn recording_add_node(id: String, after_node_id: String, node_type: String, label: String, delay_ms: Option<u64>) -> Result<Vec<recorder::RecordingNode>, String> {
    let mut recordings = recorder::list_recordings()?;
    let rec = recordings.iter_mut().find(|r| r.id == id).ok_or("录制不存在")?;

    let new_id = format!("node_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());

    let new_node = match node_type.as_str() {
        "condition" => recorder::create_condition_node(&new_id, &label, recorder::ConditionRule {
            rule_type: recorder::ConditionType::WindowExists,
            target: String::new(),
            value: String::new(),
            timeout_ms: 5000,
            true_branch: vec![],
            false_branch: vec![],
        }),
        "wait" => recorder::create_wait_node(&new_id, delay_ms.unwrap_or(1000)),
        "loop" => recorder::create_loop_node(&new_id, &label, 3),
        "open_app" => recorder::create_open_app_node(&new_id, &label),
        _ => recorder::RecordingNode {
            id: new_id.clone(),
            node_type: recorder::NodeType::Action,
            label,
            enabled: true,
            children: vec![],
            condition: None,
            action: Some(recorder::NodeAction { steps: vec![] }),
            delay_ms: delay_ms.unwrap_or(0),
            note: String::new(),
        },
    };

    recorder::insert_node_after(&mut rec.nodes, &after_node_id, new_node);
    recorder::save_recording_to_file(rec)?;
    Ok(rec.nodes.clone())
}

#[tauri::command]
fn recording_delete_node(id: String, node_id: String) -> Result<Vec<recorder::RecordingNode>, String> {
    let mut recordings = recorder::list_recordings()?;
    let rec = recordings.iter_mut().find(|r| r.id == id).ok_or("录制不存在")?;
    recorder::delete_node(&mut rec.nodes, &node_id);
    recorder::save_recording_to_file(rec)?;
    Ok(rec.nodes.clone())
}

#[tauri::command]
fn recording_move_node(id: String, from_idx: usize, to_idx: usize) -> Result<Vec<recorder::RecordingNode>, String> {
    let mut recordings = recorder::list_recordings()?;
    let rec = recordings.iter_mut().find(|r| r.id == id).ok_or("录制不存在")?;
    recorder::move_node(&mut rec.nodes, from_idx, to_idx);
    recorder::save_recording_to_file(rec)?;
    Ok(rec.nodes.clone())
}

// ======== 本地推理引擎 Tauri commands ========

#[tauri::command]
async fn engine_status() -> local_model::EngineStatus {
    local_model::get_engine_status().await
}

#[tauri::command]
fn set_models_dir(dir: String) -> Result<(), String> {
    local_model::set_models_dir(&dir)
}

#[tauri::command]
fn get_models_dir() -> String {
    local_model::models_dir()
}

#[tauri::command]
async fn model_list() -> Result<Vec<local_model::LocalModel>, String> {
    local_model::get_model_list().await
}

#[tauri::command]
async fn model_pull(app: tauri::AppHandle, model_id: String) -> Result<String, String> {
    local_model::download_model(&app, &model_id).await
}

#[tauri::command]
fn model_delete(model_id: String) -> Result<(), String> {
    local_model::delete_model(&model_id)
}

#[tauri::command]
fn get_mirror_sources() -> Vec<local_model::MirrorSource> {
    local_model::get_mirror_sources()
}

#[tauri::command]
fn get_current_mirror() -> String {
    let config_path = {
        #[cfg(target_os = "macos")]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
            format!("{}/Library/Application Support/com.a.startup-manager/mirror_source.conf", home)
        }
        #[cfg(target_os = "windows")]
        {
            let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".into());
            format!("{}\\startup-manager\\mirror_source.conf", appdata)
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
            format!("{}/.config/startup-manager/mirror_source.conf", home)
        }
    };
    std::fs::read_to_string(&config_path).unwrap_or_else(|_| "hf-mirror".into()).trim().to_string()
}

#[tauri::command]
fn set_mirror(mirror_id: String) -> Result<(), String> {
    local_model::set_mirror_source(&mirror_id)
}

#[tauri::command]
fn set_custom_mirror_cmd(name: String, url: String) -> Result<(), String> {
    local_model::set_custom_mirror(&name, &url)
}

#[tauri::command]
fn get_downloading_models() -> Vec<String> {
    local_model::get_downloading_models()
}

#[tauri::command]
async fn engine_start(model_id: String) -> Result<(), String> {
    local_model::start_engine(&model_id).await
}

#[tauri::command]
fn engine_stop() {
    local_model::stop_engine()
}

#[tauri::command]
async fn download_engine(app: tauri::AppHandle) -> Result<String, String> {
    local_model::download_engine(&app).await
}

#[tauri::command]
async fn local_model_infer(input: String) -> Result<String, String> {
    local_model::local_infer(&input).await
}

// ======== 辅助功能 Tauri commands ========

#[tauri::command]
fn ax_get_window() -> Result<accessibility::WindowInfo, String> {
    accessibility::get_focused_window()
}

#[tauri::command]
fn ax_check_permission() -> bool {
    accessibility::check_accessibility_permission()
}

// ======== 任务市场 Tauri commands ========

#[tauri::command]
fn marketplace_browse(category: Option<String>, search: Option<String>) -> Result<Vec<marketplace::MarketplaceItem>, String> {
    marketplace::browse_marketplace(category, search)
}

#[tauri::command]
fn marketplace_publish(
    recording_id: String,
    description: String,
    author: String,
    category: String,
    tags: Vec<String>,
) -> Result<String, String> {
    // 先加载录制
    let recordings = recorder::list_recordings()?;
    let recording = recordings.into_iter().find(|r| r.id == recording_id)
        .ok_or("录制不存在".to_string())?;
    marketplace::publish_to_marketplace(recording, description, author, category, tags)
}

#[tauri::command]
fn marketplace_download(item_id: String) -> Result<marketplace::MarketplaceItem, String> {
    marketplace::download_from_marketplace(&item_id)
}

#[tauri::command]
fn marketplace_categories() -> Vec<String> {
    marketplace::get_categories()
}

#[tauri::command]
fn marketplace_delete(item_id: String) -> Result<(), String> {
    marketplace::remove_from_marketplace(&item_id)
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
                    let is_garbled = name.contains('\u{FFFD}') || name.len() < 2
                        || name.chars().any(|c| c.is_control()
                            || ('\u{E000}'..='\u{F8FF}').contains(&c)
                            || ('\u{FE00}'..='\u{FE0F}').contains(&c)
                        );
                    if !is_garbled {
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

    // 加载自定义模型存储路径
    local_model::load_models_dir_config();

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
        .plugin(tauri_plugin_fs::init())
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
            install_update,
            ai_parse_intent,
            ai_cloud_parse,
            recording_start,
            recording_stop,
            recording_pause,
            recording_status,
            recording_play,
            recording_save,
            recording_list,
            recording_delete,
            recording_update_nodes,
            recording_add_node,
            recording_delete_node,
            recording_move_node,
            engine_status,
            set_models_dir,
            get_models_dir,
            model_list,
            model_pull,
            model_delete,
            get_mirror_sources,
            get_current_mirror,
            set_mirror,
            set_custom_mirror_cmd,
            get_downloading_models,
            engine_start,
            engine_stop,
            download_engine,
            local_model_infer,
            ax_get_window,
            ax_check_permission,
            marketplace_browse,
            marketplace_publish,
            marketplace_download,
            marketplace_categories,
            marketplace_delete,
            execute_task_chain,
            openclaw_status,
            openclaw_execute,
            openclaw_execute_confirmed,
            openclaw_auth_check,
            execute_script,
            script_auth_check,
            fs_list_dir,
            fs_read_text,
            fs_get_desktop_path,
            browser_navigate,
            browser_run_js,
            image_analyze,
            image_generate_caption,
            start_device_heartbeat
        ]);

/// 设备心跳上报 — 前端登录后调用，每30秒上报系统信息到服务器
#[tauri::command]
async fn start_device_heartbeat(token: String) -> Result<String, String> {
    tokio::spawn(async move {
        device_heartbeat_loop(&token).await;
    });
    Ok("heartbeat started".to_string())
}

async fn device_heartbeat_loop(token: &str) {
    use sysinfo::{System, Disks};

    let client = reqwest::Client::new();
    let server_url = "https://bt.aacc.fun:8888/api/devices/heartbeat";

    loop {
        // 采集系统信息
        let mut sys = System::new();
        sys.refresh_cpu_usage();
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        sys.refresh_cpu_usage();
        sys.refresh_memory();

        let cpu: f64 = sys.cpus().iter().map(|c| c.cpu_usage() as f64).sum::<f64>()
            / sys.cpus().len().max(1) as f64;
        let cpu = (cpu * 10.0).round() / 10.0;

        let total_mem = sys.total_memory() as f64;
        let used_mem = sys.used_memory() as f64;
        let memory_pct = if total_mem > 0.0 { (used_mem / total_mem * 100.0 * 10.0).round() / 10.0 } else { 0.0 };
        let memory_used_gb = (used_mem / 1_073_741_824.0 * 10.0).round() / 10.0;
        let memory_total_gb = (total_mem / 1_073_741_824.0 * 10.0).round() / 10.0;

        let disks = Disks::new_with_refreshed_list();
        let mut total_disk: u64 = 0;
        let mut avail_disk: u64 = 0;
        for disk in disks.list() {
            total_disk += disk.total_space();
            avail_disk += disk.available_space();
        }
        let used_disk = total_disk.saturating_sub(avail_disk);
        let disk_pct = if total_disk > 0 { (used_disk as f64 / total_disk as f64 * 100.0).round() } else { 0.0 };
        let disk_used_gb = (used_disk as f64 / 1_073_741_824.0).round();
        let disk_total_gb = (total_disk as f64 / 1_073_741_824.0).round();

        let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
        let os_name = System::name().unwrap_or_default();
        let os_ver = System::os_version().unwrap_or_default();
        let os_version = format!("{} {}", os_name, os_ver).trim().to_string();

        let platform = if cfg!(target_os = "macos") { "macos" }
            else if cfg!(target_os = "windows") { "windows" }
            else { "linux" };

        let body = serde_json::json!({
            "device_id": hostname,
            "name": hostname,
            "platform": platform,
            "hostname": hostname,
            "os_version": os_version,
            "cpu": cpu,
            "cpu_temp": 0,
            "memory": memory_pct,
            "memory_used": memory_used_gb,
            "memory_total": memory_total_gb,
            "disk": disk_pct,
            "disk_used": disk_used_gb,
            "disk_total": disk_total_gb,
            "tasks_running": 0
        });

        let result = client.post(server_url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await;

        match result {
            Ok(resp) => {
                if !resp.status().is_success() {
                    eprintln!("[heartbeat] 上报失败: {}", resp.status());
                }
            }
            Err(e) => {
                eprintln!("[heartbeat] 网络错误: {}", e);
            }
        }

        // 每30秒上报一次
        tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
    }
}

    // Windows 系统托盘 + 窗口关闭拦截
    #[cfg(target_os = "windows")]
    let builder = {
        use tauri::{
            menu::{Menu, MenuItem},
            tray::TrayIconBuilder,
        };
        builder.setup(|app| {
            // 启动 WebSocket Server (手机端通信)
            tokio::spawn(async {
                ws_server::start_ws_server().await;
            });

            // 启动设备心跳上报（每30秒 POST 到服务器）
            // 设备心跳: 由前端登录后通过 start_device_heartbeat 命令启动（需要 token）
            let _app_handle = app.handle().clone();

            // 启动 OpenClaw Gateway (后台静默)
            std::thread::spawn(|| {
                let mut cmd = Command::new("openclaw");
                cmd.args(["daemon", "start"])
                   .stdout(std::process::Stdio::null())
                   .stderr(std::process::Stdio::null());
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                }
                let _ = cmd.spawn();
            });

            let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;
            
            let _tray = TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/tray-icon.png"))
                .menu(&menu)
                .tooltip("任务精灵")
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
// force rebuild
