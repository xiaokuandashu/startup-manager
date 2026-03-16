use serde::{Deserialize, Serialize};
use crate::recorder::{Recording, RecordedStep};

/// 市场任务项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub category: String,
    pub tags: Vec<String>,
    pub platform: String,       // macos / windows / cross
    pub step_count: usize,
    pub duration_ms: u64,
    pub downloads: u32,
    pub rating: f32,
    pub created_at: String,
    pub recording: Option<Recording>,
}

/// 市场分类
const CATEGORIES: &[&str] = &[
    "办公效率", "开发工具", "社交通讯", "系统管理",
    "文件管理", "浏览器", "设计创作", "其他",
];

/// 获取市场存储目录
fn marketplace_dir() -> String {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        format!("{}/Library/Application Support/com.a.startup-manager/marketplace", home)
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".to_string());
        format!("{}\\startup-manager\\marketplace", appdata)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        format!("{}/.config/startup-manager/marketplace", home)
    }
}

/// 发布录制到市场（本地存储，为云端做准备）
pub fn publish_to_marketplace(
    recording: Recording,
    description: String,
    author: String,
    category: String,
    tags: Vec<String>,
) -> Result<String, String> {
    let dir = marketplace_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let platform = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };

    let item = MarketplaceItem {
        id: recording.id.clone(),
        name: recording.name.clone(),
        description,
        author,
        category,
        tags,
        platform: platform.to_string(),
        step_count: recording.step_count,
        duration_ms: recording.duration_ms,
        downloads: 0,
        rating: 0.0,
        created_at: recording.created_at.clone(),
        recording: Some(recording),
    };

    let path = format!("{}/{}.json", dir, item.id);
    let json = serde_json::to_string_pretty(&item).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("保存失败: {}", e))?;

    Ok(item.id)
}

/// 浏览市场（本地存储）
pub fn browse_marketplace(category: Option<String>, search: Option<String>) -> Result<Vec<MarketplaceItem>, String> {
    let dir = marketplace_dir();
    if !std::path::Path::new(&dir).exists() {
        // 返回示例数据
        return Ok(get_sample_items());
    }

    let mut items: Vec<MarketplaceItem> = Vec::new();

    // 读取本地发布的
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(item) = serde_json::from_str::<MarketplaceItem>(&content) {
                    items.push(item);
                }
            }
        }
    }

    // 加入示例数据（如果本地没有太多）
    if items.len() < 5 {
        items.extend(get_sample_items());
    }

    // 按分类过滤
    if let Some(ref cat) = category {
        if !cat.is_empty() && cat != "全部" {
            items.retain(|i| i.category == *cat);
        }
    }

    // 按搜索词过滤
    if let Some(ref q) = search {
        if !q.is_empty() {
            let lower = q.to_lowercase();
            items.retain(|i| {
                i.name.to_lowercase().contains(&lower)
                    || i.description.to_lowercase().contains(&lower)
                    || i.tags.iter().any(|t| t.to_lowercase().contains(&lower))
            });
        }
    }

    // 按下载量排序
    items.sort_by(|a, b| b.downloads.cmp(&a.downloads));

    Ok(items)
}

/// 从市场下载（就是加载录制数据）
pub fn download_from_marketplace(item_id: &str) -> Result<MarketplaceItem, String> {
    let dir = marketplace_dir();
    let path = format!("{}/{}.json", dir, item_id);

    if std::path::Path::new(&path).exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let item: MarketplaceItem = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        return Ok(item);
    }

    // 从示例数据中查找
    get_sample_items()
        .into_iter()
        .find(|i| i.id == item_id)
        .ok_or_else(|| "任务不存在".to_string())
}

/// 获取分类列表
pub fn get_categories() -> Vec<String> {
    CATEGORIES.iter().map(|s| s.to_string()).collect()
}

/// 删除市场项
pub fn remove_from_marketplace(item_id: &str) -> Result<(), String> {
    let path = format!("{}/{}.json", marketplace_dir(), item_id);
    if std::path::Path::new(&path).exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 示例市场数据（展示市场功能）
fn get_sample_items() -> Vec<MarketplaceItem> {
    vec![
        MarketplaceItem {
            id: "sample_1".into(),
            name: "每日打开工作应用".into(),
            description: "自动打开微信、钉钉、Chrome、VS Code，适合开发者的每日早晨工作流".into(),
            author: "官方推荐".into(),
            category: "办公效率".into(),
            tags: vec!["工作".into(), "开发".into(), "自动化".into()],
            platform: "cross".into(),
            step_count: 4,
            duration_ms: 5000,
            downloads: 1280,
            rating: 4.8,
            created_at: "1710000000".into(),
            recording: None,
        },
        MarketplaceItem {
            id: "sample_2".into(),
            name: "清理桌面文件".into(),
            description: "将桌面上的文件按类型分类移动到对应文件夹（图片/文档/下载）".into(),
            author: "社区贡献".into(),
            category: "文件管理".into(),
            tags: vec!["清理".into(), "整理".into(), "桌面".into()],
            platform: "macos".into(),
            step_count: 12,
            duration_ms: 8000,
            downloads: 856,
            rating: 4.5,
            created_at: "1710100000".into(),
            recording: None,
        },
        MarketplaceItem {
            id: "sample_3".into(),
            name: "浏览器多标签打开".into(),
            description: "同时打开常用网站：Gmail、GitHub、Stack Overflow、掘金".into(),
            author: "开发者小王".into(),
            category: "浏览器".into(),
            tags: vec!["Chrome".into(), "浏览器".into(), "网站".into()],
            platform: "cross".into(),
            step_count: 8,
            duration_ms: 6000,
            downloads: 632,
            rating: 4.3,
            created_at: "1710200000".into(),
            recording: None,
        },
        MarketplaceItem {
            id: "sample_4".into(),
            name: "系统性能监控".into(),
            description: "打开活动监视器和终端，运行 top 命令监控系统资源".into(),
            author: "运维老张".into(),
            category: "系统管理".into(),
            tags: vec!["监控".into(), "系统".into(), "终端".into()],
            platform: "macos".into(),
            step_count: 6,
            duration_ms: 4000,
            downloads: 445,
            rating: 4.6,
            created_at: "1710300000".into(),
            recording: None,
        },
        MarketplaceItem {
            id: "sample_5".into(),
            name: "社交应用一键启动".into(),
            description: "同时打开微信、QQ、Telegram，适合社交达人".into(),
            author: "社区贡献".into(),
            category: "社交通讯".into(),
            tags: vec!["社交".into(), "微信".into(), "QQ".into()],
            platform: "cross".into(),
            step_count: 3,
            duration_ms: 3000,
            downloads: 920,
            rating: 4.7,
            created_at: "1710400000".into(),
            recording: None,
        },
        MarketplaceItem {
            id: "sample_6".into(),
            name: "设计工具集".into(),
            description: "打开 Figma、Sketch、Adobe XD，切换到设计工作区".into(),
            author: "设计师小李".into(),
            category: "设计创作".into(),
            tags: vec!["设计".into(), "Figma".into(), "UI".into()],
            platform: "macos".into(),
            step_count: 5,
            duration_ms: 5500,
            downloads: 378,
            rating: 4.4,
            created_at: "1710500000".into(),
            recording: None,
        },
    ]
}

/// 跨平台适配：将录制步骤标准化
pub fn normalize_recording(recording: &mut Recording, screen_width: f64, screen_height: f64) {
    for step in &mut recording.steps {
        match step {
            RecordedStep::MouseMove { x, y, .. } |
            RecordedStep::MouseClick { x, y, .. } |
            RecordedStep::MouseRelease { x, y, .. } => {
                // 转换为相对坐标 (0.0 ~ 1.0)
                *x = *x / screen_width;
                *y = *y / screen_height;
            }
            _ => {}
        }
    }
}

/// 反标准化：恢复到实际坐标
pub fn denormalize_recording(recording: &mut Recording, screen_width: f64, screen_height: f64) {
    for step in &mut recording.steps {
        match step {
            RecordedStep::MouseMove { x, y, .. } |
            RecordedStep::MouseClick { x, y, .. } |
            RecordedStep::MouseRelease { x, y, .. } => {
                *x = *x * screen_width;
                *y = *y * screen_height;
            }
            _ => {}
        }
    }
}
