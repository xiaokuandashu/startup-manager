use serde::{Deserialize, Serialize};
use std::process::Command;

/// Ollama API 地址
const OLLAMA_BASE: &str = "http://127.0.0.1:11434";

/// 支持的本地模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalModel {
    pub id: String,
    pub name: String,
    pub size: String,
    pub description: String,
    pub installed: bool,
    pub downloading: bool,
}

/// 模型推理请求
#[derive(Debug, Serialize)]
struct OllamaGenerate {
    model: String,
    prompt: String,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: i32,
}

/// 模型推理响应
#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
}

/// Ollama 模型列表响应
#[derive(Debug, Deserialize)]
struct OllamaModels {
    models: Vec<OllamaModelInfo>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelInfo {
    name: String,
    size: u64,
}

/// Ollama 下载进度
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct OllamaPullProgress {
    status: String,
    total: Option<u64>,
    completed: Option<u64>,
}

/// 检查 Ollama 是否运行
pub async fn check_ollama_status() -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(format!("{}/api/tags", OLLAMA_BASE)).send().await {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

/// 获取已安装的 Ollama 模型
pub async fn list_installed_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(format!("{}/api/tags", OLLAMA_BASE))
        .send().await
        .map_err(|e| format!("Ollama 未运行: {}", e))?;

    let models: OllamaModels = resp.json().await
        .map_err(|e| format!("解析失败: {}", e))?;

    Ok(models.models.iter().map(|m| m.name.clone()).collect())
}

/// 获取完整模型列表（含安装状态）
pub async fn get_model_list() -> Result<Vec<LocalModel>, String> {
    let installed = match list_installed_models().await {
        Ok(list) => list,
        Err(_) => vec![],
    };

    let ollama_running = check_ollama_status().await.unwrap_or(false);

    let models = vec![
        LocalModel {
            id: "rule_engine".into(),
            name: "📐 本地规则引擎".into(),
            size: "内置".into(),
            description: "关键词匹配，离线可用，速度最快".into(),
            installed: true,
            downloading: false,
        },
        LocalModel {
            id: "deepseek_cloud".into(),
            name: "☁️ DeepSeek 云端".into(),
            size: "在线".into(),
            description: "理解复杂指令，需要网络".into(),
            installed: true,
            downloading: false,
        },
        LocalModel {
            id: "qwen2.5:1.5b".into(),
            name: "🧠 Qwen2.5-1.5B".into(),
            size: "1.1GB".into(),
            description: "通义千问小模型，中文表现好".into(),
            installed: installed.iter().any(|m| m.contains("qwen2.5:1.5b") || m.contains("qwen2.5:1.5")),
            downloading: false,
        },
        LocalModel {
            id: "phi3:mini".into(),
            name: "🧠 Phi-3 Mini".into(),
            size: "2.2GB".into(),
            description: "微软小模型，推理能力强".into(),
            installed: installed.iter().any(|m| m.contains("phi3:mini") || m.contains("phi3")),
            downloading: false,
        },
        LocalModel {
            id: "gemma2:2b".into(),
            name: "🧠 Gemma 2 2B".into(),
            size: "1.6GB".into(),
            description: "Google 轻量级模型".into(),
            installed: installed.iter().any(|m| m.contains("gemma2:2b") || m.contains("gemma2")),
            downloading: false,
        },
    ];

    // 标记 Ollama 状态
    if !ollama_running {
        let mut models = models;
        for m in &mut models {
            if m.id != "rule_engine" && m.id != "deepseek_cloud" {
                m.description = format!("⚠️ 需先安装 Ollama | {}", m.description);
            }
        }
        return Ok(models);
    }

    Ok(models)
}

/// 下载模型（通过 Ollama pull）
pub async fn pull_model(model_id: &str) -> Result<String, String> {
    // 先检查 Ollama 是否运行
    if !check_ollama_status().await.unwrap_or(false) {
        return Err("Ollama 未运行。请先安装并启动 Ollama (https://ollama.ai)".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600)) // 10 分钟超时
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.post(format!("{}/api/pull", OLLAMA_BASE))
        .json(&serde_json::json!({
            "name": model_id,
            "stream": false
        }))
        .send().await
        .map_err(|e| format!("下载失败: {}", e))?;

    if resp.status().is_success() {
        Ok(format!("模型 {} 下载完成", model_id))
    } else {
        Err(format!("下载失败: HTTP {}", resp.status()))
    }
}

/// 删除模型
pub async fn delete_model(model_id: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    client.delete(format!("{}/api/delete", OLLAMA_BASE))
        .json(&serde_json::json!({ "name": model_id }))
        .send().await
        .map_err(|e| format!("删除失败: {}", e))?;

    Ok(())
}

/// 使用本地模型进行意图解析
pub async fn local_model_parse(model_id: &str, user_input: &str) -> Result<String, String> {
    if !check_ollama_status().await.unwrap_or(false) {
        return Err("Ollama 未运行".into());
    }

    let system_prompt = r#"你是一个桌面自动化助手。用户会用自然语言描述他们想做的事情。
你需要理解用户意图，并输出一个 JSON 格式的任务定义。

输出格式：
{
  "message": "对用户的回复说明",
  "response_type": "task_created",
  "tasks": [{
    "task_name": "任务名称",
    "task_type": "application 或 script",
    "path": "应用路径（如 /Applications/WeChat.app）",
    "schedule_type": "startup/once/daily/weekly/monthly",
    "schedule_time": "HH:MM 格式时间（如果有）",
    "schedule_days": [],
    "enabled": true,
    "confidence": 0.0到1.0的置信度
  }]
}

常见 macOS 应用路径：
- 微信: /Applications/WeChat.app
- Chrome: /Applications/Google Chrome.app
- Safari: /Applications/Safari.app
- 钉钉: /Applications/DingTalk.app
- VS Code: /Applications/Visual Studio Code.app
- QQ: /Applications/QQ.app
- 飞书: /Applications/Lark.app
- Finder: /System/Library/CoreServices/Finder.app

严格只输出 JSON，不要有其他内容。"#;

    let prompt = format!("{}\n\n用户输入：{}", system_prompt, user_input);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let request = OllamaGenerate {
        model: model_id.to_string(),
        prompt,
        stream: false,
        options: OllamaOptions {
            temperature: 0.1,
            num_predict: 500,
        },
    };

    let resp = client.post(format!("{}/api/generate", OLLAMA_BASE))
        .json(&request)
        .send().await
        .map_err(|e| format!("推理失败: {}", e))?;

    let result: OllamaResponse = resp.json().await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(result.response)
}

/// 启动 Ollama（如果安装了但没运行）
pub fn try_start_ollama() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // macOS: 尝试用 open 启动 Ollama.app
        let _ = Command::new("open")
            .arg("-a")
            .arg("Ollama")
            .spawn();
        // 也尝试 CLI 方式
        let _ = Command::new("/usr/local/bin/ollama")
            .arg("serve")
            .spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("ollama")
            .arg("serve")
            .spawn();
    }
    Ok(())
}

/// 检查 Ollama 是否已安装
pub fn is_ollama_installed() -> bool {
    #[cfg(target_os = "macos")]
    {
        std::path::Path::new("/Applications/Ollama.app").exists()
            || std::path::Path::new("/usr/local/bin/ollama").exists()
            || Command::new("which").arg("ollama").output()
                .map(|o| o.status.success()).unwrap_or(false)
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("where").arg("ollama").output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Command::new("which").arg("ollama").output()
            .map(|o| o.status.success()).unwrap_or(false)
    }
}
