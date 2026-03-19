import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { getDB } from './db';

// ws 模块动态引入，避免类型问题
let WebSocketServer: any;
let WS_OPEN: number;
try {
  const wsModule = require('ws');
  WebSocketServer = wsModule.WebSocketServer || wsModule.Server;
  WS_OPEN = wsModule.OPEN || 1;
} catch {
  console.error('[WS] ws 模块未安装，请运行: npm install ws');
}

const JWT_SECRET = process.env.JWT_SECRET || 'startup-manager-jwt-secret-2024';

// 使用 any 避免类型依赖
type AuthenticatedSocket = any;

// 连接池: userId → { pc: Map<deviceId, ws>, mobile: ws[] }
const connections = new Map<number, {
  pc: Map<string, AuthenticatedSocket>;
  mobile: AuthenticatedSocket[];
}>();

/**
 * 初始化 WebSocket 服务器
 * 挂载在 HTTP Server 上，路径 /ws
 */
export function initWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('[WS] WebSocket 服务已启动 (/ws)');

  // 心跳检测：30秒无响应断开
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      const sock = ws as AuthenticatedSocket;
      if (sock.isAlive === false) {
        console.log(`[WS] 心跳超时, 断开连接 userId=${sock.userId} device=${sock.deviceId}`);
        return sock.terminate();
      }
      sock.isAlive = false;
      sock.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', (ws: AuthenticatedSocket, req: any) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // 等待客户端发送认证消息（5秒超时）
    const authTimeout = setTimeout(() => {
      if (!ws.userId) {
        ws.close(4001, '认证超时');
      }
    }, 5000);

    ws.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, msg, authTimeout);
      } catch (e: any) {
        ws.send(JSON.stringify({ type: 'error', error: '消息格式错误' }));
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      removeConnection(ws);
    });

    ws.on('error', () => {
      clearTimeout(authTimeout);
      removeConnection(ws);
    });
  });
}

/**
 * 处理 WS 消息
 */
function handleMessage(ws: AuthenticatedSocket, msg: any, authTimeout: NodeJS.Timeout) {
  const { type } = msg;

  // ===== 1. 认证 =====
  if (type === 'auth') {
    clearTimeout(authTimeout);
    const { token, client_type, device_id } = msg;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      ws.userId = decoded.userId || decoded.id;
      ws.clientType = client_type === 'pc' ? 'pc' : 'mobile';
      ws.deviceId = device_id || undefined;

      addConnection(ws);

      ws.send(JSON.stringify({
        type: 'auth_ok',
        user_id: ws.userId,
        client_type: ws.clientType,
        device_id: ws.deviceId,
      }));

      console.log(`[WS] 认证成功: ${ws.clientType} userId=${ws.userId} device=${ws.deviceId || '-'}`);

      // 如果是手机连接，通知它当前在线的PC列表
      if (ws.clientType === 'mobile') {
        sendOnlinePcList(ws);
      }

      // 如果是PC连接，通知该用户的所有手机
      if (ws.clientType === 'pc') {
        broadcastToMobiles(ws.userId!, {
          type: 'pc_online',
          device_id: ws.deviceId,
        });
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'auth_error', error: 'Token 无效' }));
      ws.close(4002, 'Token 无效');
    }
    return;
  }

  // 未认证的消息一律拒绝
  if (!ws.userId) {
    ws.send(JSON.stringify({ type: 'error', error: '请先认证' }));
    return;
  }

  // ===== 2. 心跳 =====
  if (type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
    return;
  }

  // ===== 3. 手机 → PC: AI 对话 =====
  if (type === 'ai_chat' && ws.clientType === 'mobile') {
    const { device_id, message, model, deep_think, smart_search, local_exec } = msg;
    const pcWs = getPcSocket(ws.userId!, device_id);
    if (pcWs) {
      pcWs.send(JSON.stringify({
        type: 'ai_chat',
        from: 'mobile',
        message,
        model,
        deep_think,
        smart_search,
        local_exec,
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'ai_response',
        content: '❌ 电脑不在线，无法执行此操作',
        device_id,
      }));
    }
    return;
  }

  // ===== 4. PC → 手机: AI 回复 =====
  if (type === 'ai_response' && ws.clientType === 'pc') {
    broadcastToMobiles(ws.userId!, {
      type: 'ai_response',
      content: msg.content,
      device_id: ws.deviceId,
      model: msg.model,
    });
    return;
  }

  // ===== 5. 手机 → PC: 模型切换 =====
  if (type === 'switch_model' && ws.clientType === 'mobile') {
    const pcWs = getPcSocket(ws.userId!, msg.device_id);
    if (pcWs) {
      pcWs.send(JSON.stringify({
        type: 'switch_model',
        model: msg.model,
      }));
    }
    return;
  }

  // ===== 6. 手机 → PC: 开关控制 =====
  if (type === 'toggle_feature' && ws.clientType === 'mobile') {
    const pcWs = getPcSocket(ws.userId!, msg.device_id);
    if (pcWs) {
      pcWs.send(JSON.stringify({
        type: 'toggle_feature',
        feature: msg.feature, // deep_think | smart_search | local_exec
        enabled: msg.enabled,
      }));
    }
    return;
  }

  // ===== 7. 手机 → PC: 获取可用模型列表 =====
  if (type === 'get_models' && ws.clientType === 'mobile') {
    const pcWs = getPcSocket(ws.userId!, msg.device_id);
    if (pcWs) {
      pcWs.send(JSON.stringify({ type: 'get_models' }));
    } else {
      ws.send(JSON.stringify({ type: 'models_list', models: [], device_id: msg.device_id }));
    }
    return;
  }

  // ===== 8. PC → 手机: 模型列表回复 =====
  if (type === 'models_list' && ws.clientType === 'pc') {
    broadcastToMobiles(ws.userId!, {
      type: 'models_list',
      models: msg.models,
      device_id: ws.deviceId,
    });
    return;
  }

  // ===== 9. 通用转发: 任务同步等 =====
  if (type === 'task_sync' || type === 'task_execute') {
    if (ws.clientType === 'mobile') {
      const pcWs = getPcSocket(ws.userId!, msg.device_id);
      if (pcWs) pcWs.send(JSON.stringify(msg));
    } else {
      broadcastToMobiles(ws.userId!, msg);
    }
    return;
  }
}

// ===== 连接管理 =====

function addConnection(ws: AuthenticatedSocket) {
  if (!ws.userId) return;
  if (!connections.has(ws.userId)) {
    connections.set(ws.userId, { pc: new Map(), mobile: [] });
  }
  const pool = connections.get(ws.userId)!;
  if (ws.clientType === 'pc' && ws.deviceId) {
    pool.pc.set(ws.deviceId, ws);
  } else if (ws.clientType === 'mobile') {
    pool.mobile.push(ws);
  }
}

function removeConnection(ws: AuthenticatedSocket) {
  if (!ws.userId) return;
  const pool = connections.get(ws.userId);
  if (!pool) return;

  if (ws.clientType === 'pc' && ws.deviceId) {
    pool.pc.delete(ws.deviceId);
    // 通知手机: PC 离线
    broadcastToMobiles(ws.userId, {
      type: 'pc_offline',
      device_id: ws.deviceId,
    });
    console.log(`[WS] PC 断开: userId=${ws.userId} device=${ws.deviceId}`);
  } else if (ws.clientType === 'mobile') {
    pool.mobile = pool.mobile.filter((s) => s !== ws);
    console.log(`[WS] 手机断开: userId=${ws.userId}`);
  }

  // 清理空池
  if (pool.pc.size === 0 && pool.mobile.length === 0) {
    connections.delete(ws.userId);
  }
}

function getPcSocket(userId: number, deviceId?: string): AuthenticatedSocket | null {
  const pool = connections.get(userId);
  if (!pool) return null;
  if (deviceId) {
    return pool.pc.get(deviceId) || null;
  }
  // 没指定设备，返回第一台在线PC
  const first = pool.pc.values().next();
  return first.done ? null : first.value;
}

function broadcastToMobiles(userId: number, data: any) {
  const pool = connections.get(userId);
  if (!pool) return;
  const msg = JSON.stringify(data);
  pool.mobile.forEach((ws) => {
    if (ws.readyState === WS_OPEN) {
      ws.send(msg);
    }
  });
}

function sendOnlinePcList(ws: AuthenticatedSocket) {
  if (!ws.userId) return;
  const pool = connections.get(ws.userId);
  const pcList = pool ? Array.from(pool.pc.keys()) : [];
  ws.send(JSON.stringify({
    type: 'online_pcs',
    devices: pcList,
  }));
}
