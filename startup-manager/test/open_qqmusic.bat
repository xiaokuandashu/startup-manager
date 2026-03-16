@echo off
rem 打开QQ音乐 - 测试脚本
rem 用于在自启精灵中测试定时执行功能
echo 正在打开QQ音乐...
start "" "C:\Program Files (x86)\Tencent\QQMusic\QQMusic.exe"
if errorlevel 1 (
    echo QQ音乐路径未找到，尝试备用路径...
    start "" "%LOCALAPPDATA%\Programs\QQMusic\QQMusic.exe"
)
echo 脚本执行完成
