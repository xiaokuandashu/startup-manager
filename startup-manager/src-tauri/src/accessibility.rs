use serde::{Deserialize, Serialize};

/// UI 元素信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiElementInfo {
    pub role: String,       // 元素角色: button, textfield, menu, etc.
    pub title: String,      // 元素标题
    pub label: String,      // 辅助标签
    pub value: String,      // 当前值
    pub position: (f64, f64), // 位置
    pub size: (f64, f64),   // 大小
}

/// 窗口信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub bundle_id: String,
    pub pid: u32,
    pub position: (f64, f64),
    pub size: (f64, f64),
}

/// 获取当前焦点窗口信息（macOS）
#[cfg(target_os = "macos")]
pub fn get_focused_window() -> Result<WindowInfo, String> {
    use std::process::Command;

    // 使用 AppleScript 获取当前焦点应用信息
    let script = r#"
    tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set bundleId to bundle identifier of frontApp
        set appPid to unix id of frontApp
        try
            set winTitle to name of front window of frontApp
        on error
            set winTitle to ""
        end try
        try
            set winPos to position of front window of frontApp
            set winSize to size of front window of frontApp
            return appName & "|" & bundleId & "|" & appPid & "|" & winTitle & "|" & (item 1 of winPos) & "," & (item 2 of winPos) & "|" & (item 1 of winSize) & "," & (item 2 of winSize)
        on error
            return appName & "|" & bundleId & "|" & appPid & "|" & winTitle & "|0,0|0,0"
        end try
    end tell
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("AppleScript 执行失败: {}", e))?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if result.is_empty() {
        return Err("无法获取焦点窗口".into());
    }

    let parts: Vec<&str> = result.split('|').collect();
    if parts.len() < 6 {
        return Err(format!("解析失败: {}", result));
    }

    let pos = parse_point(parts[4]);
    let size = parse_point(parts[5]);

    Ok(WindowInfo {
        app_name: parts[0].to_string(),
        window_title: parts[3].to_string(),
        bundle_id: parts[1].to_string(),
        pid: parts[2].parse().unwrap_or(0),
        position: pos,
        size,
    })
}

/// 获取鼠标位置下的 UI 元素信息（macOS）
#[cfg(target_os = "macos")]
pub fn get_element_at_mouse() -> Result<UiElementInfo, String> {
    use std::process::Command;

    // 使用 AppleScript 获取鼠标下的元素
    let script = r#"
    tell application "System Events"
        set frontApp to first application process whose frontmost is true
        try
            set focusedElem to focused UI element of frontApp
            set elemRole to role of focusedElem
            set elemTitle to ""
            try
                set elemTitle to title of focusedElem
            end try
            set elemDesc to ""
            try
                set elemDesc to description of focusedElem
            end try
            set elemValue to ""
            try
                set elemValue to value of focusedElem as text
            end try
            set elemPos to {0, 0}
            try
                set elemPos to position of focusedElem
            end try
            set elemSize to {0, 0}
            try
                set elemSize to size of focusedElem
            end try
            return elemRole & "|" & elemTitle & "|" & elemDesc & "|" & elemValue & "|" & (item 1 of elemPos) & "," & (item 2 of elemPos) & "|" & (item 1 of elemSize) & "," & (item 2 of elemSize)
        on error errMsg
            return "unknown|||" & errMsg & "|0,0|0,0"
        end try
    end tell
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("AppleScript 执行失败: {}", e))?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if result.is_empty() {
        return Ok(UiElementInfo {
            role: "unknown".into(),
            title: "".into(),
            label: "".into(),
            value: "".into(),
            position: (0.0, 0.0),
            size: (0.0, 0.0),
        });
    }

    let parts: Vec<&str> = result.split('|').collect();
    if parts.len() < 6 {
        return Ok(UiElementInfo {
            role: result.clone(),
            title: "".into(),
            label: "".into(),
            value: "".into(),
            position: (0.0, 0.0),
            size: (0.0, 0.0),
        });
    }

    let pos = parse_point(parts[4]);
    let size = parse_point(parts[5]);

    Ok(UiElementInfo {
        role: parts[0].to_string(),
        title: parts[1].to_string(),
        label: parts[2].to_string(),
        value: parts[3].to_string(),
        position: pos,
        size,
    })
}

/// Windows 平台 — 获取焦点窗口
#[cfg(target_os = "windows")]
pub fn get_focused_window() -> Result<WindowInfo, String> {
    use std::process::Command;

    // PowerShell 获取前台窗口
    let script = r#"
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
        [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    }
"@
    $h = [Win32]::GetForegroundWindow()
    $sb = New-Object System.Text.StringBuilder 256
    [void][Win32]::GetWindowText($h, $sb, $sb.Capacity)
    $pid = 0; [void][Win32]::GetWindowThreadProcessId($h, [ref]$pid)
    $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
    "$($p.ProcessName)|$($p.Id)|$($sb.ToString())"
    "#;

    let output = Command::new("powershell")
        .args(["-Command", script])
        .output()
        .map_err(|e| format!("PowerShell 执行失败: {}", e))?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = result.split('|').collect();

    Ok(WindowInfo {
        app_name: parts.first().unwrap_or(&"").to_string(),
        bundle_id: "".into(),
        pid: parts.get(1).unwrap_or(&"0").parse().unwrap_or(0),
        window_title: parts.get(2).unwrap_or(&"").to_string(),
        position: (0.0, 0.0),
        size: (0.0, 0.0),
    })
}

/// Windows 平台 — 获取焦点元素
#[cfg(target_os = "windows")]
pub fn get_element_at_mouse() -> Result<UiElementInfo, String> {
    Ok(UiElementInfo {
        role: "unknown".into(),
        title: "".into(),
        label: "Windows UI Automation 待实现".into(),
        value: "".into(),
        position: (0.0, 0.0),
        size: (0.0, 0.0),
    })
}

/// 解析 "x,y" 坐标
fn parse_point(s: &str) -> (f64, f64) {
    let parts: Vec<&str> = s.trim().split(',').collect();
    let x = parts.first().unwrap_or(&"0").trim().parse::<f64>().unwrap_or(0.0);
    let y = parts.get(1).unwrap_or(&"0").trim().parse::<f64>().unwrap_or(0.0);
    (x, y)
}

/// 检查辅助功能权限（macOS）
#[cfg(target_os = "macos")]
pub fn check_accessibility_permission() -> bool {
    use std::process::Command;
    // 尝试运行一个简单的 AppleScript 来检测
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of first application process whose frontmost is true")
        .output();

    match output {
        Ok(o) => o.status.success(),
        Err(_) => false,
    }
}

#[cfg(target_os = "windows")]
pub fn check_accessibility_permission() -> bool {
    true // Windows 不需要特殊权限
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn check_accessibility_permission() -> bool {
    false
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn get_focused_window() -> Result<WindowInfo, String> {
    Err("不支持的平台".into())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn get_element_at_mouse() -> Result<UiElementInfo, String> {
    Err("不支持的平台".into())
}
