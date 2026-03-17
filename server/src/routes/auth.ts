import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDB, generateUserId } from '../db';
import { JWT_SECRET, authMiddleware, AuthRequest } from '../middleware/auth';
import { sendVerificationCode, verifyCode } from '../email';

const router = Router();

// ========== 发送验证码 ==========
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '请输入正确的邮箱地址' });
  }
  try {
    await sendVerificationCode(email);
    res.json({ message: '验证码已发送' });
  } catch (e: any) {
    console.error('[认证] 发送验证码失败:', e.message);
    res.status(500).json({ error: '验证码发送失败，请稍后重试' });
  }
});

// ========== 邮箱验证码登录 (不自动注册) ==========
router.post('/login', (req, res) => {
  const { email, code } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '请输入正确的邮箱地址' });
  }
  if (!code) {
    return res.status(400).json({ error: '请输入验证码' });
  }
  if (!verifyCode(email, code)) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (!user) {
    return res.status(404).json({ error: '该邮箱未注册，请先注册账号', code: 'NOT_REGISTERED' });
  }

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
  const token = jwt.sign({ id: user.id, type: 'user' }, JWT_SECRET, { expiresIn: '30d' });
  console.log(`[认证] 用户登录(验证码): ${email}`);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      vipStatus: user.vip_status,
      vipExpireDate: user.vip_expire_date,
    },
  });
});

// ========== 邮箱+密码登录 ==========
router.post('/login-password', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (!user) {
    return res.status(401).json({ error: '该邮箱未注册' });
  }
  if (!user.password) {
    return res.status(401).json({ error: '该账号未设置密码，请使用验证码登录' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '密码错误' });
  }

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
  const token = jwt.sign({ id: user.id, type: 'user' }, JWT_SECRET, { expiresIn: '30d' });
  console.log(`[认证] 用户登录(密码): ${email}`);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      vipStatus: user.vip_status,
      vipExpireDate: user.vip_expire_date,
    },
  });
});

// ========== 注册 (邮箱+验证码+密码) ==========
router.post('/register', (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: '请输入正确的邮箱地址' });
  }
  if (!code) {
    return res.status(400).json({ error: '请输入验证码' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }
  if (!verifyCode(email, code)) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }

  const userId = generateUserId();
  const hashedPwd = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(userId, email, hashedPwd);
  console.log(`[认证] 新用户注册: ${email}`);

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userId);
  const token = jwt.sign({ id: userId, type: 'user' }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    token,
    user: {
      id: userId,
      email,
      vipStatus: 'inactive',
      vipExpireDate: null,
    },
  });
});

// ========== 找回密码 (邮箱+验证码+新密码) ==========
router.post('/forgot-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: '请填写所有字段' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }
  if (!verifyCode(email, code)) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  const db = getDB();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(404).json({ error: '该邮箱未注册' });
  }

  const hashedPwd = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPwd, user.id);
  console.log(`[认证] 用户找回密码: ${email}`);

  res.json({ message: '密码重置成功' });
});

// ========== 修改密码 (需登录) ==========
router.post('/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  // 如果用户已有密码，需要验证旧密码
  if (user.password) {
    if (!oldPassword) {
      return res.status(400).json({ error: '请输入原密码' });
    }
    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(401).json({ error: '原密码错误' });
    }
  }

  const hashedPwd = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPwd, user.id);
  console.log(`[认证] 用户修改密码: ${user.email}`);

  res.json({ message: '密码修改成功' });
});

// ========== 获取用户信息 (需登录) ==========
router.get('/user-info', authMiddleware, (req: AuthRequest, res) => {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({
    id: user.id,
    email: user.email,
    hasPassword: !!user.password,
    vipStatus: user.vip_status,
    vipExpireDate: user.vip_expire_date,
  });
});

// ========== 管理后台登录 ==========
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入账户和密码' });
  }

  const db = getDB();
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username) as any;

  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: '账户或密码错误' });
  }

  const token = jwt.sign({ id: admin.id, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  console.log(`[认证] 管理员登录: ${username}`);

  res.json({ token, username: admin.username });
});

// ========== 修改管理员密码 ==========
router.post('/admin-change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const db = getDB();
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username) as any;

  if (!admin || !bcrypt.compareSync(oldPassword, admin.password)) {
    return res.status(401).json({ error: '原密码错误' });
  }

  const hashedPwd = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin SET password = ? WHERE id = ?').run(hashedPwd, admin.id);
  console.log(`[认证] 管理员修改密码: ${username}`);

  res.json({ message: '密码修改成功' });
});

export default router;
