# Phase 3: 安卓版全面优化 — 14项需求

## 概述

将手机端从"原型展示"升级为"真实数据 + 完整功能"。核心思路：**PC→服务器→手机** 全链路数据同步。

> [!IMPORTANT]
> 当前设备数据 (`deviceListProvider`) 已经走 PC→服务器→手机 链路。但**任务概览、最近记录**是硬编码占位数据。本计划将全部接入真实数据。

---

## Batch A: 首页真实数据 + 排序 (需求 1-5)

### 现状分析

| 模块 | 当前状态 | 问题 |
|------|---------|------|
| 我的设备 | ✅ 已接入 `deviceListProvider` | 数据已是真实的（来自服务器 API） |
| 任务概览 | ❌ `'0'` 硬编码 | 需接入 PC 端任务数据 |
| 电脑状态 | ✅ 已接入 `activeDevice.cpu/memory/disk` | 数据已是真实的 |
| 最近记录 | ❌ 硬编码 4 条 demo | 需接入真实操作日志 |
| 页面顺序 | 设备→任务→电脑→记录 | 改为：设备→**设备状态**→任务→记录 |

### 具体改动

#### [MODIFY] [home_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/home_page.dart)

1. **调整顺序**: 我的设备 → 设备状态(原电脑状态) → 任务概览 → 最近记录
2. **"电脑状态"改名**: → "设备状态"
3. **任务概览**: 从服务器 API 获取任务统计（运行中/已完成/待执行）
4. **最近记录**: 从服务器 API 获取操作日志
5. **任务概览**添加点击进入二级页面（任务列表，与 PC 端首页任务功能对齐）

#### [NEW] [task_list_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/task_list_page.dart)

任务概览二级页面，展示完整任务列表（对齐 PC 端首页任务功能）：
- 任务列表（名称、状态、步骤数）
- 点击任务可查看详情
- 支持执行/停止任务

#### [MODIFY] [api_service.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/services/api_service.dart)

新增 API：
- `GET /api/tasks/summary` — 任务统计（运行中/已完成/待执行数量）
- `GET /api/tasks` — 任务列表
- `GET /api/activity-log` — 最近操作记录

#### [MODIFY] [devices.ts](file:///Users/a/Desktop/Ai_test/server/src/routes/devices.ts) (服务端)

新增 API 端点：
- `GET /api/tasks/summary` — 返回当前用户的任务统计
- `GET /api/activity-log` — 返回最近操作记录

#### [MODIFY] [app_localizations.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/l10n/app_localizations.dart)

- `computerStatus` → `deviceStatus`（"设备状态"）

---

## Batch B: AI 页面增强 (需求 6-8)

### 具体改动

#### [MODIFY] [ai_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/ai_page.dart)

**需求 6 — 语音输入 + 发送图片**
- 语音按钮：集成 `speech_to_text` 插件，录音 → 文字 → 发送
- 图片按钮：集成 `image_picker`，选图 → base64 → 通过 WS 发给 PC
- PC 端收到图片后处理（Phase 3.5+）

**需求 7 — 电脑在线状态检测**
- 已实现：PC 不在线时显示"电脑不在线，无法使用 AI 功能"提示 ✅
- 验证：确认 `deviceListProvider` 在线状态检测正确

**需求 8 — 远程下载模型**
- 当 PC 本地没有模型时，显示"帮电脑下载模型"按钮
- 点击后通过 WS 发送 `model_pull` 指令给 PC
- PC 端执行 `model_pull` 并通过 WS 回报下载进度/错误
- 手机端实时显示下载状态（进度条/完成/错误）

#### [MODIFY] [pubspec.yaml](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/pubspec.yaml)

新增依赖：
```yaml
speech_to_text: ^7.0.0
image_picker: ^1.1.0
```

---

## Batch C: 我的页面重构 (需求 9-13)

### 具体改动

#### [MODIFY] [profile_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/profile_page.dart)

**需求 9 — VIP 同步**
- 已部分实现：`authProvider` 有 `vipStatus/vipExpireDate`
- 补充：激活码激活后通过 API 同步到服务器 → PC 登录时也获取最新状态
- 确保 PC 端激活 → 手机端立即看到激活状态（通过 API 轮询或 WS 推送）

**需求 11 — 移除 "AI 模型设置" 区域**

**重构后的页面结构**：
1. 用户信息卡片（邮箱、VIP状态、设备数）
2. 会员管理（激活会员）
3. 设备管理 → 二级页面
4. ~~AI 模型设置~~ _(移除)_
5. 外观与语言 → 二级页面
6. 关于 → 二级页面
7. 退出登录

#### [NEW] [device_management_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/device_management_page.dart)

**需求 10 — 设备管理二级页面**
- 设备列表（名称、平台、在线状态、最后活跃时间）
- 设备数量统计（X/100台）
- 设备信息详情
- 设备退出登录（远程注销）
- 数据来源：`GET /api/devices`

#### [NEW] [appearance_language_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/appearance_language_page.dart)

**需求 12 — 外观+语言二级页面**
- 外观：亮色/暗色/跟随系统（已有功能搬移）
- 语言：6 种语言选择器
  - 中文、English、日本語、한국어、ภาษาไทย、Bahasa Malaysia

#### [NEW] [about_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/about_page.dart)

**需求 13 — 关于页面（仿绿联云风格）**
- App Logo（居中大图）
- "任务精灵 v1.0.0" 版本号
- 版本更新（检查最新版本 → 从服务器获取）
- 功能介绍
- 隐私协议（跳转 WebView 或服务器 URL）
- 用户协议（同上）

#### [MODIFY] [app_localizations.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/l10n/app_localizations.dart)

重大改造：支持 6 语言
```
zh — 中文
en — English
ja — 日本語
ko — 한국어
th — ภาษาไทย
ms — Bahasa Malaysia
```

改用 Map 结构存储所有翻译文本，替换当前简单的 `isZh ? '...' : '...'` 模式。

---

## Batch D: 服务端增强 (需求 14)

#### [MODIFY] [admin.ts](file:///Users/a/Desktop/Ai_test/server/src/routes/admin.ts)

新增安卓版发布功能：
- `GET /api/admin/updates` 增加 `platform: 'android'` 支持
- `POST /api/admin/updates` 支持安卓版发布（version, download_url, changelog）

#### [MODIFY] [db.ts](file:///Users/a/Desktop/Ai_test/server/src/db.ts)

`app_updates` 表已有 `platform` 字段，确保支持 `'android'` 值。

#### [NEW] 服务端 API

- `GET /api/updates/check?platform=android&version=1.0.0` — 手机检查更新

---

## Batch E: 数据同步验证

### 需要验证的数据链路

| 数据 | PC端 | 服务器 | 手机端 |
|------|------|--------|--------|
| 设备状态 | 心跳上报 CPU/内存/硬盘 | `devices` 表存储 | `deviceListProvider` 轮询 |
| 任务数据 | 录制/执行任务 | 新增任务 API | 新增任务 Provider |
| VIP 状态 | 激活码激活 | `users` 表 | `authProvider.vipStatus` |
| 操作日志 | 任务执行记录 | 新增日志 API | 首页最近记录 |
| 模型状态 | Ollama 模型列表 | WS 中继 | AI 页面模型列表 |

---

## 执行顺序

```
Batch A: 首页数据 (2-3小时) → 最优先
Batch C: 我的页面 (2-3小时) → 第二优先
Batch B: AI增强 (1-2小时) → 第三
Batch D: 服务端 (0.5小时) → 最后
Batch E: 全链路验证 → 贯穿始终
```

## 验证计划

### 自动验证
- `flutter build apk --release` — 安卓构建通过
- `cd server && npm run build` — 服务端编译通过

### 手动验证（需要用户配合）
1. **首页**: PC 登录后，手机首页应显示真实 CPU/内存/硬盘 数据
2. **任务概览**: PC 端有任务时，手机端显示对应数量
3. **AI 图片**: 手机发送图片后，PC 端应能收到
4. **VIP 同步**: PC 端激活 VIP → 手机端刷新后显示激活状态
5. **设备管理**: 查看所有设备列表，支持远程退出登录
6. **多语言**: 切换到日语/韩语/泰语/马来语检查文本显示
7. **关于页面**: 检查版本号、协议链接是否正确
