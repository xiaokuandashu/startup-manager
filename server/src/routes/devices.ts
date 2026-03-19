import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/devices/heartbeat
 * 桌面端定期上报系统信息
 */
router.post('/heartbeat', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      device_id, name, platform, hostname, os_version,
      cpu, cpu_temp, memory, memory_used, memory_total,
      disk, disk_used, disk_total, tasks_running
    } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: '缺少 device_id' });
    }

    const db = getDB();

    db.prepare(`
      INSERT INTO devices (user_id, device_id, name, platform, hostname, os_version,
        cpu, cpu_temp, memory, memory_used, memory_total,
        disk, disk_used, disk_total, tasks_running, online, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, device_id) DO UPDATE SET
        name = excluded.name,
        platform = excluded.platform,
        hostname = excluded.hostname,
        os_version = excluded.os_version,
        cpu = excluded.cpu,
        cpu_temp = excluded.cpu_temp,
        memory = excluded.memory,
        memory_used = excluded.memory_used,
        memory_total = excluded.memory_total,
        disk = excluded.disk,
        disk_used = excluded.disk_used,
        disk_total = excluded.disk_total,
        tasks_running = excluded.tasks_running,
        online = 1,
        last_seen = datetime('now')
    `).run(
      userId, device_id,
      name || '', platform || '', hostname || '', os_version || '',
      cpu || 0, cpu_temp || 0, memory || 0, memory_used || 0, memory_total || 0,
      disk || 0, disk_used || 0, disk_total || 0, tasks_running || 0
    );

    res.json({ ok: true });
  } catch (e: any) {
    console.error('[devices/heartbeat]', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/devices
 * 手机端获取当前用户所有设备列表
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();

    // 将超过 2 分钟没心跳的设备标记为离线
    db.prepare(`
      UPDATE devices SET online = 0
      WHERE user_id = ? AND last_seen < datetime('now', '-2 minutes')
    `).run(userId);

    const devices = db.prepare(`
      SELECT device_id, name, platform, hostname, os_version, ip,
             cpu, cpu_temp, memory, memory_used, memory_total,
             disk, disk_used, disk_total, tasks_running,
             online, last_seen
      FROM devices
      WHERE user_id = ?
      ORDER BY online DESC, last_seen DESC
      LIMIT 100
    `).all(userId);

    res.json({
      devices,
      total: devices.length,
      max: 100,
      remaining: Math.max(0, 100 - devices.length),
    });
  } catch (e: any) {
    console.error('[devices/list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== 以下是【具名路由】，必须放在 /:deviceId 之前 ==========

/**
 * GET /api/devices/tasks/summary
 * 获取当前用户所有设备的任务统计
 */
router.get('/tasks/summary', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDB();

    const running = db.prepare(
      `SELECT COALESCE(SUM(tasks_running), 0) as count FROM devices WHERE user_id = ? AND online = 1`
    ).get(userId) as any;

    const completed = db.prepare(
      `SELECT COUNT(*) as count FROM activity_log WHERE user_id = ? AND action = 'task_complete'`
    ).get(userId) as any;

    const pending = db.prepare(
      `SELECT COUNT(*) as count FROM activity_log WHERE user_id = ? AND action = 'task_pending'`
    ).get(userId) as any;

    res.json({
      running: running?.count || 0,
      completed: completed?.count || 0,
      pending: pending?.count || 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/devices/activity-log
 * 获取最近操作记录
 */
router.get('/activity-log', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const db = getDB();

    const logs = db.prepare(`
      SELECT id, device_id, device_name, action, detail, status, created_at
      FROM activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);

    res.json({ logs });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/devices/activity-log
 * PC端上报操作记录
 */
router.post('/activity-log', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { device_id, device_name, action, detail, status } = req.body;
    const db = getDB();

    db.prepare(`
      INSERT INTO activity_log (user_id, device_id, device_name, action, detail, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, device_id || '', device_name || '', action || '', detail || '', status || 'success');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/devices/updates/check
 * 手机端检查更新
 * Query: platform=android&version=1.0.0
 */
router.get('/updates/check', (req: Request, res: Response) => {
  try {
    const platform = (req.query.platform as string) || 'android';
    const currentVersion = (req.query.version as string) || '0.0.0';
    const db = getDB();

    const latest = db.prepare(`
      SELECT version, download_url, changelog, force_update
      FROM app_updates
      WHERE platform = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(platform) as any;

    if (latest && latest.version !== currentVersion) {
      res.json({
        has_update: true,
        version: latest.version,
        download_url: latest.download_url,
        changelog: latest.changelog,
        force_update: latest.force_update === 1,
      });
    } else {
      res.json({ has_update: false });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== 以下是【参数路由】，必须放在最后 ==========

/**
 * GET /api/devices/:deviceId
 * 获取单个设备详情
 */
router.get('/:deviceId', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { deviceId } = req.params;
    const db = getDB();

    const device = db.prepare(`
      SELECT device_id, name, platform, hostname, os_version, ip,
             cpu, cpu_temp, memory, memory_used, memory_total,
             disk, disk_used, disk_total, tasks_running,
             online, last_seen
      FROM devices
      WHERE user_id = ? AND device_id = ?
    `).get(userId, deviceId);

    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    res.json(device);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /api/devices/:deviceId
 * 远程退出设备登录（删除设备记录）
 */
router.delete('/:deviceId', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { deviceId } = req.params;
    const db = getDB();

    db.prepare('DELETE FROM devices WHERE user_id = ? AND device_id = ?').run(userId, deviceId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
