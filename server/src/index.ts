import express from 'express';
import { createServer } from 'http';
import { initWebSocket } from './ws_relay';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { initDB } from './db';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import activationRoutes from './routes/activation';
import adminRoutes from './routes/admin';
import marketplaceRoutes from './routes/marketplace';
import creditsRoutes from './routes/credits';
import devicesRoutes from './routes/devices';

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: true, // 允许所有来源（支持反向代理）
  credentials: true,
}));
app.use(express.json());

// 上传目录
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `update_${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

// 初始化数据库
initDB();

// 管理后台静态文件（同时在 /admin 和 / 下提供）
const adminDistPath = path.join(__dirname, '..', 'admin-dist');
app.use('/admin', express.static(adminDistPath));
app.use(express.static(adminDistPath));
// SPA fallback: /admin/* 路由返回 index.html
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(adminDistPath, 'index.html'));
});

// API 路由 — 设备注册
app.use('/api/devices', devicesRoutes);

// 公开路由
app.use('/api/auth', authRoutes);

// 市场公开路由（浏览不需要鉴权）
app.use('/api/marketplace', marketplaceRoutes);

// 公开套餐查询（客户端价格同步）
app.get('/api/plans', (_req, res) => {
  const db = require('./db').getDB();
  const plans = db.prepare('SELECT * FROM plans ORDER BY id ASC').all();
  res.json(plans);
});

// 公开更新检查路由
app.get('/api/updates/check', (req, res) => {
  const { platform, version } = req.query;
  const db = require('./db').getDB();
  const latest = db.prepare(
    'SELECT * FROM app_updates WHERE platform = ? ORDER BY id DESC LIMIT 1'
  ).get(platform || 'windows') as any;
  if (!latest) {
    return res.json({ hasUpdate: false });
  }
  const hasUpdate = version ? latest.version !== version : true;
  res.json({
    hasUpdate,
    version: latest.version,
    downloadUrl: latest.download_url,
    changelog: latest.changelog,
    forceUpdate: !!latest.force_update,
  });
});

// 公开QQ群查询路由（#22）
app.get('/api/qq-groups', (_req, res) => {
  const db = require('./db').getDB();
  const groups = db.prepare('SELECT * FROM qq_groups ORDER BY sort_order ASC').all();
  res.json(groups);
});

// 公开协议查询路由（#24）
app.get('/api/agreements/:type', (req, res) => {
  const db = require('./db').getDB();
  const agreement = db.prepare('SELECT * FROM agreements WHERE type = ?').get(req.params.type) as any;
  if (!agreement) {
    return res.status(404).json({ error: 'Agreement not found' });
  }
  res.json(agreement);
});

// 文件上传路由（管理员）
app.post('/api/admin/upload', upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: '未上传文件' });
  const fileUrl = `/uploads/${req.file.filename}`;
  console.log(`[上传] 文件上传: ${req.file.originalname} -> ${fileUrl}`);
  res.json({ url: fileUrl, filename: req.file.filename, originalName: req.file.originalname });
});

// 需要用户认证的路由
app.use('/api/activation', authMiddleware, activationRoutes);
app.use('/api/credits', authMiddleware, creditsRoutes);

// 需要管理员认证的路由
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

// ======== 2c/2d: DeepSeek 代理 API ========
app.get('/api/deepseek/usage', authMiddleware, (req: any, res) => {
  const userId = req.userId;
  const db = require('./db').getDB();
  const offset = 8 * 60 * 60 * 1000;
  const now = new Date(Date.now() + offset);
  const today = now.toISOString().split('T')[0];
  
  const usage = db.prepare('SELECT call_count FROM user_api_usage WHERE user_id = ? AND date = ?').get(userId, today) as any;
  const limitRow = db.prepare("SELECT value FROM system_config WHERE key = 'deepseek_daily_limit'").get() as any;
  const dailyLimit = parseInt(limitRow?.value || '100');
  const callCount = usage?.call_count || 0;

  // 检查用户是否有自定义 key
  const user = db.prepare('SELECT deepseek_key FROM users WHERE id = ?').get(userId) as any;
  const hasCustomKey = !!user?.deepseek_key;

  res.json({
    call_count: callCount,
    daily_limit: dailyLimit,
    remaining: Math.max(0, dailyLimit - callCount),
    has_custom_key: hasCustomKey,
  });
});

app.post('/api/deepseek/chat', authMiddleware, async (req: any, res) => {
  const userId = req.userId;
  const { messages, model, deep_think } = req.body;
  const db = require('./db').getDB();

  // 获取用户自定义 key
  const user = db.prepare('SELECT deepseek_key FROM users WHERE id = ?').get(userId) as any;
  const hasCustomKey = !!user?.deepseek_key;

  let apiKey: string;
  let baseUrl: string;
  let modelName: string;

  // 根据前端请求的模型标识严格区分逻辑
  if (model === 'deepseek_user') {
    // 强制走自有密钥逻辑
    if (!hasCustomKey) {
      return res.status(403).json({ error: '未配置 DeepSeek 密钥，请在配置中填入您的专属密钥。' });
    }
    apiKey = user.deepseek_key;
    const baseUrlRow = db.prepare("SELECT value FROM system_config WHERE key = 'deepseek_base_url'").get() as any;
    baseUrl = baseUrlRow?.value || 'https://api.deepseek.com';
    modelName = 'deepseek-chat';
  } else {
    // 强制走云端官方分配额度逻辑 (deepseek_cloud)
    const configRows = db.prepare("SELECT key, value FROM system_config WHERE key LIKE 'deepseek_%'").all() as any[];
    const config: Record<string, string> = {};
    configRows.forEach((c: any) => { config[c.key] = c.value; });

    apiKey = config.deepseek_api_key || '';
    if (!apiKey) {
      return res.status(503).json({ error: 'DeepSeek API 官方密钥未配置，请联系管理员' });
    }

    baseUrl = config.deepseek_base_url || 'https://api.deepseek.com';
    modelName = config.deepseek_model || 'deepseek-chat';

    // 检查每日限额 (云端强制计费)
    const dailyLimit = parseInt(config.deepseek_daily_limit || '100');
    const now = new Date();
    const utc8Date = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const today = utc8Date.toISOString().split('T')[0];
    
    const usage = db.prepare('SELECT call_count FROM user_api_usage WHERE user_id = ? AND date = ?').get(userId, today) as any;
    const callCount = usage?.call_count || 0;

    if (callCount >= dailyLimit) {
      return res.status(429).json({
        error: `官方每日调用次数已达上限 (${dailyLimit}次)。可在下面选择"DeepSeek (自有密钥)"无限制使用。`,
        call_count: callCount,
        daily_limit: dailyLimit,
      });
    }
  }

  // 深度思考模式: 切换到 deepseek-reasoner 模型
  const actualModel = deep_think ? 'deepseek-reasoner' : modelName;
  console.log(`[DeepSeek] 模型=${actualModel} deep_think=${!!deep_think} user=${userId}`);

  try {
    // 调用 DeepSeek API
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: messages || [{ role: 'user', content: req.body.input || '' }],
        temperature: deep_think ? undefined : 0.7,  // reasoner 不支持 temperature
        max_tokens: deep_think ? 8192 : 2048,        // 思考需要更多 token
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[DeepSeek] API 错误: ${response.status} ${errText}`);
      
      let friendlyError = `DeepSeek API 错误: ${response.status}`;
      if (response.status === 401) {
         friendlyError = model === 'deepseek_user' 
            ? "您的自有密钥不正确或已失效，请重新配置" 
            : "官方云端 API 密钥失效，请联系管理员更新配置";
      } else if (response.status === 402 || response.status === 429) {
         friendlyError = model === 'deepseek_user'
            ? "您的 DeepSeek 账户余额不足或请求过载"
            : "官方云端额度不足或请求受限，请联系管理员";
      }

      return res.status(502).json({ error: friendlyError });
    }

    const data = await response.json() as any;

    // 深度思考: 提取 reasoning_content → 拼接为 <think>...</think> + content
    if (deep_think && data.choices?.[0]?.message) {
      const msg = data.choices[0].message;
      const reasoning = msg.reasoning_content || '';
      const content = msg.content || '';
      if (reasoning) {
        msg.content = `<think>\n${reasoning}\n</think>\n${content}`;
        console.log(`[DeepSeek] 深度思考: reasoning=${reasoning.length}字 content=${content.length}字`);
      }
    }

    // 记录调用次数（使用官方云端 key 时计数，使用自有key不计数）
    if (model !== 'deepseek_user') {
      try {
        const offset = 8 * 60 * 60 * 1000;
        const now = new Date(Date.now() + offset);
        const today = now.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO user_api_usage (user_id, date, call_count) VALUES (?, ?, 1)
          ON CONFLICT(user_id, date) DO UPDATE SET call_count = call_count + 1
        `).run(userId, today);
        console.log(`[DeepSeek] 计费成功 user=${userId} today=${today}`);
      } catch (dbErr: any) {
        console.log(`[DeepSeek] API使用记录失败: ${dbErr.message}`);
      }
    } else {
      console.log(`[DeepSeek] 使用自有Key，不计入服务端次数 user=${userId}`);
    }

    res.json(data);
  } catch (e: any) {
    console.log(`[DeepSeek] 代理错误: ${e.message}`);
    res.status(500).json({ error: `DeepSeek 调用失败: ${e.message}` });
  }
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback: 所有非 API/uploads 的 GET 请求返回 index.html
// 必须放在所有路由之后
app.get('*', (req, res) => {
  // 不拦截 API 和上传文件请求
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(adminDistPath, 'index.html'));
});

const server = createServer(app);

// 初始化 WebSocket 服务 (挂载在 /ws 路径)
initWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  任务精灵后端服务已启动`);
  console.log(`  地址: http://0.0.0.0:${PORT}`);
  console.log(`  管理后台: http://0.0.0.0:${PORT}/admin`);
  console.log(`  API: http://0.0.0.0:${PORT}/api`);
  console.log(`  WebSocket: ws://0.0.0.0:${PORT}/ws`);
  console.log(`========================================\n`);
});
