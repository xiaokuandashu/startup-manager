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
}

/// 推理响应
#[derive(Debug, Deserialize)]
struct LlamaResponse {
    content: String,
}

/// 进程管理（全局）
lazy_static::lazy_static! {
    static ref LLAMA_PID: Arc<Mutex<Option<u32>>> = Arc::new(Mutex::new(None));
    static ref ACTIVE_MODEL: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
}

/// 获取引擎存储目录
fn engine_dir() -> String {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        format!("{}/Library/Application Support/com.a.startup-manager/llama", home)
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".into());
        format!("{}\\startup-manager\\llama", appdata)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        format!("{}/.config/startup-manager/llama", home)
    }
}

/// 模型存储目录
fn models_dir() -> String {
    format!("{}/models", engine_dir())
}

/// llama-server 二进制路径
fn server_bin_path() -> String {
    #[cfg(target_os = "macos")]
    { format!("{}/llama-server", engine_dir()) }
    #[cfg(target_os = "windows")]
    { format!("{}\\llama-server.exe", engine_dir()) }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    { format!("{}/llama-server", engine_dir()) }
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
            download_url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf".into(),
            filename: "qwen2.5-1.5b-instruct-q4_k_m.gguf".into(),
        },
        LocalModel {
            id: "phi3-mini".into(),
            name: "🧠 Phi-3 Mini".into(),
            size: "2.2GB".into(),
            description: "微软小模型，推理能力强".into(),
            installed: std::path::Path::new(&format!("{}/phi-3-mini-4k-instruct-q4.gguf", mdir)).exists(),
            downloading: false,
            download_url: "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf".into(),
            filename: "phi-3-mini-4k-instruct-q4.gguf".into(),
        },
        LocalModel {
            id: "gemma2-2b".into(),
            name: "🧠 Gemma 2 2B".into(),
            size: "1.5GB".into(),
            description: "Google 轻量级模型".into(),
            installed: std::path::Path::new(&format!("{}/gemma-2-2b-it-Q4_K_M.gguf", mdir)).exists(),
            downloading: false,
            download_url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf".into(),
            filename: "gemma-2-2b-it-Q4_K_M.gguf".into(),
        },
    ]
}

/// 检测 llama-server 是否已安装
pub fn is_engine_installed() -> bool {
    std::path::Path::new(&server_bin_path()).exists()
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
        engine_installed: is_engine_installed(),
        engine_running: is_engine_running().await,
        active_model: active,
        models: available_models(),
    }
}

/// 获取模型列表
pub async fn get_model_list() -> Result<Vec<LocalModel>, String> {
    Ok(available_models())
}

/// 下载 llama-server 引擎二进制
pub async fn download_engine() -> Result<String, String> {
    let dir = engine_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let bin_path = server_bin_path();
    if std::path::Path::new(&bin_path).exists() {
        return Ok("引擎已安装".into());
    }

    // 根据平台选择下载 URL
    #[cfg(target_os = "macos")]
    let (url, archive_name) = {
        #[cfg(target_arch = "aarch64")]
        { (
            "https://github.com/ggerganov/llama.cpp/releases/latest/download/llama-server-macos-arm64",
            "llama-server"
        ) }
        #[cfg(not(target_arch = "aarch64"))]
        { (
            "https://github.com/ggerganov/llama.cpp/releases/latest/download/llama-server-macos-x64",
            "llama-server"
        ) }
    };

    #[cfg(target_os = "windows")]
    let (url, archive_name) = (
        "https://github.com/ggerganov/llama.cpp/releases/latest/download/llama-server-windows-x64.exe",
        "llama-server.exe"
    );

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let (url, archive_name) = (
        "https://github.com/ggerganov/llama.cpp/releases/latest/download/llama-server-linux-x64",
        "llama-server"
    );

    // 用 curl 下载（更可靠，支持重定向）
    let output_path = format!("{}/{}", dir, archive_name);
    let status = Command::new("curl")
        .args(["-L", "-o", &output_path, "--progress-bar", url])
        .status()
        .map_err(|e| format!("下载失败: {}", e))?;

    if !status.success() {
        return Err("引擎下载失败".into());
    }

    // 设置可执行权限
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("chmod").args(["+x", &output_path]).status();
    }

    Ok("引擎安装完成".into())
}

/// 下载 GGUF 模型
pub async fn download_model(model_id: &str) -> Result<String, String> {
    let models = available_models();
    let model = models.iter().find(|m| m.id == model_id)
        .ok_or("模型不存在")?;

    if model.download_url.is_empty() {
        return Err("该模型无需下载".into());
    }

    // 确保引擎已安装
    if !is_engine_installed() {
        download_engine().await?;
    }

    let dir = models_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let dest = format!("{}/{}", dir, model.filename);
    if std::path::Path::new(&dest).exists() {
        return Ok("模型已下载".into());
    }

    // curl 下载模型文件
    let status = Command::new("curl")
        .args(["-L", "-o", &dest, "--progress-bar", &model.download_url])
        .status()
        .map_err(|e| format!("下载失败: {}", e))?;

    if !status.success() {
        // 清理不完整文件
        let _ = std::fs::remove_file(&dest);
        return Err("模型下载失败".into());
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

/// 启动 llama-server 加载指定模型
pub fn start_engine(model_id: &str) -> Result<(), String> {
    // 先停止已有进程
    stop_engine();

    let models = available_models();
    let model = models.iter().find(|m| m.id == model_id)
        .ok_or("模型不存在")?;

    let model_path = format!("{}/{}", models_dir(), model.filename);
    if !std::path::Path::new(&model_path).exists() {
        return Err(format!("模型文件不存在，请先下载: {}", model.name));
    }

    let bin = server_bin_path();
    if !std::path::Path::new(&bin).exists() {
        return Err("推理引擎未安装，请先下载引擎".into());
    }

    let child = Command::new(&bin)
        .args([
            "--model", &model_path,
            "--host", LLAMA_HOST,
            "--port", &LLAMA_PORT.to_string(),
            "--ctx-size", "2048",
            "--n-predict", "512",
            "--threads", "4",
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("启动引擎失败: {}", e))?;

    let pid = child.id();
    if let Ok(mut p) = LLAMA_PID.lock() {
        *p = Some(pid);
    }
    if let Ok(mut m) = ACTIVE_MODEL.lock() {
        *m = model_id.to_string();
    }

    Ok(())
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

/// 使用内置引擎进行推理
pub async fn local_infer(user_input: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

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
    "confidence": 0.0-1.0
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

    let result: LlamaResponse = resp.json().await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(result.content)
}
