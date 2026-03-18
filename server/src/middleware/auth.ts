import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'startup-manager-secret-key-2025';

export { JWT_SECRET };

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    // 先尝试忽略过期验证（用户token永不过期）
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as { id: string; type: string };
    // 管理员token仍然检查过期
    if (decoded.type === 'admin') {
      jwt.verify(token, JWT_SECRET); // 会检查exp
    }
    req.userId = decoded.id;
    req.isAdmin = decoded.type === 'admin';
    next();
  } catch (err: any) {
    console.error(`[Auth] JWT验证失败: ${err.name} - ${err.message}. Token: ${token.substring(0, 20)}...`);
    return res.status(401).json({ error: '登录已过期' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '无管理员权限' });
  }
  next();
}
