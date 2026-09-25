import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Block } from '../models/Block';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    sendSuccess({
      res,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, about, avatarUrl } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.userId,
      {
        ...(name ? { name } : {}),
        ...(about !== undefined ? { about } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    sendSuccess({
      res,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query.search as string;
    const currentUserId = req.user?.userId;

    let filter: any = { _id: { $ne: currentUserId } };

    if (query && query.trim().length > 0) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .limit(20)
      .sort({ name: 1 });

    sendSuccess({
      res,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetUserId = req.params.userId as string;
    const currentUserId = req.user?.userId;

    const user = await User.findById(targetUserId).select('-passwordHash');
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const isBlocked = await Block.exists({
      ownerId: currentUserId,
      blockedUserId: targetUserId,
    });

    sendSuccess({
      res,
      data: {
        ...user.toJSON(),
        isBlocked: Boolean(isBlocked),
      },
    });
  } catch (error) {
    next(error);
  }
};
