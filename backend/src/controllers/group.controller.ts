import { Request, Response, NextFunction } from 'express';
import { Group } from '../models/Group';
import { Chat } from '../models/Chat';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import mongoose from 'mongoose';

export const createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const { name, description, avatarUrl, memberIds = [] } = req.body;

    if (!name) {
      throw new ApiError(400, 'Group name is required', 'VALIDATION_ERROR');
    }

    const uniqueMemberIds = Array.from(new Set([currentUserId, ...memberIds])).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // 1. Create group chat
    const chat = await Chat.create({
      type: 'group',
      participantIds: uniqueMemberIds,
      title: name,
      avatarUrl,
    });

    // 2. Create group record
    const members = uniqueMemberIds.map((uid) => ({
      userId: uid,
      role: uid.toString() === currentUserId ? ('admin' as const) : ('member' as const),
      joinedAt: new Date(),
    }));

    const group = await Group.create({
      chatId: chat._id,
      name,
      description,
      avatarUrl,
      createdBy: currentUserId,
      members,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl status')
      .populate('createdBy', 'name email avatarUrl');

    sendSuccess({
      res,
      statusCode: 201,
      message: 'Group created successfully',
      data: populatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const groups = await Group.find({ 'members.userId': currentUserId })
      .populate('members.userId', 'name email avatarUrl status')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    sendSuccess({
      res,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroupDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const group = await Group.findById(groupId)
      .populate('members.userId', 'name email avatarUrl status lastSeenAt')
      .populate('createdBy', 'name email avatarUrl');

    if (!group) {
      throw new ApiError(404, 'Group not found', 'GROUP_NOT_FOUND');
    }

    sendSuccess({
      res,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};
