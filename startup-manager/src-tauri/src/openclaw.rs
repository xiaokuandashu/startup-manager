// OpenClaw 集成模块 — 与 OpenClaw 本地 AI Agent 通信
// 安全策略：不限制 Shell/文件/网络能力，不接入 ClawHub 插件市场
// 敏感操作需用户授权（单次/双次确认）

use serde::{Deserialize, Serialize};

const OPENCLAW_DEFAULT_PORT: u16 = 18789;
const OPENCLAW_BASE_URL: &str = "http://127.0.0.1:18789";

// ==================== 数据结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenClawStatus {
    pub installed: bool,
    pub running: bool,
    pub version: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenClawTaskResult {
    pub success: bool,
    pub output: String,
    pub requires_auth: bool,
    pub auth_level: String, // "none" | "normal" | "critical"
    pub tool_used: String,
}

// 敏感操作关键词 — 用于判断授权级别
const NORMAL_SENSITIVE: &[&str] = &[
    "rm ", "del ", "delete", "remove", "unlink",
    "chmod", "chown", "kill", "pkill",
    "shutdown", "reboot", "restart",
    "mv ", "move ", "rename",
    "curl ", "wget ", "fetch",
];

const CRITICAL_SENSITIVE: &[&str] = &[
    "rm -rf", "rm -r /", "del /f /s",
    "sudo", "su ", "runas",
    "format", "mkfs", "diskutil erase",
    "shutdown -h", "shutdown /s",
    "chmod 777", "chmod -R 777",
    "> /dev/", "| dd ",
    "DROP TABLE", "DROP DATABASE",
    "passwd", "adduser", "useradd",
];

// ==================== 功能函数 ====================

/// 检测 OpenClaw 是否已安装
pub fn check_installed() -> bool {
    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("which")
        .arg("openclaw")
        .output();
    
    #[cfg(target_os = "windows")]
    let output = std::process::Command::new("where")
        .arg("openclaw")
        .output();
    
    match output {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}

/// 检测 OpenClaw Gateway 是否运行中
pub async fn check_running() -> bool {
    let url = format!("{}/healthz", OPENCLAW_BASE_URL);
    match reqwest::Client::new()
        .get(&url)
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// 获取 OpenClaw 版本号
pub fn get_version() -> String {
    let output = std::process::Command::new("openclaw")
        .arg("--version")
        .output();
    
    match output {
        Ok(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout).trim().to_string()
        }
        _ => String::new(),
    }
}

/// 获取完整状态
pub async fn get_status() -> OpenClawStatus {
    let installed = check_installed();
    let running = if installed { check_running().await } else { false };
    let version = if installed { get_version() } else { String::new() };
    
    OpenClawStatus {
        installed,
        running,
        version,
        port: OPENCLAW_DEFAULT_PORT,
    }
}

/// 判断操作的授权级别
pub fn get_auth_level(command: &str) -> &'static str {
    let lower = command.to_lowercase();
    
    // 先检查最高危
    for keyword in CRITICAL_SENSITIVE {
        if lower.contains(&keyword.to_lowercase()) {
            return "critical"; // 需要双次确认
        }
    }
    
    // 再检查一般敏感
    for keyword in NORMAL_SENSITIVE {
        if lower.contains(&keyword.to_lowercase()) {
            return "normal"; // 需要单次确认
        }
    }
    
    "none" // 不需要确认
}

/// 通过 OpenClaw 执行任务
pub async fn execute_task(prompt: &str, token: &str) -> Result<OpenClawTaskResult, String> {
    let auth_level = get_auth_level(prompt);
    
    let url = format!("{}/v1/chat/completions", OPENCLAW_BASE_URL);
    
    let body = serde_json::json!({
        "model": "openclaw",
        "messages": [
            {
                "role": "system",
                "content": "你是任务精灵的 AI 执行引擎。直接执行用户请求的操作，返回执行结果。不要解释，直接做。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "stream": false,
    });
    
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(120))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenClaw 请求失败: {}", e))?;
    
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("OpenClaw 返回错误 {}: {}", status, text));
    }
    
    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("(无输出)")
        .to_string();
    
    let tool_used = data["choices"][0]["message"]["tool_calls"][0]["function"]["name"]
        .as_str()
        .unwrap_or("chat")
        .to_string();
    
    Ok(OpenClawTaskResult {
        success: true,
        output: content,
        requires_auth: auth_level != "none",
        auth_level: auth_level.to_string(),
        tool_used,
    })
}

/// 读取 OpenClaw 配置中的 gateway token
pub fn read_gateway_token() -> Option<String> {
    #[cfg(target_os = "windows")]
    let home = std::env::var("USERPROFILE").ok()?;
    #[cfg(not(target_os = "windows"))]
    let home = std::env::var("HOME").ok()?;
    
    let config_path = std::path::PathBuf::from(home).join(".openclaw").join("openclaw.json");
    
    if !config_path.exists() {
        return None;
    }
    
    let content = std::fs::read_to_string(&config_path).ok()?;
    // openclaw.json 使用 JSON5 格式，简单处理
    let clean = content
        .lines()
        .filter(|l| !l.trim_start().starts_with("//"))
        .collect::<Vec<_>>()
        .join("\n");
    
    let parsed: serde_json::Value = serde_json::from_str(&clean).ok()?;
    parsed["gateway"]["token"]
        .as_str()
        .map(|s| s.to_string())
}
