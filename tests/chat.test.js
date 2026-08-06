import http from 'http';
import { io as Client } from 'socket.io-client';
import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set test environment flags
process.env.USE_MOCK_REDIS = 'true';

import { app } from '../src/app.js';
import { closeRedisConnections } from '../src/config/redis.js';
import { setupSocketGateway } from '../src/socket/gateway.js';
import { generateToken } from '../src/services/auth.service.js';
import { isOnline } from '../src/services/presence.service.js';
import { processStreamMessage } from '../src/queue/streamWorker.js';
import { Agent } from '../src/models/Agent.js';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';

let httpServer;
let serverPort;
let mongoServer;
const TEST_AGENT_ID = 'agent-test-1';
const TEST_USER_ID = 'user-test-1';
const CONVERSATION_ID = `conv-${TEST_AGENT_ID}-${TEST_USER_ID}`;

async function runTests() {
  console.log('=======================================================');
  console.log(' Starting End-to-End Chat Backend Test Suite');
  console.log('=======================================================');

  try {
    // 1. Start MongoDB In-Memory Server
    console.log('\n[Setup] Starting in-memory Mongo & Redis...');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Setup] In-memory MongoDB connected to ${mongoUri}`);

    // 2. Setup test server
    httpServer = http.createServer(app);
    setupSocketGateway(httpServer);
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        console.log(`[Setup] Test HTTP + Socket server listening on port ${serverPort}`);
        resolve();
      });
    });

    const serverUrl = `http://localhost:${serverPort}`;

    // ----------------------------------------------------
    // TEST 1: Seed Agent and User
    // ----------------------------------------------------
    console.log('\n[Test 1] Seeding Agent and User...');
    await Agent.create({ 
      _id: TEST_AGENT_ID, 
      emailId: 'agent-test-1@luxebet.com', 
      password: 'password123', 
      name: 'Agent Smith', 
      status: 'active' 
    });
    await User.create({ 
      _id: TEST_USER_ID, 
      agentId: TEST_AGENT_ID, 
      emailId: 'user-test-1@example.com', 
      password: 'password123', 
      name: 'Alice', 
      status: 'active' 
    });
    console.log('✔ Agent and User created in MongoDB');

    // ----------------------------------------------------
    // TEST 2: Generate JWT Tokens
    // ----------------------------------------------------
    console.log('\n[Test 2] Generating JWT auth tokens...');
    const agentToken = generateToken({ emailId: TEST_AGENT_ID, role: 'agent', agentId: TEST_AGENT_ID, name: 'Agent Smith' });
    const userToken = generateToken({ emailId: TEST_USER_ID, role: 'user', agentId: TEST_AGENT_ID, name: 'Alice' });
    assert(agentToken && userToken, 'Tokens should be generated');
    console.log('✔ Agent & User tokens generated successfully');

    // ----------------------------------------------------
    // TEST 3: REST API Voice Pre-signed URL Endpoint
    // ----------------------------------------------------
    console.log('\n[Test 3] Testing Voice Presigned URL Endpoint...');
    const voiceRes = await fetch(`${serverUrl}/api/v1/voice/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ conversationId: CONVERSATION_ID, mimeType: 'audio/webm' })
    });
    const voiceData = await voiceRes.json();
    assert.strictEqual(voiceRes.status, 200, 'Voice endpoint should return 200 OK');
    assert(voiceData.uploadUrl, 'Response should contain uploadUrl');
    assert(voiceData.fileKey, 'Response should contain fileKey');
    console.log('✔ Voice pre-signed URL generated:', voiceData.fileKey);

    // ----------------------------------------------------
    // TEST 4: Socket.io Connection & Presence Registration
    // ----------------------------------------------------
    console.log('\n[Test 4] Connecting WebSockets with JWT Handshake Auth...');
    const userSocket = Client(serverUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    const agentSocket = Client(serverUrl, {
      auth: { token: agentToken },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      let connectedCount = 0;
      const checkDone = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      userSocket.on('connect', checkDone);
      agentSocket.on('connect', checkDone);
      userSocket.on('connect_error', (err) => reject(new Error(`User socket connection error: ${err.message}`)));
      agentSocket.on('connect_error', (err) => reject(new Error(`Agent socket connection error: ${err.message}`)));
    });

    console.log('✔ User and Agent sockets connected via JWT Handshake');

    // Check Presence in Redis
    const userOnline = await isOnline(TEST_USER_ID);
    const agentOnline = await isOnline(TEST_AGENT_ID);
    assert.strictEqual(userOnline, true, 'User presence key should exist in Redis');
    assert.strictEqual(agentOnline, true, 'Agent presence key should exist in Redis');
    console.log('✔ Presence registered in Redis (presence:user-test-1 -> gw)');

    // ----------------------------------------------------
    // TEST 5: Realtime Message Send & Stream Persistence Worker
    // ----------------------------------------------------
    console.log('\n[Test 5] Sending message:send via User Socket & Worker Persistence...');
    
    // Listen for message:new on agent socket
    const messageNewPromise = new Promise((resolve) => {
      agentSocket.on('message:new', (data) => {
        console.log('✔ Realtime event message:new received on agent socket:', data._id);
        resolve(data);
      });
    });

    // Send message event from user socket
    const msgId = 'msg-test-100';
    userSocket.emit('message:send', {
      _id: msgId,
      conversationId: CONVERSATION_ID,
      recipientId: TEST_AGENT_ID,
      type: 'text',
      text: 'Hello Agent Smith!'
    });

    // Worker processing Redis stream payload
    await processStreamMessage('stream-id-1', {
      _id: msgId,
      conversationId: CONVERSATION_ID,
      senderId: TEST_USER_ID,
      senderType: 'user',
      type: 'text',
      text: 'Hello Agent Smith!',
      createdAt: new Date(),
      agentId: TEST_AGENT_ID,
      emailId: TEST_USER_ID,
      recipientId: TEST_AGENT_ID,
      recipientType: 'agent'
    });

    const receivedMessage = await messageNewPromise;
    assert.strictEqual(receivedMessage._id, msgId);
    assert.strictEqual(receivedMessage.text, 'Hello Agent Smith!');

    // Verify MongoDB document
    const mongoMsg = await Message.findById(msgId);
    assert(mongoMsg, 'Message document should exist in Mongo');
    assert.strictEqual(mongoMsg.status, 'sent');
    console.log('✔ Message saved to MongoDB with status sent');

    // ----------------------------------------------------
    // TEST 6: Message Delivery Receipt Lifecycle (sent -> delivered)
    // ----------------------------------------------------
    console.log('\n[Test 6] Testing Delivery Receipt (message:delivered)...');
    const deliveredPromise = new Promise((resolve) => {
      userSocket.on('message:delivered', (data) => {
        console.log('✔ Delivery receipt event received on user socket:', data.messageId);
        resolve(data);
      });
    });

    agentSocket.emit('message:delivered', {
      messageId: msgId,
      conversationId: CONVERSATION_ID,
      senderId: TEST_USER_ID
    });

    await deliveredPromise;
    const updatedMongoMsg = await Message.findById(msgId);
    assert.strictEqual(updatedMongoMsg.status, 'delivered', 'Message status should be updated to delivered');
    console.log('✔ MongoDB message status updated to delivered');

    // ----------------------------------------------------
    // TEST 7: Message Read Receipt Lifecycle (delivered -> read)
    // ----------------------------------------------------
    console.log('\n[Test 7] Testing Read Receipt (message:read)...');
    const readPromise = new Promise((resolve) => {
      userSocket.on('message:read', (data) => {
        console.log('✔ Read receipt event received on user socket:', data.conversationId);
        resolve(data);
      });
    });

    agentSocket.emit('message:read', {
      conversationId: CONVERSATION_ID,
      senderId: TEST_USER_ID
    });

    await readPromise;
    const readMongoMsg = await Message.findById(msgId);
    assert.strictEqual(readMongoMsg.status, 'read', 'Message status should be updated to read');
    
    const convDoc = await Conversation.findById(CONVERSATION_ID);
    assert.strictEqual(convDoc.unread.agent, 0, 'Agent unread count should be reset to 0');
    console.log('✔ Conversation unread count reset and message status updated to read');

    // ----------------------------------------------------
    // TEST 8: Voice Note Message
    // ----------------------------------------------------
    console.log('\n[Test 8] Testing Voice Note Message Flow...');
    const voiceMsgId = 'msg-voice-200';
    await processStreamMessage('stream-id-2', {
      _id: voiceMsgId,
      conversationId: CONVERSATION_ID,
      senderId: TEST_USER_ID,
      senderType: 'user',
      type: 'voice',
      audio: {
        key: voiceData.fileKey,
        duration: 12.5,
        mimeType: 'audio/webm'
      },
      createdAt: new Date(),
      agentId: TEST_AGENT_ID,
      emailId: TEST_USER_ID,
      recipientId: TEST_AGENT_ID,
      recipientType: 'agent'
    });

    const voiceMongoMsg = await Message.findById(voiceMsgId);
    assert(voiceMongoMsg, 'Voice note message should exist in Mongo');
    assert.strictEqual(voiceMongoMsg.type, 'voice');
    assert.strictEqual(voiceMongoMsg.audio.key, voiceData.fileKey);
    console.log('✔ Voice note stored and verified in MongoDB');

    // ----------------------------------------------------
    // TEST 9: REST API Cursor-Based Paginated Message History
    // ----------------------------------------------------
    console.log('\n[Test 9] Fetching Paginated Message History REST Endpoint...');
    const historyRes = await fetch(`${serverUrl}/api/v1/conversations/${CONVERSATION_ID}/messages?limit=10`, {
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const historyData = await historyRes.json();
    assert.strictEqual(historyRes.status, 200);
    assert(Array.isArray(historyData.messages), 'messages should be an array');
    assert.strictEqual(historyData.messages.length, 2, 'Should return 2 messages');
    console.log(`✔ Paginated message history returned ${historyData.messages.length} messages`);

    // ----------------------------------------------------
    // TEST 10: Automatic Read Receipt Emulation
    // ----------------------------------------------------
    console.log('\n[Test 10] Emulating Automatic Read Receipt when message:new is received...');
    
    // Set up auto-read handler on agent socket
    agentSocket.on('message:new', (msg) => {
      if (msg.conversationId === CONVERSATION_ID) {
        console.log('  [Agent Socket] Auto-reading message:', msg._id);
        agentSocket.emit('message:read', {
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          messageIds: [msg._id]
        });
      }
    });

    const autoReadPromise = new Promise((resolve) => {
      userSocket.on('message:read', (data) => {
        console.log('✔ Read receipt event received on user socket from auto-read emu:', data.conversationId);
        resolve(data);
      });
    });

    // Send new message from user
    const autoReadMsgId = 'msg-test-auto-read-300';
    userSocket.emit('message:send', {
      _id: autoReadMsgId,
      conversationId: CONVERSATION_ID,
      recipientId: TEST_AGENT_ID,
      type: 'text',
      text: 'Auto read this message!'
    });

    // Worker processing Redis stream payload
    await processStreamMessage('stream-id-3', {
      _id: autoReadMsgId,
      conversationId: CONVERSATION_ID,
      senderId: TEST_USER_ID,
      senderType: 'user',
      type: 'text',
      text: 'Auto read this message!',
      createdAt: new Date(),
      agentId: TEST_AGENT_ID,
      emailId: TEST_USER_ID,
      recipientId: TEST_AGENT_ID,
      recipientType: 'agent'
    });

    await autoReadPromise;

    // Verify status in MongoDB has transitioned to 'read' automatically
    const autoReadMongoMsg = await Message.findById(autoReadMsgId);
    assert.strictEqual(autoReadMongoMsg.status, 'read', 'Message status should automatically update to read');

    const updatedConvDoc = await Conversation.findById(CONVERSATION_ID);
    assert.strictEqual(updatedConvDoc.unread.agent, 0, 'Agent unread count should be 0 after auto-read');
    console.log('✔ Auto-read verification successful! MongoDB message status is read and unread count is 0');

    // ----------------------------------------------------
    // TEST 11: Image Message Flow
    // ----------------------------------------------------
    console.log('\n[Test 11] Testing Image Upload and Message Flow...');
    
    // 1. Test REST endpoint for image presigned url
    const imgRes = await fetch(`${serverUrl}/api/v1/image/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ conversationId: CONVERSATION_ID, mimeType: 'image/png' })
    });
    const imgData = await imgRes.json();
    assert.strictEqual(imgRes.status, 200, 'Image presigned-url endpoint should return 200 OK');
    assert(imgData.uploadUrl, 'Response should contain uploadUrl');
    assert(imgData.fileKey, 'Response should contain fileKey');
    console.log('✔ Image pre-signed URL generated:', imgData.fileKey);

    // 2. Simulate stream message processing for image
    const imgMsgId = 'msg-image-200';
    await processStreamMessage('stream-id-4', {
      _id: imgMsgId,
      conversationId: CONVERSATION_ID,
      senderId: TEST_USER_ID,
      senderType: 'user',
      type: 'image',
      image: {
        key: imgData.fileKey,
        mimeType: 'image/png'
      },
      createdAt: new Date(),
      agentId: TEST_AGENT_ID,
      emailId: TEST_USER_ID,
      recipientId: TEST_AGENT_ID,
      recipientType: 'agent'
    });

    const imgMongoMsg = await Message.findById(imgMsgId);
    assert(imgMongoMsg, 'Image message should exist in Mongo');
    assert.strictEqual(imgMongoMsg.type, 'image');
    assert.strictEqual(imgMongoMsg.image.key, imgData.fileKey);
    console.log('✔ Image message stored and verified in MongoDB');

    // Clean up sockets
    userSocket.disconnect();
    agentSocket.disconnect();

    console.log('\n=======================================================');
    console.log(' ALL TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=======================================================');
  } catch (err) {
    console.error('\n❌ TEST FAILED WITH ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (httpServer) httpServer.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    await closeRedisConnections();
  }
}

runTests();
