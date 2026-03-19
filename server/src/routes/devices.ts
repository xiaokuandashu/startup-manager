import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/devices/heartbeat
 * 桌面端定期上报系统信息
 * Body: { device_id, name, platform, hostname, os_version, cpu, cpu_temp,
 *         memory, memory_used, memory_total, disk, disk_used, disk_total, tasks_running }
 * Header: Authorization: Bearer <token>
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

    // UPSERT: 存在则更新，不存在则插入
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
 * Header: Authorization: Bearer <token>
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

    // 获取设备列表（最多100台），在线的排前面
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

export default router;
