import { Request, Response, NextFunction } from 'express';
import { Group } from '../models/Group';
import { Chat } from '../models/Chat';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { getIO } from '../sockets';
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

    // Notify all members about the new group
    try {
      const io = getIO();
      uniqueMemberIds.forEach((uid) => {
        io.to(`user:${uid.toString()}`).emit('group:created', populatedGroup);
        io.to(`user:${uid.toString()}`).emit('chat:updated', {
          chatId: chat._id,
          chat,
        });
      });
    } catch (_) {}

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

export const addMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const currentUserId = req.user?.userId;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError(400, 'userIds array is required', 'VALIDATION_ERROR');
    }

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found', 'GROUP_NOT_FOUND');
    }

    // Verify requester is group admin
    const requester = group.members.find((m) => m.userId.toString() === currentUserId);
    if (!requester || requester.role !== 'admin') {
      throw new ApiError(403, 'Only group admins can add new members', 'AUTH_FORBIDDEN');
    }

    const existingMemberIds = new Set(group.members.map((m) => m.userId.toString()));
    const newMembersToAdd: Array<{ userId: mongoose.Types.ObjectId; role: 'member'; joinedAt: Date }> = [];

    userIds.forEach((id: string) => {
      if (!existingMemberIds.has(id)) {
        existingMemberIds.add(id);
        newMembersToAdd.push({
          userId: new mongoose.Types.ObjectId(id),
          role: 'member',
          joinedAt: new Date(),
        });
      }
    });

    if (newMembersToAdd.length === 0) {
      sendSuccess({
        res,
        message: 'All specified users are already members of this group',
        data: group,
      });
      return;
    }

    group.members.push(...newMembersToAdd);
    await group.save();

    // Also update associated Chat participants
    const chat = await Chat.findById(group.chatId);
    if (chat) {
      const chatParticipantSet = new Set(chat.participantIds.map((p) => p.toString()));
      newMembersToAdd.forEach((m) => chatParticipantSet.add(m.userId.toString()));
      chat.participantIds = Array.from(chatParticipantSet).map((id) => new mongoose.Types.ObjectId(id));
      await chat.save();
    }

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl status')
      .populate('createdBy', 'name email avatarUrl');

    // Notify room and new members
    try {
      const io = getIO();
      io.to(`chat:${group.chatId}`).emit('group:members_added', {
        groupId: group._id,
        chatId: group.chatId,
        newMembers: newMembersToAdd,
        group: updatedGroup,
      });

      newMembersToAdd.forEach((m) => {
        io.to(`user:${m.userId.toString()}`).emit('group:invited', updatedGroup);
      });
    } catch (_) {}

    sendSuccess({
      res,
      message: 'Members added successfully',
      data: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const userIdToRemove = req.params.userId as string;
    const currentUserId = req.user?.userId;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found', 'GROUP_NOT_FOUND');
    }

    const requester = group.members.find((m) => m.userId.toString() === currentUserId);
    const isSelfRemoval = currentUserId === userIdToRemove;

    // Must be admin or removing self (leave group)
    if (!isSelfRemoval && (!requester || requester.role !== 'admin')) {
      throw new ApiError(403, 'Only group admins can remove other members', 'AUTH_FORBIDDEN');
    }

    // Filter out the member
    group.members = group.members.filter((m) => m.userId.toString() !== userIdToRemove);
    await group.save();

    // Also remove from Chat participants
    const chat = await Chat.findById(group.chatId);
    if (chat) {
      chat.participantIds = chat.participantIds.filter((p) => p.toString() !== userIdToRemove);
      await chat.save();
    }

    // Realtime notification
    try {
      const io = getIO();
      io.to(`chat:${group.chatId}`).emit('group:member_removed', {
        groupId: group._id,
        chatId: group.chatId,
        removedUserId: userIdToRemove,
      });

      io.to(`user:${userIdToRemove}`).emit('group:removed', {
        groupId: group._id,
        chatId: group.chatId,
      });
    } catch (_) {}

    sendSuccess({
      res,
      message: isSelfRemoval ? 'You left the group successfully' : 'Member removed successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groupId = req.params.groupId as string;
    const currentUserId = req.user?.userId;
    const { name, description, avatarUrl } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found', 'GROUP_NOT_FOUND');
    }

    const requester = group.members.find((m) => m.userId.toString() === currentUserId);
    if (!requester || requester.role !== 'admin') {
      throw new ApiError(403, 'Only group admins can update group settings', 'AUTH_FORBIDDEN');
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatarUrl !== undefined) group.avatarUrl = avatarUrl;
    await group.save();

    // Update associated Chat
    const chat = await Chat.findById(group.chatId);
    if (chat) {
      if (name) chat.title = name;
      if (avatarUrl !== undefined) chat.avatarUrl = avatarUrl;
      await chat.save();
    }

    const updatedGroup = await Group.findById(group._id)
      .populate('members.userId', 'name email avatarUrl status')
      .populate('createdBy', 'name email avatarUrl');

    try {
      const io = getIO();
      io.to(`chat:${group.chatId}`).emit('group:updated', updatedGroup);
    } catch (_) {}

    sendSuccess({
      res,
      message: 'Group updated successfully',
      data: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};
