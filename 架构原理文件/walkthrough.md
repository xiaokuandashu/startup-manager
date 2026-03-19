# Phase 2: 手机版 AI 助手 + WebSocket 中继

## 1. 手机端 AI 页面

重写 [ai_page.dart](file:///Users/a/Desktop/Ai_test/task-wizard-mobile/lib/pages/ai_page.dart)（804 行）

| 功能 | 说明 |
|------|------|
| 设备选择器 | 底部面板选择电脑，显示 🟢在线/⚪离线 |
| 模型面板 | 5个模型，标签"**电脑本地**"/"官方"/"自己" |
| 三开关 | 深度思考·智能搜索·本地执行 |
| 离线置灰 | 电脑离线 → 开关灰色禁用 + 本地模型🔒 |

````carousel
![电脑离线状态 — 开关置灰](/Users/a/.gemini/antigravity/brain/bdef9ae5-d77f-4895-9e63-9dbe68d200fe/mobile_ai_page_mockup_1773916891789.png)
<!-- slide -->
![模型面板 — 电脑本地模型锁定](/Users/a/.gemini/antigravity/brain/bdef9ae5-d77f-4895-9e63-9dbe68d200fe/model_panel_mockup_1773916923539.png)
````

---

## 2. 服务端 WebSocket 中继

新建 [ws_relay.ts](file:///Users/a/Desktop/Ai_test/server/src/ws_relay.ts)（305 行）

```mermaid
sequenceDiagram
    participant M as 📱 手机
    participant S as ☁️ 服务器 /ws
    participant P as 💻 电脑

    M->>S: auth {token, client_type:"mobile"}
    P->>S: auth {token, client_type:"pc", device_id}
    S-->>M: online_pcs [device_list]
    
    M->>S: ai_chat {message, model, device_id}
    S->>P: ai_chat {message, model, from:"mobile"}
    P->>S: ai_response {content}
    S-->>M: ai_response {content}
    
    Note over P: PC断开连接
    S-->>M: pc_offline {device_id}
```

| 消息类型 | 方向 | 用途 |
|----------|------|------|
| `auth` | 双向→服务器 | JWT认证，区分 pc/mobile |
| `ai_chat` | 手机→PC | AI对话中转 |
| `ai_response` | PC→手机 | AI回复转发 |
| `switch_model` | 手机→PC | 远程切换模型 |
| `toggle_feature` | 手机→PC | 远程开关(深度思考等) |
| `pc_online/pc_offline` | 服务器→手机 | 实时在线通知 |

---

## Git Commits

| Commit | 说明 |
|--------|------|
| `211a044` | feat: Phase 2 手机版 AI 助手页面 |
| `26cd865` | feat: 服务端 WebSocket 中继服务 |

> [!WARNING]
> 部署到服务器前需执行 `npm install ws` 安装依赖
