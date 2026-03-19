#!/bin/bash
# 打开QQ音乐 - 测试脚本
# 用于在任务精灵中测试定时执行功能
echo "正在打开QQ音乐..."
open -a "QQMusic" 2>/dev/null || open -a "QQ音乐" 2>/dev/null || echo "未找到QQ音乐，请确认已安装"
echo "脚本执行完成"
