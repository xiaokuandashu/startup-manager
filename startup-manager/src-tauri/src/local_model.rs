use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::{Arc, Mutex};

/// llama-server 配置
const LLAMA_PORT: u16 = 8089;
const LLAMA_HOST: &str = "127.0.0.1";

/// 本地模型信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalModel {
    pub id: String,
    pub name: String,
    pub size: String,
    pub description: String,
    pub installed: bool,
    pub downloading: bool,
    pub download_url: String,
    pub filename: String,
}

/// 引擎状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineStatus {
    pub engine_installed: bool,
    pub engine_running: bool,
    pub active_model: String,
    pub models: Vec<LocalModel>,
    pub models_dir: String,
}

/// 推理响应 — 兼容多种 llama-server 版本
#[derive(Debug, Deserialize)]
struct LlamaResponse {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LlamaChoiceResponse {
    choices: Vec<LlamaChoice>,
}

#[derive(Debug, Deserialize)]
struct LlamaChoice {
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    message: Option<LlamaMessage>,
}

#[derive(Debug, Deserialize)]
struct LlamaMessage {
    content: String,
}

/// 进程管理（全局）
lazy_static::lazy_static! {
    static ref LLAMA_PID: Arc<Mutex<Option<u32>>> = Arc::new(Mutex::new(None));
    static ref ACTIVE_MODEL: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref CUSTOM_MODELS_DIR: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
}

/// 默认模型存储目录
fn default_models_dir() -> String {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        format!("{}/Library/Application Support/com.a.startup-manager/models", home)
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".into());
        format!("{}\\startup-manager\\models", appdata)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        format!("{}/.config/startup-manager/models", home)
    }
}

/// 获取当前模型存储目录（支持自定义路径）
pub fn models_dir() -> String {
    if let Ok(guard) = CUSTOM_MODELS_DIR.lock() {
        if let Some(ref dir) = *guard {
            return dir.clone();
        }
    }
    default_models_dir()
}

/// 设置自定义模型存储路径
pub fn set_models_dir(dir: &str) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| format!("创建目录失败: {}", e))?;
    if let Ok(mut guard) = CUSTOM_MODELS_DIR.lock() {
        *guard = Some(dir.to_string());
    }
    // 持久化到配置文件
    let config_path = models_config_path();
    let _ = std::fs::write(&config_path, dir);
    Ok(())
}

/// 获取模型目录配置文件路径
fn models_config_path() -> String {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        format!("{}/Library/Application Support/com.a.startup-manager/models_dir.conf", home)
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".into());
        format!("{}\\startup-manager\\models_dir.conf", appdata)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        format!("{}/.config/startup-manager/models_dir.conf", home)
    }
}

/// 启动时加载自定义路径
pub fn load_models_dir_config() {
    let config_path = models_config_path();
    if let Ok(dir) = std::fs::read_to_string(&config_path) {
        let dir = dir.trim().to_string();
        if !dir.is_empty() && std::path::Path::new(&dir).exists() {
            if let Ok(mut guard) = CUSTOM_MODELS_DIR.lock() {
                *guard = Some(dir);
            }
        }
    }
}

/// 可下载的模型列表
fn available_models() -> Vec<LocalModel> {
    let mdir = models_dir();
    vec![
        LocalModel {
            id: "rule_engine".into(),
            name: "📐 本地规则引擎".into(),
            size: "内置".into(),
            description: "关键词匹配，离线可用，速度最快".into(),
            installed: true,
            downloading: false,
            download_url: String::new(),
            filename: String::new(),
        },
        LocalModel {
            id: "deepseek_cloud".into(),
            name: "☁️ DeepSeek 云端".into(),
            size: "在线".into(),
            description: "理解复杂指令，需要网络".into(),
            installed: true,
            downloading: false,
            download_url: String::new(),
            filename: String::new(),
        },
        LocalModel {
            id: "qwen2.5-1.5b".into(),
            name: "🧠 Qwen2.5-1.5B".into(),
            size: "934MB".into(),
            description: "通义千问，中文最佳，推荐首选".into(),
            installed: std::path::Path::new(&format!("{}/qwen2.5-1.5b-instruct-q4_k_m.gguf", mdir)).exists(),
            downloading: false,
            download_url: "https://hf-mirror.com/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf".into(),
            filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf".into(),
        },
        LocalModel {
            id: "phi3-mini".into(),
            name: "🧠 Phi-3 Mini".into(),
            size: "2.2GB".into(),
            description: "微软小模型，推理能力强".into(),
            installed: std::path::Path::new(&format!("{}/phi-3-mini-4k-instruct-q4.gguf", mdir)).exists(),
            downloading: false,
            download_url: "https://hf-mirror.com/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf".into(),
            filename: "phi-3-mini-4k-instruct-q4.gguf".into(),
        },
        LocalModel {
            id: "gemma2-2b".into(),
            name: "🧠 Gemma 2 2B".into(),
            size: "1.5GB".into(),
            description: "Google 轻量级模型".into(),
            installed: std::path::Path::new(&format!("{}/gemma-2-2b-it-Q4_K_M.gguf", mdir)).exists(),
            downloading: false,
            download_url: "https://hf-mirror.com/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf".into(),
            filename: "gemma-2-2b-it-Q4_K_M.gguf".into(),
        },
    ]
}

/// 引擎已内置，始终可用
pub fn is_engine_installed() -> bool {
    true
}

/// 检测 llama-server 是否正在运行
pub async fn is_engine_running() -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build();
    match client {
        Ok(c) => {
            match c.get(format!("http://{}:{}/health", LLAMA_HOST, LLAMA_PORT)).send().await {
                Ok(r) => r.status().is_success(),
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

/// 获取完整引擎状态
pub async fn get_engine_status() -> EngineStatus {
    let active = ACTIVE_MODEL.lock().map(|m| m.clone()).unwrap_or_default();
    EngineStatus {
        engine_installed: true,  // 内置引擎
        engine_running: is_engine_running().await,
        active_model: active,
        models: available_models(),
        models_dir: models_dir(),
    }
}

/// 获取模型列表
pub async fn get_model_list() -> Result<Vec<LocalModel>, String> {
    Ok(available_models())
}

/// 获取内置 llama-server 二进制路径
/// Tauri externalBin 会将 binaries/llama-server-{target-triple} 打包到：
/// macOS: App.app/Contents/MacOS/binaries/llama-server
/// Windows: 安装目录/binaries/llama-server.exe
fn resolve_sidecar_path() -> Result<String, String> {
    // 方式1: 尝试从当前 exe 目录解析
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            #[cfg(target_os = "windows")]
            let sidecar = exe_dir.join("llama-server.exe");
            #[cfg(not(target_os = "windows"))]
            let sidecar = exe_dir.join("llama-server");

            if sidecar.exists() {
                return Ok(sidecar.to_string_lossy().to_string());
            }

            // macOS: 也检查同级 binaries/ 目录 (开发模式)
            #[cfg(target_os = "macos")]
            {
                let sidecar_in_binaries = exe_dir.join("binaries/llama-server-aarch64-apple-darwin");
                if sidecar_in_binaries.exists() {
                    return Ok(sidecar_in_binaries.to_string_lossy().to_string());
                }
            }
        }
    }

    // 方式2: 尝试 cargo 开发模式路径
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    #[cfg(target_os = "macos")]
    {
        let dev_path = format!("{}/binaries/llama-server-aarch64-apple-darwin", manifest_dir);
        if std::path::Path::new(&dev_path).exists() {
            return Ok(dev_path);
        }
    }
    #[cfg(target_os = "windows")]
    {
        let dev_path = format!("{}\\binaries\\llama-server-x86_64-pc-windows-msvc.exe", manifest_dir);
        if std::path::Path::new(&dev_path).exists() {
            return Ok(dev_path);
        }
    }

    Err("无法找到内置推理引擎二进制文件".into())
}

/// 下载 GGUF 模型
pub async fn download_model(app: &tauri::AppHandle, model_id: &str) -> Result<String, String> {
    use futures_util::StreamExt;
    use std::io::Write;
    use tauri::Emitter;

    let models = available_models();
    let model = models.iter().find(|m| m.id == model_id)
        .ok_or("模型不存在")?;

    if model.download_url.is_empty() {
        return Err("该模型无需下载".into());
    }

    let dir = models_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let dest = format!("{}/{}", dir, model.filename);
    if std::path::Path::new(&dest).exists() {
        return Ok("模型已下载".into());
    }

    let client = reqwest::Client::new();
    let res = client.get(&model.download_url)
        .send().await
        .map_err(|e| format!("下载请求失败: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("下载失败: HTTP {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    
    let mut stream = res.bytes_stream();
    let mut file = std::fs::File::create(&dest).map_err(|e| format!("创建文件失败: {}", e))?;

    let mut last_percent = 0;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("读取流失败: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("写入文件失败: {}", e))?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percent = ((downloaded as f64 / total_size as f64) * 100.0) as u32;
            // 降低事件发送频率
            if percent > last_percent {
                last_percent = percent;
                let _ = app.emit("model_download_progress", serde_json::json!({
                    "model_id": model_id,
                    "progress": percent,
                    "downloaded": downloaded,
                    "total": total_size
                }));
            }
        }
    }

    Ok(format!("模型 {} 下载完成", model.name))
}

/// 删除模型文件
pub fn delete_model(model_id: &str) -> Result<(), String> {
    let models = available_models();
    let model = models.iter().find(|m| m.id == model_id)
        .ok_or("模型不存在")?;

    if model.filename.is_empty() { return Ok(()); }

    let path = format!("{}/{}", models_dir(), model.filename);
    if std::path::Path::new(&path).exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 启动内置 llama-server 加载指定模型
pub async fn start_engine(model_id: &str) -> Result<(), String> {
    stop_engine();

    let models = available_models();
    let model = models.iter().find(|m| m.id == model_id)
        .ok_or("模型不存在")?;

    let model_path = format!("{}/{}", models_dir(), model.filename);
    if !std::path::Path::new(&model_path).exists() {
        return Err(format!("模型文件不存在，请先下载: {}", model.name));
    }

    let log_file_path = format!("{}/llama-server.log", models_dir());
    let log_file = std::fs::File::create(&log_file_path).unwrap_or_else(|_| std::fs::File::create("/tmp/llama-server.log").unwrap());

    // 使用内置的 llama-server 二进制
    let bin = resolve_sidecar_path()?;

    let mut cmd = Command::new(&bin);
    cmd.args([
        "--model", &model_path,
        "--host", LLAMA_HOST,
        "--port", &LLAMA_PORT.to_string(),
        "--ctx-size", "2048",
        "--n-predict", "512",
        "--threads", "4",
    ])
    .stdout(log_file.try_clone().unwrap())
    .stderr(log_file);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("启动引擎进程失败: {}", e))?;

    let pid = child.id();
    if let Ok(mut p) = LLAMA_PID.lock() {
        *p = Some(pid);
    }
    if let Ok(mut m) = ACTIVE_MODEL.lock() {
        *m = model_id.to_string();
    }

    // 等待引擎就绪（轮询 /health 最多 30 秒）
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;

    for _ in 0..60 {
        if let Ok(Some(status)) = child.try_wait() {
            let log_content = std::fs::read_to_string(&log_file_path).unwrap_or_default();
            return Err(format!("引擎进程已异常退出 ({})。日志: {}", status, log_content));
        }

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        match client.get(format!("http://{}:{}/health", LLAMA_HOST, LLAMA_PORT)).send().await {
            Ok(r) if r.status().is_success() => {
                return Ok(());
            }
            _ => { continue; }
        }
    }

    // 30秒超时
    Err("引擎启动超时（30秒未响应）".to_string())
}

/// 停止 llama-server
pub fn stop_engine() {
    if let Ok(mut pid_guard) = LLAMA_PID.lock() {
        if let Some(pid) = pid_guard.take() {
            #[cfg(not(target_os = "windows"))]
            { let _ = Command::new("kill").arg(pid.to_string()).status(); }
            #[cfg(target_os = "windows")]
            { let _ = Command::new("taskkill").args(["/PID", &pid.to_string(), "/F"]).status(); }
        }
    }
    if let Ok(mut m) = ACTIVE_MODEL.lock() {
        m.clear();
    }
}

/// 使用内置引擎进行推理（兼容多种 llama-server 响应格式）
pub async fn local_infer(user_input: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    // 先检查引擎是否在运行，如果还在加载则等待重试
    let health = client.get(format!("http://{}:{}/health", LLAMA_HOST, LLAMA_PORT))
        .send().await;
    match health {
        Err(_) => return Err("推理引擎未运行，请先在 AI 助手页面启动引擎并加载模型".into()),
        Ok(r) if !r.status().is_success() => {
            // 引擎还在加载，等待最多 15 秒
            let mut ready = false;
            for _ in 0..30 {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                match client.get(format!("http://{}:{}/health", LLAMA_HOST, LLAMA_PORT)).send().await {
                    Ok(r2) if r2.status().is_success() => { ready = true; break; }
                    _ => { continue; }
                }
            }
            if !ready {
                return Err("推理引擎正在加载模型，已等待 15 秒仍未就绪，请稍后重试".into());
            }
        }
        _ => {}
    }

    let system_prompt = r#"你是一个桌面自动化助手。用户会用自然语言描述想做的事。
你需要理解意图，输出 JSON 格式的任务定义。

输出格式：
{
  "message": "回复说明",
  "response_type": "task_created",
  "tasks": [{
    "task_name": "任务名称",
    "task_type": "application 或 script",
    "path": "应用路径",
    "schedule_type": "startup/once/daily/weekly/monthly",
    "schedule_time": "HH:MM",
    "enabled": true,
    "confidence": 0.0-1.0,
    "recording_name": "录制动作名称（如果有）"
  }]
}

常见 macOS 应用路径：
- 微信: /Applications/WeChat.app
- Chrome: /Applications/Google Chrome.app
- 钉钉: /Applications/DingTalk.app
- VS Code: /Applications/Visual Studio Code.app

严格只输出 JSON。"#;

    let prompt = format!("<|im_start|>system\n{}<|im_end|>\n<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n", system_prompt, user_input);

    let body = serde_json::json!({
        "prompt": prompt,
        "n_predict": 512,
        "temperature": 0.1,
        "stop": ["<|im_end|>"],
        "stream": false,
    });

    let resp = client.post(format!("http://{}:{}/completion", LLAMA_HOST, LLAMA_PORT))
        .json(&body)
        .send().await
        .map_err(|e| format!("推理请求失败: {}", e))?;

    // 检查 HTTP 状态码
    let status = resp.status();
    if !status.is_success() {
        let err_body = resp.text().await.unwrap_or_default();
        return Err(format!("推理引擎返回错误 ({}): {}", status, &err_body[..err_body.len().min(200)]));
    }

    // 先获取原始文本，再尝试多种解析方式
    let raw = resp.text().await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    if raw.is_empty() {
        return Err("推理引擎返回空响应，模型可能未正确加载。请重启引擎后重试".into());
    }
    if let Ok(r) = serde_json::from_str::<LlamaResponse>(&raw) {
        if let Some(c) = r.content {
            return Ok(c);
        }
    }

    // 方式2：OpenAI choices 格式
    if let Ok(r) = serde_json::from_str::<LlamaChoiceResponse>(&raw) {
        if let Some(choice) = r.choices.first() {
            if let Some(ref text) = choice.text {
                return Ok(text.clone());
            }
            if let Some(ref msg) = choice.message {
                return Ok(msg.content.clone());
            }
        }
    }

    // 方式3：通用 JSON 取常见字段
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
        for key in &["content", "text", "result", "response"] {
            if let Some(s) = v.get(*key).and_then(|v| v.as_str()) {
                return Ok(s.to_string());
            }
        }
    }

    // 方式4：纯文本
    if !raw.is_empty() && !raw.starts_with('{') {
        return Ok(raw);
    }

    Err(format!("无法解析推理响应 ({}字节): {}", raw.len(), &raw[..raw.len().min(200)]))
}
