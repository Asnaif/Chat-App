import { Request, Response, NextFunction } from 'express';
import { Setting } from '../models/Setting';
import { Block } from '../models/Block';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export const getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    let settings = await Setting.findOne({ userId });

    if (!settings) {
      settings = await Setting.create({ userId });
    }

    sendSuccess({
      res,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { theme, lastSeenPrivacy, profilePhotoPrivacy, readReceipts } = req.body;

    const updated = await Setting.findOneAndUpdate(
      { userId },
      {
        ...(theme ? { theme } : {}),
        ...(lastSeenPrivacy ? { lastSeenPrivacy } : {}),
        ...(profilePhotoPrivacy ? { profilePhotoPrivacy } : {}),
        ...(readReceipts !== undefined ? { readReceipts } : {}),
      },
      { new: true, upsert: true }
    );

    sendSuccess({
      res,
      message: 'Settings updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const blocks = await Block.find({ ownerId: userId }).populate('blockedUserId', 'name email avatarUrl');

    sendSuccess({
      res,
      data: blocks,
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = req.user?.userId;
    const { blockedUserId } = req.body;

    if (!blockedUserId) {
      throw new ApiError(400, 'blockedUserId is required', 'VALIDATION_ERROR');
    }

    if (ownerId === blockedUserId) {
      throw new ApiError(400, 'Cannot block yourself', 'INVALID_OPERATION');
    }

    const block = await Block.findOneAndUpdate(
      { ownerId, blockedUserId },
      { ownerId, blockedUserId },
      { upsert: true, new: true }
    );

    sendSuccess({
      res,
      message: 'User blocked successfully',
      data: block,
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = req.user?.userId;
    const userId = req.params.userId as string;

    await Block.findOneAndDelete({ ownerId, blockedUserId: userId });

    sendSuccess({
      res,
      message: 'User unblocked successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
