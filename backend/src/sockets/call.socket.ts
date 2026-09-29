import { Server, Socket } from 'socket.io';
import { Call } from '../models/Call';

export const registerCallHandlers = (io: Server, socket: Socket): void => {
  const userId = socket.data.user?.userId;

  socket.on(
    'call:offer',
    async ({
      callId,
      toUserId,
      sdp,
      mediaType = 'audio',
      callerInfo,
    }: {
      callId?: string;
      toUserId: string;
      sdp: any;
      mediaType?: 'audio' | 'video';
      callerInfo?: { name: string; avatarUrl?: string };
    }) => {
      try {
        let resolvedCallId = callId;
        if (!callId) {
          const activeCall = await Call.create({
            callerId: userId,
            receiverId: toUserId,
            type: mediaType,
            status: 'dialing',
          });
          resolvedCallId = activeCall._id.toString();

          // Send the callId back to the caller so they can reference it in future events
          socket.emit('call:created', { callId: resolvedCallId });
        }

        io.to(`user:${toUserId}`).emit('call:incoming', {
          callId: resolvedCallId,
          callerId: userId,
          callerName: callerInfo?.name || 'Incoming Caller',
          callerAvatar: callerInfo?.avatarUrl,
          sdp,
          mediaType,
        });

        console.log(`[Socket] Call offer relayed: ${resolvedCallId} from ${userId} to ${toUserId}`);
      } catch (err) {
        console.error('[Socket call:offer Error]:', err);
      }
    }
  );

  socket.on(
    'call:answer',
    async ({ callId, toUserId, sdp }: { callId: string; toUserId: string; sdp: any }) => {
      try {
        await Call.findByIdAndUpdate(callId, {
          status: 'active',
          answeredAt: new Date(),
        });

        io.to(`user:${toUserId}`).emit('call:answered', {
          callId,
          fromUserId: userId,
          sdp,
        });

        console.log(`[Socket] Call answered: ${callId} by ${userId}, relayed to ${toUserId}`);
      } catch (err) {
        console.error('[Socket call:answer Error]:', err);
      }
    }
  );

  socket.on(
    'call:ice-candidate',
    ({ callId, toUserId, candidate }: { callId: string; toUserId: string; candidate: any }) => {
      io.to(`user:${toUserId}`).emit('call:ice-candidate', {
        callId,
        fromUserId: userId,
        candidate,
      });
      // ICE candidates are high-frequency; only log type for debugging
      console.log(`[Socket] ICE candidate relayed: ${callId} from ${userId} to ${toUserId}`);
    }
  );

  socket.on('call:reject', async ({ callId, toUserId }: { callId: string; toUserId: string }) => {
    try {
      await Call.findByIdAndUpdate(callId, {
        status: 'rejected',
        endedAt: new Date(),
      });
      io.to(`user:${toUserId}`).emit('call:rejected', { callId, fromUserId: userId });
    } catch (err) {
      console.error('[Socket call:reject Error]:', err);
    }
  });

  socket.on('call:end', async ({ callId, toUserId }: { callId: string; toUserId: string }) => {
    try {
      const call = await Call.findById(callId);
      if (call) {
        const endedAt = new Date();
        const durationSec = call.answeredAt
          ? Math.round((endedAt.getTime() - call.answeredAt.getTime()) / 1000)
          : 0;

        call.status = 'ended';
        call.endedAt = endedAt;
        call.durationSec = durationSec;
        await call.save();
      }

      io.to(`user:${toUserId}`).emit('call:ended', { callId, fromUserId: userId });
    } catch (err) {
      console.error('[Socket call:end Error]:', err);
    }
  });
};
