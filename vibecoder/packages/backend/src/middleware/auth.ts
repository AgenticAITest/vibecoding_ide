import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.js';

export interface AuthUser {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Try Authorization header first, then fall back to ?token= query param.
  // The query param fallback is needed for iframe src URLs (like the preview proxy)
  // where the browser cannot send custom headers.
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role,
  };
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
