import { Router } from 'express';
import { getDB } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// 激活码激活
router.post('/activate', (req: AuthRequest, res) => {
  const { code } = req.body;
  const userId = req.userId;

  if (!code) {
    return res.status(400).json({ error: '请输入激活码' });
  }

  const db = getDB();
  const codeRecord = db.prepare('SELECT * FROM activation_codes WHERE code = ?').get(code) as any;

  if (!codeRecord) {
    return res.status(404).json({ error: '激活码不存在' });
  }
  if (codeRecord.status === 'activated') {
    return res.status(400).json({ error: '激活码已被使用' });
  }
  if (codeRecord.status === 'expired') {
    return res.status(400).json({ error: '激活码已过期' });
  }
  if (codeRecord.status === 'suspended') {
    return res.status(400).json({ error: '激活码已被暂停' });
  }

  // 计算到期时间
  const now = new Date();
  let expireDate: string;
  switch (codeRecord.plan_duration) {
    case '1month':
      expireDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];
      break;
    case '3month':
      expireDate = new Date(now.setMonth(now.getMonth() + 3)).toISOString().split('T')[0];
      break;
    case '1year':
      expireDate = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString().split('T')[0];
      break;
    case 'permanent':
      expireDate = '2099-12-31';
      break;
    default:
      expireDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];
  }

  // 更新激活码状态
  const nowISO = new Date().toISOString();
  db.prepare('UPDATE activation_codes SET status = ?, user_id = ?, activated_at = ?, expire_date = ? WHERE id = ?')
    .run('activated', userId, nowISO, expireDate, codeRecord.id);

  // 更新用户 VIP 状态
  db.prepare('UPDATE users SET vip_status = ?, vip_expire_date = ? WHERE id = ?')
    .run('active', expireDate, userId);

  // ======== 2a: 发放激活码积分 ========
  const codeCredits = codeRecord.credits || 0;
  if (codeCredits > 0 && userId) {
    const existing = db.prepare('SELECT id, balance FROM credits WHERE user_id = ?').get(userId) as any;
    if (!existing) {
      db.prepare('INSERT INTO credits (user_id, balance, total_earned) VALUES (?, ?, ?)').run(userId, codeCredits, codeCredits);
    } else {
      db.prepare('UPDATE credits SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime("now") WHERE user_id = ?')
        .run(codeCredits, codeCredits, userId);
    }
    db.prepare('INSERT INTO credit_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
      .run(userId, codeCredits, 'activation_code', `激活码 ${code} 赠送 ${codeCredits} 积分`);
  }

  console.log(`[激活] 用户 ${userId} 激活码 ${code} 激活成功，到期 ${expireDate}，积分 +${codeCredits}`);

  res.json({
    message: '激活成功',
    vipStatus: 'active',
    expireDate,
    planDuration: codeRecord.plan_duration,
    creditsGranted: codeCredits,
  });
});

// 验证会员状态
router.get('/validate', (req: AuthRequest, res) => {
  const userId = req.userId;
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  // 检查是否过期
  if (user.vip_status === 'active' && user.vip_expire_date) {
    const expireDate = new Date(user.vip_expire_date);
    if (expireDate < new Date()) {
      db.prepare('UPDATE users SET vip_status = ? WHERE id = ?').run('expired', userId);
      return res.json({ isVip: false, status: 'expired' });
    }
  }

  res.json({
    isVip: user.vip_status === 'active',
    status: user.vip_status,
    expireDate: user.vip_expire_date,
    email: user.email,
  });
});

// 获取用户信息（含积分 + DeepSeek key 脱敏）
router.get('/profile', (req: AuthRequest, res) => {
  const userId = req.userId;
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  // 读取积分
  const credits = db.prepare('SELECT balance, total_earned, total_spent FROM credits WHERE user_id = ?').get(userId) as any;

  // DeepSeek key 脱敏
  let deepseekKeyMasked = '';
  if (user.deepseek_key) {
    const k = user.deepseek_key;
    deepseekKeyMasked = k.length > 8 ? k.substring(0, 4) + '****' + k.substring(k.length - 4) : '****';
  }

  res.json({
    id: user.id,
    email: user.email,
    vipStatus: user.vip_status,
    vipExpireDate: user.vip_expire_date,
    createdAt: user.created_at,
    credits: credits || { balance: 0, total_earned: 0, total_spent: 0 },
    hasDeepseekKey: !!user.deepseek_key,
    deepseekKeyMasked,
  });
});

// ======== 2d: 用户保存/清除自定义 DeepSeek Key ========
router.put('/profile/deepseek-key', (req: AuthRequest, res) => {
  const userId = req.userId;
  const { key } = req.body;
  const db = getDB();

  db.prepare('UPDATE users SET deepseek_key = ? WHERE id = ?').run(key || null, userId);
  console.log(`[用户] ${userId} ${key ? '设置' : '清除'}了自定义 DeepSeek Key`);

  res.json({ success: true, hasKey: !!key });
});

export default router;
