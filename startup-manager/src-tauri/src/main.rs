// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Windows: 写入启动日志 + 捕获所有错误
    #[cfg(target_os = "windows")]
    {
        // 先写一个标记文件，证明程序开始运行了
        let log_path = std::env::current_exe()
            .unwrap_or_default()
            .parent()
            .map(|p| p.join("startup.log"))
            .unwrap_or_else(|| std::path::PathBuf::from("startup.log"));
        let _ = std::fs::write(&log_path, format!(
            "任务精灵启动中...\n时间: {:?}\n路径: {:?}\n",
            std::time::SystemTime::now(),
            std::env::current_exe().unwrap_or_default()
        ));

        // 设置全局 panic handler: 弹窗 + 写日志
        std::panic::set_hook(Box::new(|info| {
            let msg = format!("任务精灵崩溃:\n{}", info);
            let crash_path = std::env::current_exe()
                .unwrap_or_default()
                .parent()
                .map(|p| p.join("crash.log"))
                .unwrap_or_else(|| std::path::PathBuf::from("crash.log"));
            let _ = std::fs::write(&crash_path, &msg);

            // 弹窗显示错误
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            let wide_msg: Vec<u16> = OsStr::new(&msg).encode_wide().chain(Some(0)).collect();
            let wide_title: Vec<u16> = OsStr::new("任务精灵 - 错误").encode_wide().chain(Some(0)).collect();
            unsafe {
                extern "system" {
                    fn MessageBoxW(hwnd: *const (), text: *const u16, caption: *const u16, utype: u32) -> i32;
                }
                MessageBoxW(std::ptr::null(), wide_msg.as_ptr(), wide_title.as_ptr(), 0x10);
            }
        }));
    }

    startup_manager_lib::run()
}
