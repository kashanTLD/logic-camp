import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import { JwtPayload } from 'jsonwebtoken';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const decoded = verifyAccessToken(token);
    
    // Type guard to ensure decoded is a JwtPayload with userId
    if (typeof decoded === 'string' || !decoded.userId) {
      res.status(401).json({ success: false, message: 'Invalid token format.' });
      return;
    }

    const user = await User.findById((decoded as JwtPayload & { userId: string }).userId);
    
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Invalid token.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Access denied.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions.' });
      return;
    }

    next();
  };
};
