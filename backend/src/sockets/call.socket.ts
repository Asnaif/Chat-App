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
    }: {
      callId?: string;
      toUserId: string;
      sdp: any;
      mediaType?: 'audio' | 'video';
    }) => {
      try {
        let activeCall;
        if (!callId) {
          activeCall = await Call.create({
            callerId: userId,
            receiverId: toUserId,
            type: mediaType,
            status: 'dialing',
          });
        }

        io.to(`user:${toUserId}`).emit('call:incoming', {
          callId: callId || activeCall?._id,
          callerId: userId,
          sdp,
          mediaType,
        });
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
