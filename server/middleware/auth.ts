import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Read at call time, not import time, so .env is loaded first
function getSecret(): string {
  return process.env.JWT_SECRET || 'stockflow-secret-key-change-in-production';
}

export interface AuthRequest extends Request {
  userId?: string;
  userLoginId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, getSecret()) as any;
    req.userId = decoded.userId;
    req.userLoginId = decoded.loginId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: string, loginId: string): string {
  return jwt.sign({ userId, loginId }, getSecret(), { expiresIn: '7d' });
}

export { getSecret as getJwtSecret };
