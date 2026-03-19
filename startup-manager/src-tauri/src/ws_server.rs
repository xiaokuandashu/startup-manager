use futures_util::{StreamExt, SinkExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{Mutex, broadcast};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

/// 已连接的手机客户端
struct MobileClient {
    pub id: String,
}

/// 全局 WS 广播通道
static WS_TX: once_cell::sync::Lazy<broadcast::Sender<String>> = once_cell::sync::Lazy::new(|| {
    let (tx, _) = broadcast::channel(100);
    tx
});

/// 启动 WebSocket Server（端口 19527）
pub async fn start_ws_server() {
    let listener = match TcpListener::bind("0.0.0.0:19527").await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[WS Server] 启动失败: {}", e);
            return;
        }
    };
    println!("[WS Server] 运行在 ws://0.0.0.0:19527");

    let clients: Arc<Mutex<HashMap<String, tokio::sync::mpsc::Sender<String>>>> = Arc::new(Mutex::new(HashMap::new()));

    loop {
        if let Ok((stream, addr)) = listener.accept().await {
            let clients = clients.clone();
            let client_id = format!("mobile_{}", addr);

            tokio::spawn(async move {
                let ws_stream = match accept_async(stream).await {
                    Ok(ws) => ws,
                    Err(e) => {
                        eprintln!("[WS] 握手失败 {}: {}", addr, e);
                        return;
                    }
                };
                println!("[WS] 手机连接: {}", addr);

                let (mut write, mut read) = ws_stream.split();
                let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

                // 注册客户端
                {
                    let mut map = clients.lock().await;
                    map.insert(client_id.clone(), tx);
                }

                // 发送欢迎消息
                let welcome = serde_json::json!({
                    "type": "connected",
                    "platform": std::env::consts::OS,
                    "version": env!("CARGO_PKG_VERSION"),
                });
                let _ = write.send(Message::Text(welcome.to_string())).await;

                // 读写任务分离
                let cid = client_id.clone();
                let clients_r = clients.clone();

                // 写入任务：把要发给手机的消息发出去
                let write_task = tokio::spawn(async move {
                    while let Some(msg) = rx.recv().await {
                        if write.send(Message::Text(msg)).await.is_err() {
                            break;
                        }
                    }
                });

                // 读取任务：处理手机发来的消息
                while let Some(Ok(msg)) = read.next().await {
                    if let Message::Text(text) = msg {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                            handle_mobile_message(&json, &clients_r, &cid).await;
                        }
                    }
                }

                // 断开连接
                println!("[WS] 手机断开: {}", addr);
                {
                    let mut map = clients.lock().await;
                    map.remove(&client_id);
                }
                write_task.abort();
            });
        }
    }
}

/// 处理手机发来的消息
async fn handle_mobile_message(
    json: &serde_json::Value,
    _clients: &Arc<Mutex<HashMap<String, tokio::sync::mpsc::Sender<String>>>>,
    _client_id: &str,
) {
    let msg_type = json["type"].as_str().unwrap_or("");

    match msg_type {
        "ping" => {
            // 发送系统信息作为心跳响应
            let (mem_used, mem_total) = get_memory_details();
            let (disk_pct, disk_used, disk_total) = get_disk_usage();
            let info = serde_json::json!({
                "type": "heartbeat",
                "cpu": get_cpu_usage(),
                "cpu_temp": 0,
                "memory": get_memory_usage(),
                "memory_used": mem_used,
                "memory_total": mem_total,
                "disk": disk_pct,
                "disk_used": disk_used,
                "disk_total": disk_total,
                "tasks_running": 0,
                "device_id": get_device_id(),
                "device_name": hostname(),
                "hostname": hostname(),
                "os_version": get_os_version(),
            });
            broadcast_to_mobiles(_clients, &info.to_string()).await;
        }
        "task_execute" => {
            let task_id = json["task_id"].as_str().unwrap_or("");
            println!("[WS] 手机请求执行任务: {}", task_id);
            // TODO: 调用 execute_task_chain
            let result = serde_json::json!({
                "type": "result",
                "task_id": task_id,
                "success": true,
                "output": "任务已执行",
            });
            broadcast_to_mobiles(_clients, &result.to_string()).await;
        }
        "ai_chat" => {
            let message = json["message"].as_str().unwrap_or("");
            println!("[WS] 手机AI指令: {}", message);
            // TODO: 调用 ai_cloud_parse
            let result = serde_json::json!({
                "type": "ai_response",
                "content": format!("已收到指令: {}", message),
            });
            broadcast_to_mobiles(_clients, &result.to_string()).await;
        }
        "launch_app" => {
            let app_path = json["app_path"].as_str().unwrap_or("");
            println!("[WS] 手机远程启动: {}", app_path);
            #[cfg(target_os = "macos")]
            let _ = std::process::Command::new("open").arg(app_path).spawn();
            #[cfg(target_os = "windows")]
            let _ = std::process::Command::new("cmd").args(["/c", "start", "", app_path]).spawn();
        }
        "execute_script" => {
            let script = json["script_content"].as_str().unwrap_or("");
            let script_type = json["script_type"].as_str().unwrap_or("bash");
            println!("[WS] 手机远程脚本 ({}): {}...", script_type, &script[..script.len().min(50)]);
            // TODO: 调用 run_script_internal
        }
        "auth_confirm" => {
            println!("[WS] 手机确认授权");
        }
        _ => {
            println!("[WS] 未知消息类型: {}", msg_type);
        }
    }
}

/// 广播消息给所有手机
async fn broadcast_to_mobiles(
    clients: &Arc<Mutex<HashMap<String, tokio::sync::mpsc::Sender<String>>>>,
    message: &str,
) {
    let map = clients.lock().await;
    for (_, tx) in map.iter() {
        let _ = tx.send(message.to_string()).await;
    }
}

fn get_cpu_usage() -> f64 {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    // 需要短暂等待才能获取准确数据
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_usage();
    let usage: f64 = sys.cpus().iter().map(|c| c.cpu_usage() as f64).sum::<f64>()
        / sys.cpus().len().max(1) as f64;
    (usage * 10.0).round() / 10.0
}

fn get_memory_usage() -> f64 {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_memory();
    let total = sys.total_memory() as f64;
    let used = sys.used_memory() as f64;
    if total > 0.0 { (used / total * 100.0 * 10.0).round() / 10.0 } else { 0.0 }
}

fn get_memory_details() -> (f64, f64) {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_memory();
    let used_gb = sys.used_memory() as f64 / 1_073_741_824.0;
    let total_gb = sys.total_memory() as f64 / 1_073_741_824.0;
    ((used_gb * 10.0).round() / 10.0, (total_gb * 10.0).round() / 10.0)
}

fn get_disk_usage() -> (f64, f64, f64) {
    use sysinfo::Disks;
    let disks = Disks::new_with_refreshed_list();
    let mut total_space: u64 = 0;
    let mut available_space: u64 = 0;
    for disk in disks.list() {
        total_space += disk.total_space();
        available_space += disk.available_space();
    }
    let used_space = total_space.saturating_sub(available_space);
    let total_gb = total_space as f64 / 1_073_741_824.0;
    let used_gb = used_space as f64 / 1_073_741_824.0;
    let percent = if total_space > 0 { used_space as f64 / total_space as f64 * 100.0 } else { 0.0 };
    (percent.round(), used_gb.round(), total_gb.round())
}

fn get_device_id() -> String {
    hostname()
}

fn hostname() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| {
            sysinfo::System::host_name().unwrap_or_else(|| "unknown".to_string())
        })
}

fn get_os_version() -> String {
    let name = sysinfo::System::name().unwrap_or_default();
    let version = sysinfo::System::os_version().unwrap_or_default();
    format!("{} {}", name, version).trim().to_string()
}
