import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ======== 安全自动审查规则 ========
const HIGH_RISK_PATTERNS = [
  /转账|transfer|pay/i, /删除.*系统|rm\s+-rf|del\s+\/|rmdir/i,
  /循环自启|reboot.*loop|restart.*infinite/i,
  /窃取|steal|keylog|password.*grab/i,
  /sudo\s+rm|format\s+disk/i,
];
const MED_RISK_PATTERNS = [
  /隐私|privacy|~\/Documents|~\/Desktop/i,
  /curl\s|wget\s|http:\/\/|https:\/\//i,
  /sudo\s/i,
];

function autoAudit(taskConfig: string, recordingData: string): { result: string; risks: string[] } {
  const combined = (taskConfig || '') + (recordingData || '');
  const risks: string[] = [];

  for (const p of HIGH_RISK_PATTERNS) {
    if (p.test(combined)) risks.push(`🔴 高危: ${p.source}`);
  }
  if (risks.length > 0) return { result: 'rejected', risks };

  for (const p of MED_RISK_PATTERNS) {
    if (p.test(combined)) risks.push(`🟡 中危: ${p.source}`);
  }
  if (risks.length > 0) return { result: 'manual_review', risks };

  return { result: 'approved', risks: [] };
}

// ======== 发布任务到市场 ========
router.post('/publish', (req: Request, res: Response) => {
  try {
    const { userId, name, description, category, tags, recordingData, taskConfig, costCredits } = req.body;
    if (!userId || !name) return res.status(400).json({ error: '缺少必要参数' });

    const db = getDB();
    const taskId = uuidv4().replace(/-/g, '').substring(0, 16);

    // 安全自动审查
    const audit = autoAudit(taskConfig || '', recordingData || '');

    const status = audit.result === 'approved' ? 'approved' : audit.result === 'rejected' ? 'rejected' : 'pending';

    db.prepare(`INSERT INTO marketplace_tasks (id, user_id, name, description, category, tags, recording_data, task_config, cost_credits, safety_level, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      taskId, userId, name, description || '', category || '通用',
      JSON.stringify(tags || []), recordingData || null, taskConfig || null,
      costCredits || 1, audit.result === 'approved' ? 'safe' : audit.result === 'rejected' ? 'dangerous' : 'review',
      status
    );

    // 安全审查记录
    db.prepare(`INSERT INTO safety_audits (task_id, auto_result, auto_risks) VALUES (?, ?, ?)`).run(
      taskId, audit.result, JSON.stringify(audit.risks)
    );

    // 发布通过 → 奖励 1 积分
    if (status === 'approved') {
      addCredits(db, userId, 1, 'publish', `发布任务: ${name}`, taskId);
    }

    res.json({ id: taskId, status, risks: audit.risks });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 浏览市场 ========
router.get('/list', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { category, sort, search, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = "WHERE status = 'approved'";
    const params: any[] = [];

    if (category && category !== '全部') { where += ' AND category = ?'; params.push(category); }
    if (search) { where += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    let orderBy = 'ORDER BY created_at DESC';
    if (sort === 'downloads') orderBy = 'ORDER BY download_count DESC';
    if (sort === 'rating') orderBy = 'ORDER BY rating DESC';

    const total = db.prepare(`SELECT COUNT(*) as count FROM marketplace_tasks ${where}`).get(...params) as { count: number };
    const tasks = db.prepare(`SELECT id, user_id, name, description, category, tags, cost_credits, safety_level, rating, rating_count, download_count, status, created_at
      FROM marketplace_tasks ${where} ${orderBy} LIMIT ? OFFSET ?`).all(...params, parseInt(limit as string), offset);

    // 附带发布者信息
    const result = (tasks as any[]).map(t => {
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(t.user_id) as any;
      return { ...t, tags: JSON.parse(t.tags || '[]'), publisher: user?.email || '匿名' };
    });

    res.json({ tasks: result, total: total.count, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 任务详情 ========
router.get('/detail/:id', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const task = db.prepare('SELECT * FROM marketplace_tasks WHERE id = ?').get(req.params.id) as any;
    if (!task) return res.status(404).json({ error: '任务不存在' });

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(task.user_id) as any;
    const comments = db.prepare('SELECT c.*, u.email as user_email FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE task_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
    const audit = db.prepare('SELECT auto_result, auto_risks FROM safety_audits WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);

    res.json({
      ...task, tags: JSON.parse(task.tags || '[]'),
      publisher: user?.email || '匿名', comments, audit,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 下载/购买任务 ========
router.post('/download', (req: Request, res: Response) => {
  try {
    const { userId, taskId } = req.body;
    const db = getDB();
    const task = db.prepare('SELECT * FROM marketplace_tasks WHERE id = ? AND status = ?').get(taskId, 'approved') as any;
    if (!task) return res.status(404).json({ error: '任务不存在或未审核通过' });

    // 自己的任务免费
    if (task.user_id === userId) {
      db.prepare('UPDATE marketplace_tasks SET download_count = download_count + 1 WHERE id = ?').run(taskId);
      return res.json({ taskConfig: task.task_config, recordingData: task.recording_data });
    }

    // 扣除积分
    const credits = db.prepare('SELECT balance FROM credits WHERE user_id = ?').get(userId) as any;
    if (!credits || credits.balance < task.cost_credits) {
      return res.status(402).json({ error: '积分不足', required: task.cost_credits, current: credits?.balance || 0 });
    }

    db.prepare('UPDATE credits SET balance = balance - ?, total_spent = total_spent + ?, updated_at = datetime("now") WHERE user_id = ?')
      .run(task.cost_credits, task.cost_credits, userId);
    db.prepare('INSERT INTO credit_history (user_id, amount, type, description, related_task_id) VALUES (?, ?, ?, ?, ?)')
      .run(userId, -task.cost_credits, 'download', `下载任务: ${task.name}`, taskId);

    db.prepare('UPDATE marketplace_tasks SET download_count = download_count + 1 WHERE id = ?').run(taskId);

    res.json({ taskConfig: task.task_config, recordingData: task.recording_data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 评论 ========
router.post('/comment', (req: Request, res: Response) => {
  try {
    const { userId, taskId, content, rating } = req.body;
    if (!userId || !taskId || !content) return res.status(400).json({ error: '缺少参数' });

    const db = getDB();
    db.prepare('INSERT INTO comments (task_id, user_id, content, rating) VALUES (?, ?, ?, ?)').run(taskId, userId, content, rating || 5);

    // 更新任务平均评分
    const avg = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM comments WHERE task_id = ?').get(taskId) as any;
    db.prepare('UPDATE marketplace_tasks SET rating = ?, rating_count = ? WHERE id = ?').run(
      Math.round(avg.avg * 10) / 10, avg.cnt, taskId
    );

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 我的发布 ========
router.get('/my/:userId', (req: Request, res: Response) => {
  try {
    const db = getDB();
    const tasks = db.prepare('SELECT id, name, category, status, download_count, rating, created_at, reject_reason FROM marketplace_tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
    res.json(tasks);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ======== 积分辅助函数 ========
function addCredits(db: any, userId: string, amount: number, type: string, description: string, taskId?: string) {
  const existing = db.prepare('SELECT id FROM credits WHERE user_id = ?').get(userId);
  if (!existing) {
    db.prepare('INSERT INTO credits (user_id, balance, total_earned) VALUES (?, ?, ?)').run(userId, amount, amount);
  } else {
    db.prepare('UPDATE credits SET balance = balance + ?, total_earned = total_earned + ?, updated_at = datetime("now") WHERE user_id = ?')
      .run(amount, amount, userId);
  }
  db.prepare('INSERT INTO credit_history (user_id, amount, type, description, related_task_id) VALUES (?, ?, ?, ?, ?)')
    .run(userId, amount, type, description, taskId || null);
}

export { addCredits };
export default router;
