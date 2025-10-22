import jwt, { JwtPayload } from 'jsonwebtoken';

export const generateAccessToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { userId, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '24h' } as any
  );
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  
  return jwt.sign(
    { userId },
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' } as any
  );
};

export const verifyAccessToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.verify(token, secret);
};

export const verifyRefreshToken = (token: string): JwtPayload | string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  
  return jwt.verify(token, secret);
};
