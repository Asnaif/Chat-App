import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, 'Name, email, and password are required', 'VALIDATION_ERROR');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'An account with this email already exists', 'AUTH_DUPLICATE_EMAIL');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      status: 'offline',
    });

    const token = signToken({ userId: newUser._id.toString(), email: newUser.email });

    sendSuccess({
      res,
      statusCode: 201,
      message: 'Registration successful',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          avatarUrl: newUser.avatarUrl,
          about: newUser.about,
          status: newUser.status,
          createdAt: newUser.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    const token = signToken({ userId: user._id.toString(), email: user.email });

    sendSuccess({
      res,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          about: user.about,
          status: user.status,
          lastSeenAt: user.lastSeenAt,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess({
      res,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
