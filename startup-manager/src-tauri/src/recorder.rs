use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// 录制的事件类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RecordedStep {
    #[serde(rename = "mouse_move")]
    MouseMove { x: f64, y: f64, delay_ms: u64 },

    #[serde(rename = "mouse_click")]
    MouseClick { button: String, x: f64, y: f64, delay_ms: u64 },

    #[serde(rename = "mouse_release")]
    MouseRelease { button: String, x: f64, y: f64, delay_ms: u64 },

    #[serde(rename = "mouse_scroll")]
    MouseScroll { delta_x: i64, delta_y: i64, delay_ms: u64 },

    #[serde(rename = "key_press")]
    KeyPress { key: String, delay_ms: u64 },

    #[serde(rename = "key_release")]
    KeyRelease { key: String, delay_ms: u64 },
}

/// 一次完整录制
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recording {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub duration_ms: u64,
    pub step_count: usize,
    pub steps: Vec<RecordedStep>,
}

/// 录制状态
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RecordingState {
    Idle,
    Recording,
    Paused,
}

/// 全局录制管理器
pub struct RecordingManager {
    pub state: RecordingState,
    pub steps: Vec<RecordedStep>,
    pub start_time: Option<Instant>,
    pub last_event_time: Option<Instant>,
    pub pause_duration: Duration,
    pub pause_start: Option<Instant>,
    last_mouse_x: f64,
    last_mouse_y: f64,
    move_threshold: f64,
}

impl RecordingManager {
    pub fn new() -> Self {
        Self {
            state: RecordingState::Idle,
            steps: Vec::new(),
            start_time: None,
            last_event_time: None,
            pause_duration: Duration::ZERO,
            pause_start: None,
            last_mouse_x: 0.0,
            last_mouse_y: 0.0,
            move_threshold: 5.0, // 忽略 <5px 的微小移动
        }
    }

    pub fn start(&mut self) {
        self.state = RecordingState::Recording;
        self.steps.clear();
        self.start_time = Some(Instant::now());
        self.last_event_time = Some(Instant::now());
        self.pause_duration = Duration::ZERO;
        self.pause_start = None;
        self.last_mouse_x = 0.0;
        self.last_mouse_y = 0.0;
    }

    pub fn pause(&mut self) {
        if self.state == RecordingState::Recording {
            self.state = RecordingState::Paused;
            self.pause_start = Some(Instant::now());
        }
    }

    pub fn resume(&mut self) {
        if self.state == RecordingState::Paused {
            if let Some(ps) = self.pause_start {
                self.pause_duration += ps.elapsed();
            }
            self.pause_start = None;
            self.state = RecordingState::Recording;
            self.last_event_time = Some(Instant::now());
        }
    }

    pub fn stop(&mut self) -> Vec<RecordedStep> {
        self.state = RecordingState::Idle;
        self.optimize_steps();
        std::mem::take(&mut self.steps)
    }

    fn get_delay(&mut self) -> u64 {
        let now = Instant::now();
        let delay = if let Some(last) = self.last_event_time {
            now.duration_since(last).as_millis() as u64
        } else {
            0
        };
        self.last_event_time = Some(now);
        delay.min(5000) // 最大延迟 5 秒
    }

    pub fn on_mouse_move(&mut self, x: f64, y: f64) {
        if self.state != RecordingState::Recording { return; }

        // 忽略微小移动
        let dx = (x - self.last_mouse_x).abs();
        let dy = (y - self.last_mouse_y).abs();
        if dx < self.move_threshold && dy < self.move_threshold { return; }

        let delay = self.get_delay();
        self.last_mouse_x = x;
        self.last_mouse_y = y;

        self.steps.push(RecordedStep::MouseMove {
            x, y, delay_ms: delay,
        });
    }

    pub fn on_mouse_click(&mut self, button: &str, x: f64, y: f64) {
        if self.state != RecordingState::Recording { return; }
        let delay = self.get_delay();
        self.last_mouse_x = x;
        self.last_mouse_y = y;

        self.steps.push(RecordedStep::MouseClick {
            button: button.to_string(), x, y, delay_ms: delay,
        });
    }

    pub fn on_mouse_release(&mut self, button: &str, x: f64, y: f64) {
        if self.state != RecordingState::Recording { return; }
        let delay = self.get_delay();

        self.steps.push(RecordedStep::MouseRelease {
            button: button.to_string(), x, y, delay_ms: delay,
        });
    }

    pub fn on_scroll(&mut self, delta_x: i64, delta_y: i64) {
        if self.state != RecordingState::Recording { return; }
        let delay = self.get_delay();

        self.steps.push(RecordedStep::MouseScroll {
            delta_x, delta_y, delay_ms: delay,
        });
    }

    pub fn on_key_press(&mut self, key: &str) {
        if self.state != RecordingState::Recording { return; }
        let delay = self.get_delay();

        self.steps.push(RecordedStep::KeyPress {
            key: key.to_string(), delay_ms: delay,
        });
    }

    pub fn on_key_release(&mut self, key: &str) {
        if self.state != RecordingState::Recording { return; }
        let delay = self.get_delay();

        self.steps.push(RecordedStep::KeyRelease {
            key: key.to_string(), delay_ms: delay,
        });
    }

    fn total_duration(&self) -> u64 {
        if let Some(start) = self.start_time {
            let elapsed = start.elapsed();
            (elapsed - self.pause_duration).as_millis() as u64
        } else {
            0
        }
    }

    /// 优化步骤：合并连续鼠标移动、压缩延迟
    fn optimize_steps(&mut self) {
        if self.steps.is_empty() { return; }

        let mut optimized: Vec<RecordedStep> = Vec::new();

        for step in &self.steps {
            match step {
                RecordedStep::MouseMove { x, y, delay_ms } => {
                    // 合并连续鼠标移动：只保留最后一个位置
                    if let Some(RecordedStep::MouseMove { .. }) = optimized.last() {
                        if *delay_ms < 50 {
                            // 非常快的连续移动，替换为最新位置
                            let last = optimized.last_mut().unwrap();
                            if let RecordedStep::MouseMove { x: lx, y: ly, .. } = last {
                                *lx = *x;
                                *ly = *y;
                                continue;
                            }
                        }
                    }
                    optimized.push(step.clone());
                }
                _ => {
                    optimized.push(step.clone());
                }
            }
        }

        self.steps = optimized;
    }
}

/// rdev 按键名转换为可序列化字符串
pub fn rdev_key_to_string(key: &rdev::Key) -> String {
    match key {
        rdev::Key::Alt => "Alt".into(),
        rdev::Key::AltGr => "AltGr".into(),
        rdev::Key::Backspace => "Backspace".into(),
        rdev::Key::CapsLock => "CapsLock".into(),
        rdev::Key::ControlLeft => "CtrlLeft".into(),
        rdev::Key::ControlRight => "CtrlRight".into(),
        rdev::Key::Delete => "Delete".into(),
        rdev::Key::DownArrow => "Down".into(),
        rdev::Key::End => "End".into(),
        rdev::Key::Escape => "Escape".into(),
        rdev::Key::F1 => "F1".into(),
        rdev::Key::F2 => "F2".into(),
        rdev::Key::F3 => "F3".into(),
        rdev::Key::F4 => "F4".into(),
        rdev::Key::F5 => "F5".into(),
        rdev::Key::F6 => "F6".into(),
        rdev::Key::F7 => "F7".into(),
        rdev::Key::F8 => "F8".into(),
        rdev::Key::F9 => "F9".into(),
        rdev::Key::F10 => "F10".into(),
        rdev::Key::F11 => "F11".into(),
        rdev::Key::F12 => "F12".into(),
        rdev::Key::Home => "Home".into(),
        rdev::Key::LeftArrow => "Left".into(),
        rdev::Key::MetaLeft => "MetaLeft".into(),
        rdev::Key::MetaRight => "MetaRight".into(),
        rdev::Key::PageDown => "PageDown".into(),
        rdev::Key::PageUp => "PageUp".into(),
        rdev::Key::Return => "Enter".into(),
        rdev::Key::RightArrow => "Right".into(),
        rdev::Key::ShiftLeft => "ShiftLeft".into(),
        rdev::Key::ShiftRight => "ShiftRight".into(),
        rdev::Key::Space => "Space".into(),
        rdev::Key::Tab => "Tab".into(),
        rdev::Key::UpArrow => "Up".into(),
        rdev::Key::PrintScreen => "PrintScreen".into(),
        rdev::Key::ScrollLock => "ScrollLock".into(),
        rdev::Key::Pause => "Pause".into(),
        rdev::Key::NumLock => "NumLock".into(),
        rdev::Key::BackQuote => "`".into(),
        rdev::Key::Num1 => "1".into(),
        rdev::Key::Num2 => "2".into(),
        rdev::Key::Num3 => "3".into(),
        rdev::Key::Num4 => "4".into(),
        rdev::Key::Num5 => "5".into(),
        rdev::Key::Num6 => "6".into(),
        rdev::Key::Num7 => "7".into(),
        rdev::Key::Num8 => "8".into(),
        rdev::Key::Num9 => "9".into(),
        rdev::Key::Num0 => "0".into(),
        rdev::Key::Minus => "-".into(),
        rdev::Key::Equal => "=".into(),
        rdev::Key::KeyQ => "Q".into(),
        rdev::Key::KeyW => "W".into(),
        rdev::Key::KeyE => "E".into(),
        rdev::Key::KeyR => "R".into(),
        rdev::Key::KeyT => "T".into(),
        rdev::Key::KeyY => "Y".into(),
        rdev::Key::KeyU => "U".into(),
        rdev::Key::KeyI => "I".into(),
        rdev::Key::KeyO => "O".into(),
        rdev::Key::KeyP => "P".into(),
        rdev::Key::LeftBracket => "[".into(),
        rdev::Key::RightBracket => "]".into(),
        rdev::Key::KeyA => "A".into(),
        rdev::Key::KeyS => "S".into(),
        rdev::Key::KeyD => "D".into(),
        rdev::Key::KeyF => "F".into(),
        rdev::Key::KeyG => "G".into(),
        rdev::Key::KeyH => "H".into(),
        rdev::Key::KeyJ => "J".into(),
        rdev::Key::KeyK => "K".into(),
        rdev::Key::KeyL => "L".into(),
        rdev::Key::SemiColon => ";".into(),
        rdev::Key::Quote => "'".into(),
        rdev::Key::BackSlash => "\\".into(),
        rdev::Key::KeyZ => "Z".into(),
        rdev::Key::KeyX => "X".into(),
        rdev::Key::KeyC => "C".into(),
        rdev::Key::KeyV => "V".into(),
        rdev::Key::KeyB => "B".into(),
        rdev::Key::KeyN => "N".into(),
        rdev::Key::KeyM => "M".into(),
        rdev::Key::Comma => ",".into(),
        rdev::Key::Dot => ".".into(),
        rdev::Key::Slash => "/".into(),
        rdev::Key::Insert => "Insert".into(),
        rdev::Key::KpReturn => "KpEnter".into(),
        rdev::Key::KpMinus => "Kp-".into(),
        rdev::Key::KpPlus => "Kp+".into(),
        rdev::Key::KpMultiply => "Kp*".into(),
        rdev::Key::KpDivide => "Kp/".into(),
        rdev::Key::Kp0 => "Kp0".into(),
        rdev::Key::Kp1 => "Kp1".into(),
        rdev::Key::Kp2 => "Kp2".into(),
        rdev::Key::Kp3 => "Kp3".into(),
        rdev::Key::Kp4 => "Kp4".into(),
        rdev::Key::Kp5 => "Kp5".into(),
        rdev::Key::Kp6 => "Kp6".into(),
        rdev::Key::Kp7 => "Kp7".into(),
        rdev::Key::Kp8 => "Kp8".into(),
        rdev::Key::Kp9 => "Kp9".into(),
        rdev::Key::KpDelete => "KpDel".into(),
        rdev::Key::Function => "Fn".into(),
        rdev::Key::Unknown(code) => format!("Unknown({})", code),
        _ => format!("{:?}", key),
    }
}

/// rdev 鼠标按键转字符串
pub fn rdev_button_to_string(button: &rdev::Button) -> String {
    match button {
        rdev::Button::Left => "left".into(),
        rdev::Button::Right => "right".into(),
        rdev::Button::Middle => "middle".into(),
        rdev::Button::Unknown(n) => format!("button{}", n),
    }
}

/// 全局录制管理器（线程安全）
lazy_static::lazy_static! {
    pub static ref RECORDER: Arc<Mutex<RecordingManager>> = Arc::new(Mutex::new(RecordingManager::new()));
}

/// 录制状态信息（返回给前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStatus {
    pub state: String,
    pub step_count: usize,
    pub duration_ms: u64,
}

pub fn get_status() -> RecordingStatus {
    let mgr = RECORDER.lock().unwrap();
    RecordingStatus {
        state: match mgr.state {
            RecordingState::Idle => "idle".to_string(),
            RecordingState::Recording => "recording".to_string(),
            RecordingState::Paused => "paused".to_string(),
        },
        step_count: mgr.steps.len(),
        duration_ms: mgr.total_duration(),
    }
}

/// 开始录制 — 启动 rdev 监听线程
pub fn start_recording() -> Result<(), String> {
    {
        let mut mgr = RECORDER.lock().map_err(|e| e.to_string())?;
        if mgr.state != RecordingState::Idle {
            return Err("Already recording".into());
        }
        mgr.start();
    }

    // 在单独线程启动 rdev 监听
    std::thread::spawn(move || {
        let callback = move |event: rdev::Event| {
            let mut mgr = match RECORDER.lock() {
                Ok(m) => m,
                Err(_) => return,
            };

            if mgr.state != RecordingState::Recording {
                return;
            }

            match event.event_type {
                rdev::EventType::MouseMove { x, y } => {
                    mgr.on_mouse_move(x, y);
                }
                rdev::EventType::ButtonPress(btn) => {
                    let btn_str = rdev_button_to_string(&btn);
                    // 获取当前鼠标位置
                    let x = mgr.last_mouse_x;
                    let y = mgr.last_mouse_y;
                    mgr.on_mouse_click(&btn_str, x, y);
                }
                rdev::EventType::ButtonRelease(btn) => {
                    let btn_str = rdev_button_to_string(&btn);
                    let x = mgr.last_mouse_x;
                    let y = mgr.last_mouse_y;
                    mgr.on_mouse_release(&btn_str, x, y);
                }
                rdev::EventType::Wheel { delta_x, delta_y } => {
                    mgr.on_scroll(delta_x, delta_y);
                }
                rdev::EventType::KeyPress(key) => {
                    let key_str = rdev_key_to_string(&key);
                    mgr.on_key_press(&key_str);
                }
                rdev::EventType::KeyRelease(key) => {
                    let key_str = rdev_key_to_string(&key);
                    mgr.on_key_release(&key_str);
                }
            }
        };

        // rdev::listen 会阻塞当前线程
        if let Err(e) = rdev::listen(callback) {
            eprintln!("rdev listen error: {:?}", e);
        }
    });

    Ok(())
}

/// 停止录制，返回步骤
pub fn stop_recording() -> Result<Vec<RecordedStep>, String> {
    let mut mgr = RECORDER.lock().map_err(|e| e.to_string())?;
    if mgr.state == RecordingState::Idle {
        return Err("Not recording".into());
    }
    Ok(mgr.stop())
}

/// 暂停/恢复
pub fn toggle_pause() -> Result<String, String> {
    let mut mgr = RECORDER.lock().map_err(|e| e.to_string())?;
    match mgr.state {
        RecordingState::Recording => {
            mgr.pause();
            Ok("paused".into())
        }
        RecordingState::Paused => {
            mgr.resume();
            Ok("recording".into())
        }
        _ => Err("Not in a recording session".into()),
    }
}

/// 回放录制（在新线程执行）
pub fn play_recording(steps: Vec<RecordedStep>) -> Result<(), String> {
    std::thread::spawn(move || {
        // 开始回放前等待 1 秒
        std::thread::sleep(Duration::from_secs(1));

        for step in &steps {
            match step {
                RecordedStep::MouseMove { x, y, delay_ms } => {
                    std::thread::sleep(Duration::from_millis(*delay_ms));
                    let _ = rdev::simulate(&rdev::EventType::MouseMove {
                        x: *x, y: *y,
                    });
                }
                RecordedStep::MouseClick { button, x, y, delay_ms } => {
                    std::thread::sleep(Duration::from_millis(*delay_ms));
                    // 先移动到位置
                    let _ = rdev::simulate(&rdev::EventType::MouseMove {
                        x: *x, y: *y,
                    });
                    std::thread::sleep(Duration::from_millis(10));
                    let btn = match button.as_str() {
                        "right" => rdev::Button::Right,
                        "middle" => rdev::Button::Middle,
                        _ => rdev::Button::Left,
                    };
                    let _ = rdev::simulate(&rdev::EventType::ButtonPress(btn));
                }
                RecordedStep::MouseRelease { button, delay_ms, .. } => {
                    std::thread::sleep(Duration::from_millis(*delay_ms));
                    let btn = match button.as_str() {
                        "right" => rdev::Button::Right,
                        "middle" => rdev::Button::Middle,
                        _ => rdev::Button::Left,
                    };
                    let _ = rdev::simulate(&rdev::EventType::ButtonRelease(btn));
                }
                RecordedStep::MouseScroll { delta_x, delta_y, delay_ms } => {
                    std::thread::sleep(Duration::from_millis(*delay_ms));
                    let _ = rdev::simulate(&rdev::EventType::Wheel {
                        delta_x: *delta_x, delta_y: *delta_y,
                    });
                }
                RecordedStep::KeyPress { key, delay_ms } => {
                    std::thread::sleep(Duration::from_millis(*delay_ms));
                    if let Some(rkey) = string_to_rdev_key(key) {
                        let _ = rdev::simulate(&rdev::EventType::KeyPress(rkey));
                    }
                }
                RecordedStep::KeyRelease { key, delay_ms } => {
                    std::thread::sleep(Duration::from_millis(*delay_ms));
                    if let Some(rkey) = string_to_rdev_key(key) {
                        let _ = rdev::simulate(&rdev::EventType::KeyRelease(rkey));
                    }
                }
            }
        }
    });

    Ok(())
}

/// 字符串转回 rdev::Key
fn string_to_rdev_key(s: &str) -> Option<rdev::Key> {
    match s {
        "Alt" => Some(rdev::Key::Alt),
        "Backspace" => Some(rdev::Key::Backspace),
        "CapsLock" => Some(rdev::Key::CapsLock),
        "CtrlLeft" => Some(rdev::Key::ControlLeft),
        "CtrlRight" => Some(rdev::Key::ControlRight),
        "Delete" => Some(rdev::Key::Delete),
        "Down" => Some(rdev::Key::DownArrow),
        "End" => Some(rdev::Key::End),
        "Escape" => Some(rdev::Key::Escape),
        "Enter" => Some(rdev::Key::Return),
        "Home" => Some(rdev::Key::Home),
        "Left" => Some(rdev::Key::LeftArrow),
        "Right" => Some(rdev::Key::RightArrow),
        "Up" => Some(rdev::Key::UpArrow),
        "ShiftLeft" => Some(rdev::Key::ShiftLeft),
        "ShiftRight" => Some(rdev::Key::ShiftRight),
        "Space" => Some(rdev::Key::Space),
        "Tab" => Some(rdev::Key::Tab),
        "MetaLeft" => Some(rdev::Key::MetaLeft),
        "MetaRight" => Some(rdev::Key::MetaRight),
        "F1" => Some(rdev::Key::F1),
        "F2" => Some(rdev::Key::F2),
        "F3" => Some(rdev::Key::F3),
        "F4" => Some(rdev::Key::F4),
        "F5" => Some(rdev::Key::F5),
        "F6" => Some(rdev::Key::F6),
        "F7" => Some(rdev::Key::F7),
        "F8" => Some(rdev::Key::F8),
        "F9" => Some(rdev::Key::F9),
        "F10" => Some(rdev::Key::F10),
        "F11" => Some(rdev::Key::F11),
        "F12" => Some(rdev::Key::F12),
        "A" => Some(rdev::Key::KeyA),
        "B" => Some(rdev::Key::KeyB),
        "C" => Some(rdev::Key::KeyC),
        "D" => Some(rdev::Key::KeyD),
        "E" => Some(rdev::Key::KeyE),
        "F" => Some(rdev::Key::KeyF),
        "G" => Some(rdev::Key::KeyG),
        "H" => Some(rdev::Key::KeyH),
        "I" => Some(rdev::Key::KeyI),
        "J" => Some(rdev::Key::KeyJ),
        "K" => Some(rdev::Key::KeyK),
        "L" => Some(rdev::Key::KeyL),
        "M" => Some(rdev::Key::KeyM),
        "N" => Some(rdev::Key::KeyN),
        "O" => Some(rdev::Key::KeyO),
        "P" => Some(rdev::Key::KeyP),
        "Q" => Some(rdev::Key::KeyQ),
        "R" => Some(rdev::Key::KeyR),
        "S" => Some(rdev::Key::KeyS),
        "T" => Some(rdev::Key::KeyT),
        "U" => Some(rdev::Key::KeyU),
        "V" => Some(rdev::Key::KeyV),
        "W" => Some(rdev::Key::KeyW),
        "X" => Some(rdev::Key::KeyX),
        "Y" => Some(rdev::Key::KeyY),
        "Z" => Some(rdev::Key::KeyZ),
        "0" => Some(rdev::Key::Num0),
        "1" => Some(rdev::Key::Num1),
        "2" => Some(rdev::Key::Num2),
        "3" => Some(rdev::Key::Num3),
        "4" => Some(rdev::Key::Num4),
        "5" => Some(rdev::Key::Num5),
        "6" => Some(rdev::Key::Num6),
        "7" => Some(rdev::Key::Num7),
        "8" => Some(rdev::Key::Num8),
        "9" => Some(rdev::Key::Num9),
        "-" => Some(rdev::Key::Minus),
        "=" => Some(rdev::Key::Equal),
        "[" => Some(rdev::Key::LeftBracket),
        "]" => Some(rdev::Key::RightBracket),
        ";" => Some(rdev::Key::SemiColon),
        "'" => Some(rdev::Key::Quote),
        "\\" => Some(rdev::Key::BackSlash),
        "," => Some(rdev::Key::Comma),
        "." => Some(rdev::Key::Dot),
        "/" => Some(rdev::Key::Slash),
        "`" => Some(rdev::Key::BackQuote),
        "PageUp" => Some(rdev::Key::PageUp),
        "PageDown" => Some(rdev::Key::PageDown),
        _ => None,
    }
}

/// 保存录制到本地文件
pub fn save_recording_to_file(recording: &Recording) -> Result<String, String> {
    let dir = dirs_config_path();
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let path = format!("{}/{}.json", dir, recording.id);
    let json = serde_json::to_string_pretty(recording).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("保存失败: {}", e))?;
    Ok(path)
}

/// 从本地读取所有录制
pub fn list_recordings() -> Result<Vec<Recording>, String> {
    let dir = dirs_config_path();
    if !std::path::Path::new(&dir).exists() {
        return Ok(vec![]);
    }

    let mut recordings = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "json").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(rec) = serde_json::from_str::<Recording>(&content) {
                    recordings.push(rec);
                }
            }
        }
    }
    recordings.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(recordings)
}

/// 删除录制
pub fn delete_recording(id: &str) -> Result<(), String> {
    let path = format!("{}/{}.json", dirs_config_path(), id);
    if std::path::Path::new(&path).exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 获取录制存储目录
fn dirs_config_path() -> String {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        format!("{}/Library/Application Support/com.a.startup-manager/recordings", home)
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\".to_string());
        format!("{}\\startup-manager\\recordings", appdata)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        format!("{}/.config/startup-manager/recordings", home)
    }
}
