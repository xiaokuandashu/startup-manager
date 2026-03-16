import { Router, Request, Response } from 'express';
import { getDB } from '../db';

const router = Router();

// VIP 积分对照表
const VIP_CREDITS: Record<string, number> = {
  '1month': 30,
  '3month': 90,
  '1year': 365,
  'permanent': 999999,
};

// ======== 查询积分 ========
router.get('/balance/:userId', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const credits = db.prepare('SELECT balance, total_earned, total_spent, expire_date FROM credits WHERE user_id = ?').get(req.params.userId) as any;
    res.json(credits || { balance: 0, total_earned: 0, total_spent: 0, expire_date: null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 积分明细 ========
router.get('/history/:userId', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const history = db.prepare('SELECT * FROM credit_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(req.params.userId, parseInt(limit as string), offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM credit_history WHERE user_id = ?').get(req.params.userId) as any;
    res.json({ history, total: total.count });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== VIP 激活时发放积分 ========
router.post('/vip-bonus', (req: Request, res: Response) => {
  try {
    const { userId, planDuration } = req.body;
    if (!userId || !planDuration) return res.status(400).json({ error: '缺少参数' });

    const amount = VIP_CREDITS[planDuration] || 0;
    if (amount === 0) return res.status(400).json({ error: '无效的套餐' });

    const db = getDB();
    const existing = db.prepare('SELECT id, balance FROM credits WHERE user_id = ?').get(userId) as any;

    // 计算积分过期时间
    let expireDate: string | null = null;
    if (planDuration !== 'permanent') {
      const now = new Date();
      const durDays = planDuration === '1month' ? 30 : planDuration === '3month' ? 90 : 365;
      now.setDate(now.getDate() + durDays);
      expireDate = now.toISOString().split('T')[0];
    }

    if (!existing) {
      db.prepare('INSERT INTO credits (user_id, balance, total_earned, expire_date) VALUES (?, ?, ?, ?)').run(userId, amount, amount, expireDate);
    } else {
      db.prepare('UPDATE credits SET balance = balance + ?, total_earned = total_earned + ?, expire_date = ?, updated_at = datetime("now") WHERE user_id = ?')
        .run(amount, amount, expireDate, userId);
    }

    db.prepare('INSERT INTO credit_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
      .run(userId, amount, 'vip_bonus', `VIP ${planDuration} 赠送 ${amount} 积分`);

    res.json({ success: true, credited: amount, balance: (existing?.balance || 0) + amount, expire_date: expireDate });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
