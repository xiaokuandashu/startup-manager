use serde::{Deserialize, Serialize};

/// AI 解析结果 — 生成的任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiTaskResult {
    pub task_name: String,
    pub task_type: String,      // "application" | "script" | "path"
    pub path: String,
    pub schedule_type: String,  // "startup" | "once" | "daily" | "weekly" | "monthly"
    pub schedule_time: String,  // "09:00" 等
    pub schedule_days: Vec<u8>, // 周几 [1..7] 或月几号
    pub enabled: bool,
    pub confidence: f32,        // 置信度 0.0~1.0
}

/// AI 回复消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponse {
    pub message: String,
    pub response_type: String,  // "task_created" | "task_list" | "info" | "error" | "cloud_needed"
    pub tasks: Vec<AiTaskResult>,
}

/// 已安装应用的简要信息（用于匹配）
#[derive(Debug, Clone)]
pub struct AppInfo {
    pub name: String,
    pub name_lower: String,
    pub path: String,
}

/// 意图类型
#[derive(Debug)]
enum Intent {
    OpenApp { app_name: String, schedule: Schedule },
    RunScript { path: String, schedule: Schedule },
    OpenPath { path: String, schedule: Schedule },
    ListTasks,
    DeleteTask { name: String },
    Help,
    Unknown { input: String },
}

/// 调度类型
#[derive(Debug, Clone)]
struct Schedule {
    schedule_type: String,
    time: String,
    days: Vec<u8>,
}

impl Default for Schedule {
    fn default() -> Self {
        Schedule {
            schedule_type: "once".to_string(),
            time: String::new(),
            days: vec![],
        }
    }
}

/// 核心解析函数 — 本地规则引擎
pub fn parse_intent(input: &str, installed_apps: &[AppInfo]) -> AiResponse {
    let input_trim = input.trim();
    if input_trim.is_empty() {
        return AiResponse {
            message: "请告诉我你想做什么，例如「打开微信」或「每天9点打开Chrome」".into(),
            response_type: "info".into(),
            tasks: vec![],
        };
    }

    let intent = classify_intent(input_trim, installed_apps);

    match intent {
        Intent::OpenApp { app_name, schedule } => {
            handle_open_app(&app_name, &schedule, installed_apps)
        }
        Intent::RunScript { path, schedule } => {
            handle_run_script(&path, &schedule)
        }
        Intent::OpenPath { path, schedule } => {
            handle_open_path(&path, &schedule)
        }
        Intent::ListTasks => AiResponse {
            message: "好的，我来帮你查看当前所有任务。".into(),
            response_type: "task_list".into(),
            tasks: vec![],
        },
        Intent::DeleteTask { name } => AiResponse {
            message: format!("好的，我来帮你删除任务「{}」。请在任务列表中确认。", name),
            response_type: "info".into(),
            tasks: vec![],
        },
        Intent::Help => AiResponse {
            message: "🤖 我可以帮你：\n\n\
                • **打开应用** — 「打开微信」「启动Chrome」\n\
                • **定时任务** — 「每天9点打开钉钉」「每周一打开Excel」\n\
                • **开机启动** — 「开机启动微信」\n\
                • **运行脚本** — 「运行桌面上的backup.sh」\n\
                • **查看任务** — 「查看所有任务」\n\
                • **删除任务** — 「删除打开微信的任务」\n\n\
                试试看吧！直接用自然语言告诉我。".into(),
            response_type: "info".into(),
            tasks: vec![],
        },
        Intent::Unknown { input } => {
            // 本地无法解析 → 标记为需要云端处理
            AiResponse {
                message: format!(
                    "🤔 这个指令有点复杂，我正在思考...\n\n你说的是：「{}」\n\n提示：你可以试试更简单的表达，比如「打开XX」「每天X点打开XX」", input
                ),
                response_type: "cloud_needed".into(),
                tasks: vec![],
            }
        }
    }
}

/// 意图分类
fn classify_intent(input: &str, installed_apps: &[AppInfo]) -> Intent {
    let lower = input.to_lowercase();

    // 帮助
    if lower.contains("帮助") || lower.contains("help") || lower == "?" || lower == "？"
        || lower.contains("你能做什么") || lower.contains("怎么用")
    {
        return Intent::Help;
    }

    // 查看任务
    if lower.contains("查看") && (lower.contains("任务") || lower.contains("列表"))
        || lower.contains("所有任务") || lower.contains("list")
    {
        return Intent::ListTasks;
    }

    // 删除任务
    if lower.contains("删除") && lower.contains("任务") || lower.contains("移除") {
        let name = extract_after_keyword(input, &["删除任务", "删除", "移除"]);
        return Intent::DeleteTask { name };
    }

    // 解析调度信息
    let schedule = parse_schedule(input);

    // 运行脚本（检测路径后缀）
    let script_exts = [".sh", ".bat", ".cmd", ".ps1", ".py", ".command", ".scpt"];
    for ext in &script_exts {
        if lower.contains(ext) {
            let path = extract_path(input);
            return Intent::RunScript { path, schedule };
        }
    }
    if lower.contains("运行脚本") || lower.contains("执行脚本") || lower.contains("run script") {
        let path = extract_path(input);
        return Intent::RunScript { path, schedule };
    }

    // 打开路径/文件夹
    if lower.contains("打开文件夹") || lower.contains("打开目录") || lower.contains("open folder") {
        let path = extract_path(input);
        return Intent::OpenPath { path, schedule };
    }

    // 打开应用（关键词匹配）
    let open_keywords = ["打开", "启动", "开启", "运行", "open", "start", "launch", "开机启动", "开机打开"];
    for kw in &open_keywords {
        if lower.contains(kw) {
            let app_name = extract_app_name(input, kw, installed_apps);
            if !app_name.is_empty() {
                return Intent::OpenApp { app_name, schedule };
            }
        }
    }

    // 如果检测到已安装应用名称，推测为打开应用
    for app in installed_apps {
        if lower.contains(&app.name_lower) {
            return Intent::OpenApp {
                app_name: app.name.clone(),
                schedule,
            };
        }
    }

    Intent::Unknown { input: input.to_string() }
}

/// 从输入中提取应用名称
fn extract_app_name(input: &str, keyword: &str, installed_apps: &[AppInfo]) -> String {
    // 移除关键词后取剩余部分（使用 char_indices 安全切片）
    let lower = input.to_lowercase();
    let after = if let Some(pos) = lower.find(keyword) {
        let start = pos + keyword.len();
        // 确保切片位置在字符边界上
        if start <= input.len() && input.is_char_boundary(start) {
            input[start..].trim()
        } else {
            input
        }
    } else {
        input
    };

    // 去除调度相关词汇
    let clean = remove_schedule_words(after);
    let clean_lower = clean.to_lowercase();

    // 在已安装应用中模糊匹配
    // 1. 完全匹配
    for app in installed_apps {
        if app.name_lower == clean_lower {
            return app.name.clone();
        }
    }
    // 2. 包含匹配
    for app in installed_apps {
        if app.name_lower.contains(&clean_lower) || clean_lower.contains(&app.name_lower) {
            return app.name.clone();
        }
    }

    // 3. 常用应用别名
    let aliases: Vec<(&str, &[&str])> = vec![
        ("WeChat", &["微信", "wechat", "wx"]),
        ("Google Chrome", &["chrome", "谷歌", "谷歌浏览器", "浏览器"]),
        ("Safari", &["safari", "苹果浏览器"]),
        ("DingTalk", &["钉钉", "dingtalk", "dd"]),
        ("QQ", &["qq", "腾讯qq"]),
        ("Visual Studio Code", &["vscode", "vs code", "code"]),
        ("Microsoft Word", &["word", "文档"]),
        ("Microsoft Excel", &["excel", "表格"]),
        ("Microsoft PowerPoint", &["ppt", "幻灯片", "powerpoint"]),
        ("iTerm", &["终端", "iterm", "terminal"]),
        ("Finder", &["访达", "finder", "文件管理器"]),
        ("System Preferences", &["系统设置", "设置", "系统偏好"]),
        ("Notes", &["备忘录", "notes", "笔记"]),
        ("Calendar", &["日历", "calendar"]),
        ("Mail", &["邮件", "mail", "邮箱客户端"]),
        ("Spotify", &["spotify", "音乐"]),
        ("Slack", &["slack"]),
        ("Telegram", &["telegram", "电报", "tg"]),
        ("Firefox", &["firefox", "火狐"]),
    ];

    for (real_name, alias_list) in &aliases {
        for alias in *alias_list {
            if clean_lower == *alias || clean_lower.contains(alias) {
                // 检查是否已安装
                for app in installed_apps {
                    if app.name_lower.contains(&real_name.to_lowercase()) {
                        return app.name.clone();
                    }
                }
                return real_name.to_string();
            }
        }
    }

    clean.to_string()
}

/// 解析调度信息
fn parse_schedule(input: &str) -> Schedule {
    let lower = input.to_lowercase();

    // 开机启动
    if lower.contains("开机") || lower.contains("startup") || lower.contains("boot") {
        return Schedule {
            schedule_type: "startup".to_string(),
            time: String::new(),
            days: vec![],
        };
    }

    // 解析时间 "X点" / "X:XX" / "HH:MM"
    let time = extract_time(&lower);

    // 每天
    if lower.contains("每天") || lower.contains("daily") || lower.contains("每日") {
        return Schedule {
            schedule_type: "daily".to_string(),
            time: time.unwrap_or_else(|| "09:00".to_string()),
            days: vec![],
        };
    }

    // 每周X
    let weekday_map: Vec<(&str, u8)> = vec![
        ("周一", 1), ("周二", 2), ("周三", 3), ("周四", 4),
        ("周五", 5), ("周六", 6), ("周日", 7), ("周天", 7),
        ("星期一", 1), ("星期二", 2), ("星期三", 3), ("星期四", 4),
        ("星期五", 5), ("星期六", 6), ("星期日", 7), ("星期天", 7),
        ("monday", 1), ("tuesday", 2), ("wednesday", 3), ("thursday", 4),
        ("friday", 5), ("saturday", 6), ("sunday", 7),
    ];

    let mut days = vec![];
    for (name, day) in &weekday_map {
        if lower.contains(name) {
            days.push(*day);
        }
    }
    if !days.is_empty() || lower.contains("每周") || lower.contains("weekly") {
        if days.is_empty() { days.push(1); } // 默认周一
        return Schedule {
            schedule_type: "weekly".to_string(),
            time: time.unwrap_or_else(|| "09:00".to_string()),
            days,
        };
    }

    // 每月X号
    if lower.contains("每月") || lower.contains("monthly") {
        let day = extract_number(&lower).unwrap_or(1);
        return Schedule {
            schedule_type: "monthly".to_string(),
            time: time.unwrap_or_else(|| "09:00".to_string()),
            days: vec![day as u8],
        };
    }

    // 有时间但没有周期 → 一次性
    if let Some(t) = time {
        return Schedule {
            schedule_type: "once".to_string(),
            time: t,
            days: vec![],
        };
    }

    Schedule::default()
}

/// 提取时间（UTF-8 安全）
fn extract_time(input: &str) -> Option<String> {
    // 匹配 "X点" "X点半" "X点Y分" — 使用 chars 向量避免字节索引
    let chars: Vec<char> = input.chars().collect();
    for i in 0..chars.len() {
        if chars[i] == '点' || chars[i] == '時' {
            // 往前找数字
            let mut hour = String::new();
            let mut j = i as isize - 1;
            while j >= 0 && chars[j as usize].is_ascii_digit() {
                hour.insert(0, chars[j as usize]);
                j -= 1;
            }
            if let Ok(h) = hour.parse::<u32>() {
                if h <= 23 {
                    // 往后找分钟 — 直接用 chars 切片
                    let rest_chars: Vec<char> = chars[i + 1..].to_vec();
                    let rest: String = rest_chars.iter().collect();
                    if rest.starts_with('半') {
                        return Some(format!("{:02}:30", h));
                    }
                    let mut min_str = String::new();
                    for c in rest.chars() {
                        if c.is_ascii_digit() { min_str.push(c); }
                        else { break; }
                    }
                    if let Ok(m) = min_str.parse::<u32>() {
                        if m < 60 {
                            return Some(format!("{:02}:{:02}", h, m));
                        }
                    }
                    return Some(format!("{:02}:00", h));
                }
            }
        }
    }

    // 匹配 HH:MM — 使用 char_indices 安全遍历
    let bytes = input.as_bytes();
    for (byte_idx, _) in input.char_indices() {
        // 只在 ASCII 数字位置开始检查
        if byte_idx + 5 <= bytes.len()
            && bytes[byte_idx].is_ascii_digit()
            && bytes[byte_idx + 1].is_ascii_digit()
            && bytes[byte_idx + 2] == b':'
            && bytes[byte_idx + 3].is_ascii_digit()
            && bytes[byte_idx + 4].is_ascii_digit()
        {
            let h = &input[byte_idx..byte_idx + 2];
            let m = &input[byte_idx + 3..byte_idx + 5];
            if let (Ok(hv), Ok(mv)) = (h.parse::<u32>(), m.parse::<u32>()) {
                if hv <= 23 && mv < 60 {
                    return Some(format!("{:02}:{:02}", hv, mv));
                }
            }
        }
    }

    None
}

/// 提取路径（UTF-8 安全）
fn extract_path(input: &str) -> String {
    // macOS/Linux 路径 — find() 返回的是字节位置, '/' 是 ASCII 所以安全
    if let Some(start) = input.find('/') {
        let path: String = input[start..].chars().take_while(|c| !c.is_whitespace() && *c != '，' && *c != '。').collect();
        return path;
    }
    // Windows 路径 — ":\\" 是 ASCII, 但 start-1 可能在中文字符中间
    if let Some(colon_pos) = input.find(":\\") {
        // 往前找盘符字母，使用 char_indices 安全定位
        let mut path_start = colon_pos;
        for (byte_idx, ch) in input.char_indices() {
            if byte_idx == colon_pos { break; }
            if ch.is_ascii_alphabetic() { path_start = byte_idx; }
        }
        let path: String = input[path_start..].chars().take_while(|c| !c.is_whitespace() || *c == ' ').collect();
        return path;
    }
    // ~ 开头 — '~' 是 ASCII 所以安全
    if let Some(start) = input.find("~/") {
        let path: String = input[start..].chars().take_while(|c| !c.is_whitespace() && *c != '，' && *c != '。').collect();
        return path;
    }
    String::new()
}

/// 提取数字
fn extract_number(input: &str) -> Option<u32> {
    let mut num = String::new();
    for c in input.chars() {
        if c.is_ascii_digit() {
            num.push(c);
        } else if !num.is_empty() {
            break;
        }
    }
    num.parse().ok()
}

/// 提取关键词后面的内容（UTF-8 安全）
fn extract_after_keyword(input: &str, keywords: &[&str]) -> String {
    for kw in keywords {
        if let Some(pos) = input.find(kw) {
            let end = pos + kw.len();
            if end <= input.len() && input.is_char_boundary(end) {
                let after = input[end..].trim();
                if !after.is_empty() {
                    return after.to_string();
                }
            }
        }
    }
    input.to_string()
}

/// 移除调度相关词汇
fn remove_schedule_words(input: &str) -> String {
    let mut result = input.to_string();
    let words = [
        "每天", "每日", "每周", "每月", "开机", "启动时", "daily", "weekly", "monthly",
        "周一", "周二", "周三", "周四", "周五", "周六", "周日", "周天",
        "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日", "星期天",
        "上午", "下午", "晚上", "早上", "中午",
    ];
    for w in &words {
        result = result.replace(w, "");
    }
    // 移除时间 "X点" "X:XX"
    let result_clone = result.clone();
    let chars: Vec<char> = result_clone.chars().collect();
    let mut skip_ranges: Vec<(usize, usize)> = vec![];
    for i in 0..chars.len() {
        if chars[i] == '点' {
            let mut start = i;
            while start > 0 && chars[start - 1].is_ascii_digit() { start -= 1; }
            let mut end = i + 1;
            while end < chars.len() && (chars[end].is_ascii_digit() || chars[end] == '半' || chars[end] == '分') { end += 1; }
            skip_ranges.push((start, end));
        }
    }
    if !skip_ranges.is_empty() {
        let mut filtered = String::new();
        for (i, c) in chars.iter().enumerate() {
            if !skip_ranges.iter().any(|(s, e)| i >= *s && i < *e) {
                filtered.push(*c);
            }
        }
        result = filtered;
    }
    result.trim().to_string()
}

/// 处理打开应用
fn handle_open_app(app_name: &str, schedule: &Schedule, installed_apps: &[AppInfo]) -> AiResponse {
    // 查找应用路径
    let app_lower = app_name.to_lowercase();
    let mut found_path = String::new();
    for app in installed_apps {
        if app.name_lower == app_lower || app.name_lower.contains(&app_lower) || app_lower.contains(&app.name_lower) {
            found_path = app.path.clone();
            break;
        }
    }

    let schedule_desc = match schedule.schedule_type.as_str() {
        "startup" => "开机时".to_string(),
        "daily" => format!("每天 {}", schedule.time),
        "weekly" => {
            let day_names: Vec<&str> = schedule.days.iter().map(|d| match d {
                1 => "周一", 2 => "周二", 3 => "周三", 4 => "周四",
                5 => "周五", 6 => "周六", 7 => "周日", _ => "?",
            }).collect();
            format!("每{} {}", day_names.join("、"), schedule.time)
        }
        "monthly" => {
            let days: Vec<String> = schedule.days.iter().map(|d| format!("{}号", d)).collect();
            format!("每月{} {}", days.join("、"), schedule.time)
        }
        "once" if !schedule.time.is_empty() => format!("今天 {}", schedule.time),
        _ => "立即执行一次".to_string(),
    };

    let task = AiTaskResult {
        task_name: format!("{} {}", schedule_desc, app_name),
        task_type: "application".to_string(),
        path: found_path.clone(),
        schedule_type: schedule.schedule_type.clone(),
        schedule_time: schedule.time.clone(),
        schedule_days: schedule.days.clone(),
        enabled: true,
        confidence: if found_path.is_empty() { 0.6 } else { 0.95 },
    };

    let msg = if found_path.is_empty() {
        format!("📋 我为你创建了任务：\n\n**{}** → 打开 **{}**\n\n⚠️ 未找到应用路径，请手动选择路径后确认添加。", schedule_desc, app_name)
    } else {
        format!("📋 我为你创建了任务：\n\n**{}** → 打开 **{}**\n\n路径：`{}`\n\n确认添加到任务列表？", schedule_desc, app_name, found_path)
    };

    AiResponse {
        message: msg,
        response_type: "task_created".into(),
        tasks: vec![task],
    }
}

/// 处理运行脚本
fn handle_run_script(path: &str, schedule: &Schedule) -> AiResponse {
    if path.is_empty() {
        return AiResponse {
            message: "请提供脚本路径，例如「运行 ~/Desktop/backup.sh」".into(),
            response_type: "info".into(),
            tasks: vec![],
        };
    }

    let schedule_desc = if schedule.schedule_type == "startup" {
        "开机时".to_string()
    } else if !schedule.time.is_empty() {
        format!("每天 {}", schedule.time)
    } else {
        "立即执行一次".to_string()
    };

    let task = AiTaskResult {
        task_name: format!("{} 运行脚本", schedule_desc),
        task_type: "script".to_string(),
        path: path.to_string(),
        schedule_type: schedule.schedule_type.clone(),
        schedule_time: schedule.time.clone(),
        schedule_days: schedule.days.clone(),
        enabled: true,
        confidence: 0.85,
    };

    AiResponse {
        message: format!("📋 我为你创建了脚本任务：\n\n**{}** → 运行 `{}`\n\n确认添加？", schedule_desc, path),
        response_type: "task_created".into(),
        tasks: vec![task],
    }
}

/// 处理打开路径
fn handle_open_path(path: &str, schedule: &Schedule) -> AiResponse {
    if path.is_empty() {
        return AiResponse {
            message: "请提供文件夹路径，例如「打开文件夹 ~/Desktop」".into(),
            response_type: "info".into(),
            tasks: vec![],
        };
    }

    let task = AiTaskResult {
        task_name: format!("打开 {}", path),
        task_type: "path".to_string(),
        path: path.to_string(),
        schedule_type: schedule.schedule_type.clone(),
        schedule_time: schedule.time.clone(),
        schedule_days: schedule.days.clone(),
        enabled: true,
        confidence: 0.9,
    };

    AiResponse {
        message: format!("📋 我为你创建了路径任务：\n\n打开 `{}`\n\n确认添加？", path),
        response_type: "task_created".into(),
        tasks: vec![task],
    }
}
