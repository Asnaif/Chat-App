import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Setting } from '../models/Setting';
import { Block } from '../models/Block';
import { Session } from '../models/Session';
import { User } from '../models/User';
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
    const {
      theme,
      lastSeenPrivacy,
      profilePhotoPrivacy,
      aboutPrivacy,
      groupPrivacy,
      readReceipts,
      keyboardShortcuts,
      securityNotifications,
    } = req.body;

    const updated = await Setting.findOneAndUpdate(
      { userId },
      {
        ...(theme !== undefined ? { theme } : {}),
        ...(lastSeenPrivacy !== undefined ? { lastSeenPrivacy } : {}),
        ...(profilePhotoPrivacy !== undefined ? { profilePhotoPrivacy } : {}),
        ...(aboutPrivacy !== undefined ? { aboutPrivacy } : {}),
        ...(groupPrivacy !== undefined ? { groupPrivacy } : {}),
        ...(readReceipts !== undefined ? { readReceipts } : {}),
        ...(keyboardShortcuts !== undefined ? { keyboardShortcuts } : {}),
        ...(securityNotifications !== undefined ? { securityNotifications } : {}),
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

// Day 5 Security: List Active Sessions
export const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const currentSessionId = req.user?.sessionId;

    const sessions = await Session.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActive: -1 });

    const formattedSessions = sessions.map((s) => ({
      id: s._id,
      sessionId: s.sessionId,
      userAgent: s.userAgent,
      ip: s.ip,
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      isCurrent: s.sessionId === currentSessionId,
    }));

    sendSuccess({
      res,
      data: formattedSessions,
    });
  } catch (error) {
    next(error);
  }
};

// Day 5 Security: Revoke a specific session
export const revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId as string;

    const session = await Session.findOneAndUpdate(
      {
        userId,
        $or: [{ sessionId }, { _id: sessionId.match(/^[0-9a-fA-F]{24}$/) ? sessionId : null }],
      },
      { revokedAt: new Date() },
      { new: true }
    );

    if (!session) {
      throw new ApiError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    sendSuccess({
      res,
      message: 'Session revoked successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Day 5 Security: Revoke all other sessions (Logout from all other devices)
export const revokeAllOtherSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const currentSessionId = req.user?.sessionId;

    await Session.updateMany(
      {
        userId,
        sessionId: { $ne: currentSessionId },
        revokedAt: null,
      },
      { revokedAt: new Date() }
    );

    sendSuccess({
      res,
      message: 'All other sessions have been logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Day 5 Security: Change Password
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ApiError(400, 'Both oldPassword and newPassword are required', 'VALIDATION_ERROR');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters long', 'VALIDATION_ERROR');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'Current password is incorrect', 'AUTH_INVALID_CREDENTIALS');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Revoke other sessions for security
    const currentSessionId = req.user?.sessionId;
    await Session.updateMany(
      {
        userId,
        sessionId: { $ne: currentSessionId },
        revokedAt: null,
      },
      { revokedAt: new Date() }
    );

    sendSuccess({
      res,
      message: 'Password changed successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

