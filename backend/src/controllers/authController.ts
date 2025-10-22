import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/passwordUtils';
import { generateAccessToken, generateRefreshToken } from '../services/tokenService';

interface AuthRequest extends Request {
  user?: any;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, department, designation } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role,
      department,
      designation
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: user.toJSON() }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, is_active: true }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const userId = user._id?.toString() || '';
    const accessToken = generateAccessToken(userId, user.role);
    const refreshToken = generateRefreshToken(userId);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        tokens: { accessToken, refreshToken }
      }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: { user: req.user.toJSON() }
  });
};
