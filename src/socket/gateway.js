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
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';

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
    const { emailId, role, agentId, name } = socket.data.user;
    const gatewayId = config.gatewayId;
    const userRoom = `user:${emailId}`;

    console.log(`[Gateway:${gatewayId}] Client connected: ${emailId} (${role}) socket ${socket.id}`);

    // Join Socket.io room for targeted fan-out across server instances
    socket.join(userRoom);

    const isAdminUser = role === 'admin';
    if (isAdminUser) {
      socket.join('admins');
      console.log(`[Gateway:${gatewayId}] Admin connected and joined admins room: ${emailId}`);
    }

    // Register presence in Redis (TTL 60s)
    await setPresence(emailId, gatewayId, 60);

    // Auto-deliver all pending messages sent to this user while they were offline
    try {
      const undeliveredMessages = await Message.find({
        recipientId: emailId,
        status: 'sent'
      });

      if (undeliveredMessages.length > 0) {
        const messageIds = undeliveredMessages.map(m => m._id);
        
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { status: 'delivered' } }
        );

        // Group by sender to notify them
        const senderGroups = {};
        for (const msg of undeliveredMessages) {
          if (!senderGroups[msg.senderId]) {
            senderGroups[msg.senderId] = [];
          }
          senderGroups[msg.senderId].push(msg._id);
        }

        // Notify each sender that their messages have been delivered
        for (const [senderId, msgIds] of Object.entries(senderGroups)) {
          for (const mId of msgIds) {
            io.to(`user:${senderId}`).emit('message:delivered', {
              messageId: mId,
              deliveredAt: new Date()
            });
          }
        }
      }
    } catch (err) {
      console.error(`[Gateway] Offline message delivery failure for ${emailId}:`, err);
    }

    // Periodic Heartbeat to renew presence TTL
    const heartbeatInterval = setInterval(async () => {
      try {
        await renewPresence(emailId, gatewayId, 60);
      } catch (err) {
        console.error(`[Gateway] Heartbeat failed for ${emailId}:`, err.message);
      }
    }, 30000);

    // ----------------------------------------------------
    // Event: message:send
    // ----------------------------------------------------
    socket.on('message:send', async (data, ackCallback) => {
      try {
        // Rate limiting check
        const rateCheck = await checkRateLimit(emailId, 'message:send', 60, 60);
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

        if (!['text', 'voice', 'image'].includes(type)) {
          const errPayload = { error: 'Invalid message type' };
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

        // Determine agentId & emailId for Conversation mapping
        let currentAgentId = (role === 'agent' || role === 'admin') ? emailId : agentId || recipientId;
        let currentEmailId = role === 'user' ? emailId : recipientId;

        // Try to fetch existing conversation to lock roles
        const existingConv = await Conversation.findById(conversationId);
        if (existingConv) {
          currentAgentId = existingConv.agentId;
          currentEmailId = existingConv.emailId;

          // Enforce active participant authorization check
          if (emailId !== existingConv.agentId && emailId !== existingConv.emailId) {
            const errPayload = { error: 'Unauthorized: You are not a participant in this conversation.' };
            if (typeof ackCallback === 'function') ackCallback(errPayload);
            return socket.emit('error', errPayload);
          }
        } else {
          // If starting a new virtual conversation, validate authorization
          if (role === 'user') {
            // Normal players can only start a chat with their assigned agent
            if (recipientId !== agentId) {
              const errPayload = { error: 'Unauthorized: Users can only message their assigned agent.' };
              if (typeof ackCallback === 'function') ackCallback(errPayload);
              return socket.emit('error', errPayload);
            }
          } else if (role === 'agent' || role === 'admin') {
            // Normal agents (non-admin) can only start a chat with users assigned to them
            const isAdminSender = role === 'admin';
            if (!isAdminSender) {
              const userObj = await User.findOne({ emailId: recipientId });
              if (!userObj) {
                const errPayload = { error: 'Recipient user not found.' };
                if (typeof ackCallback === 'function') ackCallback(errPayload);
                return socket.emit('error', errPayload);
              }
              const userAgentId = userObj.agentId?._id || userObj.agentId;
              if (String(userAgentId) !== String(emailId)) {
                const errPayload = { error: 'Unauthorized: Agents can only message users assigned to them.' };
                if (typeof ackCallback === 'function') ackCallback(errPayload);
                return socket.emit('error', errPayload);
              }
            }
          }
        }

        // Dynamically determine recipientType based on whether the recipient is an agent
        let recipientType = (role === 'agent' || role === 'admin') ? 'user' : 'agent';
        try {
          const recipientAgent = await Agent.findOne({ $or: [{ emailId: recipientId }, { _id: recipientId }] });
          if (recipientAgent) {
            recipientType = 'agent';
          } else {
            const recipientUser = await User.findOne({ $or: [{ emailId: recipientId }, { _id: recipientId }] });
            if (recipientUser) {
              recipientType = 'user';
            }
          }
        } catch (dbErr) {
          console.error(`[Gateway] Error querying recipient type in MongoDB for ${recipientId}:`, dbErr.message);
        }

        const messagePayload = {
          _id: messageId,
          conversationId,
          senderId: emailId,
          senderType: role,
          type,
          text: type === 'text' ? text : undefined,
          audio: type === 'voice' ? audio : undefined,
          image: type === 'image' ? image : undefined,
          status: 'sent',
          createdAt,
          agentId: currentAgentId,
          emailId: currentEmailId,
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
        console.error(`[Gateway] Error in message:send for ${emailId}:`, err);
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
        console.error(`[Gateway] Error in message:delivered for ${emailId}:`, err);
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
        const unreadField = (role === 'agent' || role === 'admin') ? 'unread.agent' : 'unread.user';
        await Conversation.updateOne({ _id: conversationId }, { $set: { [unreadField]: 0 } });

        // 3. Relay read receipt back to sender's room
        io.to(`user:${senderId}`).emit('message:read', {
          conversationId,
          readBy: emailId,
          messageIds: messageIds || [],
          modifiedCount: result.modifiedCount,
          readAt: new Date()
        });

        if (typeof ackCallback === 'function') ackCallback(null, { success: true, count: result.modifiedCount });
      } catch (err) {
        console.error(`[Gateway] Error in message:read for ${emailId}:`, err);
      }
    });

    // ----------------------------------------------------
    // Event: presence:check
    // ----------------------------------------------------
    socket.on('presence:check', async (data, ackCallback) => {
      try {
        const targetEmailId = typeof data === 'string' ? data : data?.emailId;
        if (!targetEmailId) return;

        const online = await isOnline(targetEmailId);
        const result = { emailId: targetEmailId, isOnline: online };

        if (typeof ackCallback === 'function') ackCallback(null, result);
        socket.emit('presence:res', result);
      } catch (err) {
        console.error(`[Gateway] Error in presence:check for ${emailId}:`, err);
      }
    });

    // ----------------------------------------------------
    // Disconnect cleanup
    // ----------------------------------------------------
    socket.on('disconnect', async (reason) => {
      console.log(`[Gateway:${gatewayId}] Client disconnected: ${emailId} (${reason})`);
      clearInterval(heartbeatInterval);
      try {
        await removePresence(emailId);
      } catch (err) {
        console.error(`[Gateway] Failed to remove presence for ${emailId}:`, err.message);
      }
    });
  });

  return io;
}
