import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { v4 as uuidv4 } from 'uuid';
import { pubClient, subClient } from '../config/redis.js';
import { config } from '../config/env.js';
import { socketAuthMiddleware } from './authMiddleware.js';
import { setPresence, renewPresence, removePresence, isOnline } from '../services/presence.service.js';
import { checkRateLimit } from '../services/rateLimiter.service.js';
import { enqueueMessage } from '../queue/streamProducer.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

export function setupSocketGateway(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Redis Adapter for horizontal scaling
  io.adapter(createAdapter(pubClient, subClient));

  // Authentication Middleware
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const { userId, role, agentId, name } = socket.data.user;
    const gatewayId = config.gatewayId;
    const userRoom = `user:${userId}`;

    console.log(`[Gateway:${gatewayId}] Client connected: ${userId} (${role}) socket ${socket.id}`);

    // Join Socket.io room for targeted fan-out across server instances
    socket.join(userRoom);

    // Register presence in Redis (TTL 60s)
    await setPresence(userId, gatewayId, 60);

    // Periodic Heartbeat to renew presence TTL
    const heartbeatInterval = setInterval(async () => {
      try {
        await renewPresence(userId, gatewayId, 60);
      } catch (err) {
        console.error(`[Gateway] Heartbeat failed for ${userId}:`, err.message);
      }
    }, 30000);

    // ----------------------------------------------------
    // Event: message:send
    // ----------------------------------------------------
    socket.on('message:send', async (data, ackCallback) => {
      try {
        // Rate limiting check
        const rateCheck = await checkRateLimit(userId, 'message:send', 60, 60);
        if (!rateCheck.allowed) {
          const errPayload = { error: 'Rate limit exceeded for message:send' };
          if (typeof ackCallback === 'function') ackCallback(errPayload);
          return socket.emit('error', errPayload);
        }

        const { conversationId, recipientId, type = 'text', text, audio, image } = data;

        if (!conversationId || !recipientId) {
          const errPayload = { error: 'conversationId and recipientId are required' };
          if (typeof ackCallback === 'function') ackCallback(errPayload);
          return socket.emit('error', errPayload);
        }

        if (type === 'text' && (!text || !text.trim())) {
          const errPayload = { error: 'Text message cannot be empty' };
          if (typeof ackCallback === 'function') ackCallback(errPayload);
          return socket.emit('error', errPayload);
        }

        if (type === 'voice' && (!audio || !audio.key)) {
          const errPayload = { error: 'Voice message audio key is required' };
          if (typeof ackCallback === 'function') ackCallback(errPayload);
          return socket.emit('error', errPayload);
        }

        if (type === 'image' && (!image || !image.key)) {
          const errPayload = { error: 'Image message image key is required' };
          if (typeof ackCallback === 'function') ackCallback(errPayload);
          return socket.emit('error', errPayload);
        }

        const messageId = data._id || uuidv4();
        const createdAt = new Date();

        // Determine agentId & userId for Conversation mapping
        const currentAgentId = role === 'agent' ? userId : agentId || recipientId;
        const currentUserId = role === 'user' ? userId : recipientId;
        const recipientType = role === 'agent' ? 'user' : 'agent';

        const messagePayload = {
          _id: messageId,
          conversationId,
          senderId: userId,
          senderType: role,
          type,
          text: type === 'text' ? text : undefined,
          audio: type === 'voice' ? audio : undefined,
          image: type === 'image' ? image : undefined,
          status: 'sent',
          createdAt,
          agentId: currentAgentId,
          userId: currentUserId,
          recipientId,
          recipientType
        };

        // Push to Redis Streams Queue instead of direct Mongo write
        await enqueueMessage(messagePayload);

        const responsePayload = {
          status: 'queued',
          messageId,
          conversationId,
          createdAt
        };

        if (typeof ackCallback === 'function') {
          ackCallback(null, responsePayload);
        }
        socket.emit('message:queued', responsePayload);
      } catch (err) {
        console.error(`[Gateway] Error in message:send for ${userId}:`, err);
        if (typeof ackCallback === 'function') ackCallback({ error: err.message });
      }
    });

    // ----------------------------------------------------
    // Event: message:delivered
    // ----------------------------------------------------
    socket.on('message:delivered', async (data, ackCallback) => {
      try {
        const { messageId, conversationId, senderId } = data;
        if (!messageId || !senderId) return;

        // Update DB status to 'delivered'
        await Message.updateOne(
          { _id: messageId, status: 'sent' },
          { $set: { status: 'delivered' } }
        );

        // Relay receipt back to sender's room
        io.to(`user:${senderId}`).emit('message:delivered', {
          messageId,
          conversationId,
          deliveredAt: new Date()
        });

        if (typeof ackCallback === 'function') ackCallback(null, { success: true });
      } catch (err) {
        console.error(`[Gateway] Error in message:delivered for ${userId}:`, err);
      }
    });

    // ----------------------------------------------------
    // Event: message:read
    // ----------------------------------------------------
    socket.on('message:read', async (data, ackCallback) => {
      try {
        const { conversationId, senderId, messageIds } = data;
        if (!conversationId || !senderId) return;

        const filter = {
          conversationId,
          senderId,
          status: { $ne: 'read' }
        };

        if (Array.isArray(messageIds) && messageIds.length > 0) {
          filter._id = { $in: messageIds };
        }

        // 1. Update messages in DB to 'read'
        const result = await Message.updateMany(filter, { $set: { status: 'read' } });

        // 2. Reset unread counter for current user in Conversation
        const unreadField = role === 'agent' ? 'unread.agent' : 'unread.user';
        await Conversation.updateOne({ _id: conversationId }, { $set: { [unreadField]: 0 } });

        // 3. Relay read receipt back to sender's room
        io.to(`user:${senderId}`).emit('message:read', {
          conversationId,
          readBy: userId,
          messageIds: messageIds || [],
          modifiedCount: result.modifiedCount,
          readAt: new Date()
        });

        if (typeof ackCallback === 'function') ackCallback(null, { success: true, count: result.modifiedCount });
      } catch (err) {
        console.error(`[Gateway] Error in message:read for ${userId}:`, err);
      }
    });

    // ----------------------------------------------------
    // Event: presence:check
    // ----------------------------------------------------
    socket.on('presence:check', async (data, ackCallback) => {
      try {
        const targetUserId = typeof data === 'string' ? data : data?.userId;
        if (!targetUserId) return;

        const online = await isOnline(targetUserId);
        const result = { userId: targetUserId, isOnline: online };

        if (typeof ackCallback === 'function') ackCallback(null, result);
        socket.emit('presence:res', result);
      } catch (err) {
        console.error(`[Gateway] Error in presence:check for ${userId}:`, err);
      }
    });

    // ----------------------------------------------------
    // Disconnect cleanup
    // ----------------------------------------------------
    socket.on('disconnect', async (reason) => {
      console.log(`[Gateway:${gatewayId}] Client disconnected: ${userId} (${reason})`);
      clearInterval(heartbeatInterval);
      try {
        await removePresence(userId);
      } catch (err) {
        console.error(`[Gateway] Failed to remove presence for ${userId}:`, err.message);
      }
    });
  });

  return io;
}
