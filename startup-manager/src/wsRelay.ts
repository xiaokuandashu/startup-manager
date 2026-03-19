/**
 * WS 中继客户端 — 电脑端连接服务器 /ws
 * 
 * 功能：
 * 1. JWT 认证（client_type: 'pc'）
 * 2. 接收手机端指令（ai_chat, switch_model, toggle_feature, key_updated）
 * 3. 处理指令 → 返回结果给手机
 * 4. 自动重连 + 心跳
 */

const WS_URL = 'wss://bt.aacc.fun:8888/ws';
const HEARTBEAT_INTERVAL = 15000;
const RECONNECT_DELAY = 5000;

type WsHandler = (msg: any) => void;

class WsRelayClient {
  private ws: WebSocket | null = null;
  private token: string = '';
  private deviceId: string = '';
  private heartbeatTimer: any = null;
  private reconnectTimer: any = null;
  private isConnected = false;
  private isAuthenticated = false;
  private handlers: Map<string, WsHandler[]> = new Map();
  private statusListeners: ((connected: boolean) => void)[] = [];

  /** 连接到服务器中继 */
  connect(token: string, deviceId: string) {
    this.token = token;
    this.deviceId = deviceId;
    this._connect();
  }

  private _connect() {
    if (!this.token || !this.deviceId) return;
    
    try {
      this.disconnect(false);
      this.ws = new WebSocket(WS_URL);
      
      this.ws.onopen = () => {
        console.log('[WS中继] 已连接，发送认证...');
        this.isConnected = true;
        
        // 发送认证
        this.ws?.send(JSON.stringify({
          type: 'auth',
          token: this.token,
          client_type: 'pc',
          device_id: this.deviceId,
        }));
        
        this._startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          console.error('[WS中继] 消息解析错误', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS中继] 连接断开');
        this.isConnected = false;
        this.isAuthenticated = false;
        this._notifyStatus(false);
        this._scheduleReconnect();
      };

      this.ws.onerror = (e) => {
        console.error('[WS中继] 连接错误', e);
        this.isConnected = false;
        this.isAuthenticated = false;
        this._notifyStatus(false);
      };
    } catch (e) {
      console.error('[WS中继] 连接失败', e);
      this._scheduleReconnect();
    }
  }

  /** 断开连接 */
  disconnect(clearCredentials = true) {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    if (clearCredentials) {
      this.token = '';
      this.deviceId = '';
    }
    this._notifyStatus(false);
  }

  /** 发送消息 */
  send(type: string, data?: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  /** 注册消息处理器 */
  on(type: string, handler: WsHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /** 移除消息处理器 */
  off(type: string, handler?: WsHandler) {
    if (!handler) {
      this.handlers.delete(type);
    } else {
      const list = this.handlers.get(type);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
    }
  }

  /** 监听连接状态变化 */
  onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  get connected() { return this.isConnected && this.isAuthenticated; }

  private _handleMessage(msg: any) {
    const { type } = msg;

    if (type === 'auth_ok') {
      console.log('[WS中继] 认证成功');
      this.isAuthenticated = true;
      this._notifyStatus(true);
    } else if (type === 'auth_error') {
      console.error('[WS中继] 认证失败:', msg.error);
      this.isAuthenticated = false;
      this._notifyStatus(false);
    } else if (type === 'pong') {
      return; // 心跳回复
    }

    // 通知所有注册的处理器
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(h => h(msg));
    }

    // 通配处理器
    const allHandlers = this.handlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(h => h(msg));
    }
  }

  private _startHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
    }, HEARTBEAT_INTERVAL);
  }

  private _scheduleReconnect() {
    if (!this.token || !this.deviceId) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[WS中继] 尝试重连...');
      this._connect();
    }, RECONNECT_DELAY);
  }

  private _notifyStatus(connected: boolean) {
    this.statusListeners.forEach(l => l(connected));
  }
}

// ===== 单例导出 =====
export const wsRelay = new WsRelayClient();

/**
 * 初始化 WS 中继（在 App 启动时调用）
 * 
 * 注册默认的手机指令处理器:
 * - ai_chat → 调用本地/云端 AI → 回复 ai_response
 * - switch_model → 切换活跃模型
 * - toggle_feature → 切换功能开关
 * - key_updated → 刷新密钥状态
 */
export function initWsRelay(getToken: () => string | null, getDeviceId: () => string) {
  const token = getToken();
  const deviceId = getDeviceId();
  
  if (!token) {
    console.log('[WS中继] 未登录，跳过连接');
    return;
  }

  wsRelay.connect(token, deviceId);

  // ===== 处理来自手机的 AI 对话 =====
  wsRelay.on('ai_chat', async (msg) => {
    const { message, model } = msg;
    console.log(`[WS中继] 收到 AI 指令: model=${model}, msg=${message?.substring(0, 50)}`);

    try {
      let responseContent = '';

      if (model?.startsWith('deepseek_cloud')) {
        // 云端模型 → 调用服务器 proxy
        const proxyRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            model: model === 'deepseek_cloud_own' ? 'user_key' : 'official',
          }),
        });
        const data = await proxyRes.json();
        responseContent = data?.choices?.[0]?.message?.content || data?.message || '云端返回空响应';
      } else {
        // 本地模型 → 调用 Ollama
        const ollamaModel = model === 'deepseek_r1_local' ? 'deepseek-r1:1.5b' :
                            model === 'nanbeige_local' ? 'nanbeige-4.1:3b' :
                            model === 'phi4_local' ? 'phi4-mini' : 'deepseek-r1:1.5b';
        
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: message,
            stream: false,
          }),
        });
        const data = await ollamaRes.json();
        responseContent = data?.response || '本地模型返回空响应';
      }

      // 回复给手机
      wsRelay.send('ai_response', {
        content: responseContent,
        model: model,
        from: 'pc',
      });
    } catch (e: any) {
      wsRelay.send('ai_response', {
        content: `❌ AI 处理失败: ${e.message}`,
        model: model,
        from: 'pc',
        error: true,
      });
    }
  });

  // ===== 处理模型切换 =====
  wsRelay.on('switch_model', (msg) => {
    const { model } = msg;
    console.log(`[WS中继] 手机切换模型: ${model}`);
    localStorage.setItem('ai_active_model', model);
    window.dispatchEvent(new CustomEvent('ws-model-changed', { detail: { model } }));
  });

  // ===== 处理功能开关 =====
  wsRelay.on('toggle_feature', (msg) => {
    const { feature, enabled } = msg;
    console.log(`[WS中继] 手机切换功能: ${feature}=${enabled}`);
    window.dispatchEvent(new CustomEvent('ws-feature-toggled', { detail: { feature, enabled } }));
  });

  // ===== 密钥同步通知 =====
  wsRelay.on('key_updated', (msg) => {
    console.log(`[WS中继] 密钥已更新 (from ${msg.from})`);
    window.dispatchEvent(new CustomEvent('deepseek-key-changed', { detail: msg }));
  });
}
