import { Request, Response, NextFunction } from 'express';
import { Call } from '../models/Call';
import { sendSuccess } from '../utils/apiResponse';

export const getCallHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;

    const calls = await Call.find({
      $or: [{ callerId: currentUserId }, { receiverId: currentUserId }],
    })
      .populate('callerId', 'name avatarUrl')
      .populate('receiverId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50);

    sendSuccess({
      res,
      data: calls,
    });
  } catch (error) {
    next(error);
  }
};

export const createCallLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const { receiverId, type, status, durationSec } = req.body;

    const call = await Call.create({
      callerId: currentUserId,
      receiverId,
      type,
      status,
      durationSec: durationSec || 0,
    });

    sendSuccess({
      res,
      statusCode: 201,
      data: call,
    });
  } catch (error) {
    next(error);
  }
};
