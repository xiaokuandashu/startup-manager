import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { initDB } from './db';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import activationRoutes from './routes/activation';
import adminRoutes from './routes/admin';

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

// 公开路由
app.use('/api/auth', authRoutes);

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

// 需要管理员认证的路由
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  自启精灵后端服务已启动`);
  console.log(`  地址: http://0.0.0.0:${PORT}`);
  console.log(`  管理后台: http://0.0.0.0:${PORT}/admin`);
  console.log(`  API: http://0.0.0.0:${PORT}/api`);
  console.log(`========================================\n`);
});
