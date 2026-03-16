import { Router } from 'express';
import { getDB, generateActivationCode } from '../db';

const router = Router();

// ========== 数据看板 ==========
router.get('/dashboard', (req, res) => {
  const db = getDB();
  const { type, start_date, end_date, year } = req.query;

  let dateFilter = '';
  const params: any[] = [];

  if (year) {
    dateFilter = "AND strftime('%Y', created_at) = ?";
    params.push(String(year));
  } else if (start_date && end_date) {
    dateFilter = 'AND created_at BETWEEN ? AND ?';
    params.push(String(start_date), String(end_date));
  } else {
    // 默认当日
    dateFilter = "AND date(created_at) = date('now')";
  }

  const totalUsers = (db.prepare(`SELECT COUNT(*) as count FROM users WHERE 1=1 ${dateFilter}`).get(...params) as any).count;
  const vipUsers = (db.prepare(`SELECT COUNT(*) as count FROM users WHERE vip_status = 'active' ${dateFilter}`).get(...params) as any).count;
  const totalCodes = (db.prepare('SELECT COUNT(*) as count FROM activation_codes').get() as any).count;
  const activatedCodes = (db.prepare(`SELECT COUNT(*) as count FROM activation_codes WHERE status = 'activated' ${dateFilter.replace('created_at', 'activated_at')}`).get(...params) as any).count;
  const pendingCodes = (db.prepare("SELECT COUNT(*) as count FROM activation_codes WHERE status = 'pending'").get() as any).count;
  const totalRevenue = (db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' ${dateFilter}`).get(...params) as any).total;
  const registeredNotPaid = (db.prepare(`SELECT COUNT(*) as count FROM users WHERE vip_status = 'inactive' ${dateFilter}`).get(...params) as any).count;

  console.log('[看板] 获取数据看板');

  res.json({
    totalUsers,
    vipUsers,
    totalCodes,
    activatedCodes,
    pendingCodes,
    totalRevenue,
    registeredNotPaid,
    todayActive: (db.prepare("SELECT COUNT(*) as count FROM users WHERE date(last_login) = date('now')").get() as any).count,
  });
});

// ========== 套餐管理 ==========
router.get('/plans', (_req, res) => {
  const db = getDB();
  const plans = db.prepare('SELECT * FROM plans ORDER BY id ASC').all();
  res.json(plans);
});

router.post('/plans', (req, res) => {
  const { name, duration, original_price, actual_price, is_limited } = req.body;
  const db = getDB();
  const result = db.prepare('INSERT INTO plans (name, duration, original_price, actual_price, is_limited) VALUES (?, ?, ?, ?, ?)')
    .run(name, duration, original_price, actual_price, is_limited ? 1 : 0);
  console.log(`[套餐] 新增套餐: ${name}`);
  res.json({ id: result.lastInsertRowid, message: '创建成功' });
});

router.put('/plans/:id', (req, res) => {
  const { name, duration, original_price, actual_price, is_limited } = req.body;
  const db = getDB();
  db.prepare('UPDATE plans SET name = ?, duration = ?, original_price = ?, actual_price = ?, is_limited = ? WHERE id = ?')
    .run(name, duration, original_price, actual_price, is_limited ? 1 : 0, req.params.id);
  console.log(`[套餐] 编辑套餐 ID=${req.params.id}`);
  res.json({ message: '更新成功' });
});

router.delete('/plans/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  console.log(`[套餐] 删除套餐 ID=${req.params.id}`);
  res.json({ message: '删除成功' });
});

// ========== 用户订单 ==========
router.get('/orders', (req, res) => {
  const db = getDB();
  const { status, pay_type, email, order_id, plan_name, start_date, end_date } = req.query;
  let sql = `SELECT o.*, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1`;
  const params: any[] = [];

  if (status) { sql += ' AND o.status = ?'; params.push(status); }
  if (pay_type) { sql += ' AND o.pay_type = ?'; params.push(pay_type); }
  if (email) { sql += ' AND u.email LIKE ?'; params.push(`%${email}%`); }
  if (order_id) { sql += ' AND o.id = ?'; params.push(Number(order_id)); }
  if (plan_name) { sql += ' AND o.plan_name LIKE ?'; params.push(`%${plan_name}%`); }
  if (start_date) { sql += ' AND o.created_at >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND o.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
  sql += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(sql).all(...params);
  res.json(orders);
});

// ========== 激活码管理 ==========
router.get('/codes', (req, res) => {
  const db = getDB();
  const { email, code, plan_duration, status, start_date, end_date } = req.query;
  let sql = `SELECT c.*, u.email as user_email FROM activation_codes c LEFT JOIN users u ON c.user_id = u.id WHERE 1=1`;
  const params: any[] = [];

  if (email) { sql += ' AND u.email LIKE ?'; params.push(`%${email}%`); }
  if (code) { sql += ' AND c.code LIKE ?'; params.push(`%${code}%`); }
  if (plan_duration) { sql += ' AND c.plan_duration = ?'; params.push(plan_duration); }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (start_date) { sql += ' AND c.created_at >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND c.created_at <= ?'; params.push(end_date + ' 23:59:59'); }
  sql += ' ORDER BY c.created_at DESC';

  const codes = db.prepare(sql).all(...params);
  res.json(codes);
});

router.post('/codes', (req, res) => {
  const { plan_duration, count } = req.body;
  const db = getDB();
  const insertCode = db.prepare('INSERT INTO activation_codes (code, plan_duration, status) VALUES (?, ?, ?)');
  const generated: string[] = [];

  const num = count || 1;
  for (let i = 0; i < num; i++) {
    const code = generateActivationCode();
    insertCode.run(code, plan_duration, 'pending');
    generated.push(code);
  }
  console.log(`[激活码] 生成 ${num} 个激活码 (${plan_duration})`);

  res.json({ codes: generated, message: `成功生成 ${num} 个激活码` });
});

router.put('/codes/:id/suspend', (req, res) => {
  const db = getDB();
  db.prepare("UPDATE activation_codes SET status = 'suspended' WHERE id = ?").run(req.params.id);
  console.log(`[激活码] 暂停激活码 ID=${req.params.id}`);
  res.json({ message: '已暂停' });
});

router.put('/codes/:id/resume', (req, res) => {
  const db = getDB();
  const code = db.prepare('SELECT * FROM activation_codes WHERE id = ?').get(req.params.id) as any;
  const newStatus = code?.user_id ? 'activated' : 'pending';
  db.prepare('UPDATE activation_codes SET status = ? WHERE id = ?').run(newStatus, req.params.id);
  console.log(`[激活码] 恢复激活码 ID=${req.params.id}`);
  res.json({ message: '已恢复' });
});

router.delete('/codes/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM activation_codes WHERE id = ?').run(req.params.id);
  console.log(`[激活码] 删除激活码 ID=${req.params.id}`);
  res.json({ message: '已删除' });
});

// ========== 用户管理 ==========
router.get('/users', (_req, res) => {
  const db = getDB();
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// ========== 客户端更新管理 ==========
router.get('/updates', (_req, res) => {
  const db = getDB();
  const updates = db.prepare('SELECT * FROM app_updates ORDER BY id DESC').all();
  res.json(updates);
});

router.post('/updates', (req, res) => {
  const { version, platform, download_url, changelog, force_update } = req.body;
  const db = getDB();
  const result = db.prepare('INSERT INTO app_updates (version, platform, download_url, changelog, force_update) VALUES (?, ?, ?, ?, ?)')
    .run(version, platform, download_url, changelog || '', force_update ? 1 : 0);
  console.log(`[更新] 发布更新 v${version} (${platform})`);
  res.json({ id: result.lastInsertRowid, message: '发布成功' });
});

router.delete('/updates/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM app_updates WHERE id = ?').run(req.params.id);
  console.log(`[更新] 删除更新 ID=${req.params.id}`);
  res.json({ message: '删除成功' });
});
// ========== QQ群管理 ==========
router.get('/qq-groups', (_req, res) => {
  const db = getDB();
  const groups = db.prepare('SELECT * FROM qq_groups ORDER BY sort_order ASC').all();
  res.json(groups);
});

router.post('/qq-groups', (req, res) => {
  const { name, number, is_full, sort_order } = req.body;
  const db = getDB();
  const result = db.prepare('INSERT INTO qq_groups (name, number, is_full, sort_order) VALUES (?, ?, ?, ?)')
    .run(name, number, is_full ? 1 : 0, sort_order || 0);
  console.log(`[QQ群] 新增群: ${name}`);
  res.json({ id: result.lastInsertRowid, message: '创建成功' });
});

router.put('/qq-groups/:id', (req, res) => {
  const { name, number, is_full, sort_order } = req.body;
  const db = getDB();
  db.prepare('UPDATE qq_groups SET name = ?, number = ?, is_full = ?, sort_order = ? WHERE id = ?')
    .run(name, number, is_full ? 1 : 0, sort_order || 0, req.params.id);
  console.log(`[QQ群] 编辑群 ID=${req.params.id}`);
  res.json({ message: '更新成功' });
});

router.delete('/qq-groups/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM qq_groups WHERE id = ?').run(req.params.id);
  console.log(`[QQ群] 删除群 ID=${req.params.id}`);
  res.json({ message: '删除成功' });
});

// ========== 协议管理 ==========
router.get('/agreements', (_req, res) => {
  const db = getDB();
  const agreements = db.prepare('SELECT * FROM agreements ORDER BY id ASC').all();
  res.json(agreements);
});

router.put('/agreements/:type', (req, res) => {
  const { title_zh, title_en, content_zh, content_en } = req.body;
  const db = getDB();
  db.prepare(`UPDATE agreements SET title_zh = ?, title_en = ?, content_zh = ?, content_en = ?, updated_at = datetime('now') WHERE type = ?`)
    .run(title_zh, title_en, content_zh, content_en, req.params.type);
  console.log(`[协议] 更新协议: ${req.params.type}`);
  res.json({ message: '更新成功' });
});

export default router;
