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
    // TEST 3b: REST API Fixed Token Auth Bypass & Mock Upload
    // ----------------------------------------------------
    console.log('\n[Test 3b] Testing Fixed API Token Auth Bypass & Mock Upload...');
    const fixedToken = 'chat_fixed_auth_token_2026_prod';
    
    // Check that unauthorized access is blocked
    const mockUploadFailRes = await fetch(`${serverUrl}/api/v1/voice/upload-mock?key=test-fixed-token-file.webm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/webm'
      },
      body: Buffer.from('mock-audio-content')
    });
    assert.strictEqual(mockUploadFailRes.status, 401, 'Mock upload without token should return 401 Unauthorized');
    console.log('✔ Mock upload protection verified (returned 401 Unauthorized without token)');

    // Check that access with fixed API token is allowed
    const mockUploadRes = await fetch(`${serverUrl}/api/v1/voice/upload-mock?key=test-fixed-token-file.webm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/webm',
        Authorization: `Bearer ${fixedToken}`,
        'X-Act-As-Email': 'user-test-1@example.com',
        'X-Act-As-Role': 'user',
        'X-Act-As-Name': 'Alice'
      },
      body: Buffer.from('mock-audio-content')
    });
    const mockUploadData = await mockUploadRes.json();
    assert.strictEqual(mockUploadRes.status, 200, 'Mock upload should return 200 OK with fixed token');
    assert(mockUploadData.success, 'Mock upload should return success: true');
    console.log('✔ Mock upload with fixed token and act-as headers successful!');

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
      participant1: TEST_AGENT_ID,
      participant2: TEST_USER_ID,
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
    const unreadCount = convDoc.participant1 === TEST_AGENT_ID ? convDoc.unread1 : convDoc.unread2;
    assert.strictEqual(unreadCount, 0, 'Agent unread count should be reset to 0');
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
      participant1: TEST_AGENT_ID,
      participant2: TEST_USER_ID,
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
      participant1: TEST_AGENT_ID,
      participant2: TEST_USER_ID,
      recipientId: TEST_AGENT_ID,
      recipientType: 'agent'
    });

    await autoReadPromise;

    // Verify status in MongoDB has transitioned to 'read' automatically
    const autoReadMongoMsg = await Message.findById(autoReadMsgId);
    assert.strictEqual(autoReadMongoMsg.status, 'read', 'Message status should automatically update to read');

    const updatedConvDoc = await Conversation.findById(CONVERSATION_ID);
    const updatedUnreadCount = updatedConvDoc.participant1 === TEST_AGENT_ID ? updatedConvDoc.unread1 : updatedConvDoc.unread2;
    assert.strictEqual(updatedUnreadCount, 0, 'Agent unread count should be 0 after auto-read');
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
      participant1: TEST_AGENT_ID,
      participant2: TEST_USER_ID,
      recipientId: TEST_AGENT_ID,
      recipientType: 'agent'
    });

    const imgMongoMsg = await Message.findById(imgMsgId);
    assert(imgMongoMsg, 'Image message should exist in Mongo');
    assert.strictEqual(imgMongoMsg.type, 'image');
    assert.strictEqual(imgMongoMsg.image.key, imgData.fileKey);
    console.log('✔ Image message stored and verified in MongoDB');

    // ----------------------------------------------------
    // TEST 12: Telewiz API Integration (Mocked)
    // ----------------------------------------------------
    console.log('\n[Test 12] Testing Telewiz API integration endpoints (mocked)...');
    const originalFetch = global.fetch;
    let mockCalls = [];

    global.fetch = async (url, options) => {
      mockCalls.push({ url, options });
      let body = {};
      if (options?.body) {
        try {
          body = JSON.parse(options.body);
        } catch (e) {
          // not JSON
        }
      }
      
      if (url.includes('api.php') || url.includes('/officemanage/api.php')) {
        if (body.action === 'login') {
          if (body.email === 'agency@gmail.com' && body.password === '12345') {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                message: "Login successful",
                user: {
                  id: "23",
                  name: "Ritdz 4k",
                  email: "agency@gmail.com",
                  phone: "9000000000",
                  role: "AGENCY",
                  avatar: "https://telewiz.in/officemanage/uploads/photos/1784376403_Agency.jpg"
                }
              })
            };
          } else if (body.mob === '9000000000' && body.password === '12345') {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                message: "Login successful",
                user: {
                  id: "23",
                  name: "Ritdz 4k",
                  email: "agency@gmail.com",
                  phone: "9000000000",
                  role: "AGENCY",
                  avatar: "https://telewiz.in/officemanage/uploads/photos/1784376403_Agency.jpg"
                }
              })
            };
          }
        } else if (body.action === 'get_by_agency_id') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: [
                {
                  id: 23,
                  name: "Ritdz 4k",
                  mob: "9000000000",
                  email: "agency@gmail.com",
                  img: "1784376403_Agency.jpg",
                  agency_id: "",
                  agency_unq_id: "AGENCY-23",
                  read_status: "",
                  verification: "",
                  type: "AGENCY",
                  show_status: "ACTIVE",
                  date: "2026-07-18",
                  time: ""
                },
                {
                  id: 24,
                  name: "Lorem Ipsum",
                  mob: "9000000055",
                  email: "sample@gmail.com",
                  img: "",
                  agency_id: "23",
                  agency_unq_id: "AGENCY-23",
                  read_status: "READ",
                  verification: "DONE",
                  type: "USER",
                  show_status: "ACTIVE",
                  date: "2026-07-27",
                  time: "01:31:17pm"
                }
              ]
            })
          };
        } else if (body.action === 'read_users') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: [
                {
                  id: 23,
                  name: "Ritdz 4k",
                  mob: "9000000000",
                  email: "agency@gmail.com",
                  img: "1784376403_Agency.jpg",
                  agency_id: "",
                  agency_unq_id: "AGENCY-23",
                  read_status: "",
                  verification: "",
                  type: "AGENCY",
                  show_status: "ACTIVE",
                  date: "2026-07-18",
                  time: ""
                }
              ]
            })
          };
        } else if (body.action === 'get_qr_code') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              qr_available: true,
              qr_image_url: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=mock-test-upi",
              qr_id: 5,
              range_id: 2,
              emp_id: body.agency_id || 23
            })
          };
        } else if (body.action === 'recharge_by_user') {
          assert.strictEqual(body.action, 'recharge_by_user');
          assert(body.user_id !== undefined, 'user_id is required');
          assert(body.qr_id !== undefined, 'qr_id is required');
          assert(body.range_id !== undefined, 'range_id is required');
          assert(body.amount !== undefined, 'amount is required');
          assert(body.emp_id !== undefined, 'emp_id is required');
          assert(body.book_id !== undefined, 'book_id is required');
          assert(body.transaction_id !== undefined, 'transaction_id is required');
          assert(body.image !== undefined, 'image is required');

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              message: "Recharge request submitted successfully to PHP"
            })
          };
        }
      }
      return originalFetch(url, options);
    };

    try {
      // 1. Test Login via Email (Agency)
      const loginEmailRes = await fetch(`${serverUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: 'agency@gmail.com', password: '12345' })
      });
      const loginEmailData = await loginEmailRes.json();
      assert.strictEqual(loginEmailRes.status, 200);
      assert.strictEqual(loginEmailData.user.role, 'agent');
      assert.strictEqual(loginEmailData.user.name, 'Ritdz 4k');
      console.log('✔ Telewiz email login and auto-sync agency user data successful');

      // 2. Test Login via Mobile (Agency)
      const loginMobRes = await fetch(`${serverUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: '9000000000', password: '12345' })
      });
      const loginMobData = await loginMobRes.json();
      assert.strictEqual(loginMobRes.status, 200);
      console.log('✔ Telewiz mobile login successful');
      // 4. Test List Users via Admin (which triggers read_users sync)
      const adminToken = generateToken({ emailId: 'admin@gmail.com', role: 'admin', name: 'Admin' });
      const listUsersRes = await fetch(`${serverUrl}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const listUsersData = await listUsersRes.json();
      assert.strictEqual(listUsersRes.status, 200);
      assert(Array.isArray(listUsersData.users));
      console.log('✔ Admin list users with Telewiz sync successful');

      // ----------------------------------------------------
      // TEST 13: Testing Recharge Request and QR Code Proxy
      // ----------------------------------------------------
      console.log('\n[Test 13] Testing Recharge Request and QR Code Proxy...');
      const qrRes = await fetch(`${serverUrl}/api/v1/recharge/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ userId: TEST_USER_ID, bookId: '324', amount: 1000 })
      });
      const qrData = await qrRes.json();
      assert.strictEqual(qrRes.status, 200);
      assert.strictEqual(qrData.success, true);
      assert.strictEqual(qrData.qr_available, true);
      assert.strictEqual(qrData.qr_id, 5);
      assert.strictEqual(qrData.range_id, 2);
      assert.strictEqual(qrData.emp_id, 1);
      assert(qrData.qr_url, 'Should return qr_url');

      // Test Recharge Submit API proxy
      const submitRes = await fetch(`${serverUrl}/api/v1/recharge/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          qrId: qrData.qr_id,
          rangeId: qrData.range_id,
          amount: 1000,
          empId: qrData.emp_id,
          bookId: '324',
          transactionId: '123456789012',
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
      });
      const submitData = await submitRes.json();
      assert.strictEqual(submitRes.status, 200);
      assert.strictEqual(submitData.success, true);
      console.log('✔ Recharge submission proxy to PHP successful');

      // Test socket events
      const rechargePromise = new Promise((resolve) => {
        agentSocket.once('message:new', (msg) => {
          console.log('✔ Realtime event message:new received on agent socket for recharge:', msg._id);
          resolve(msg);
        });
      });

      const rechargeMsgId = 'msg-recharge-test';
      userSocket.emit('message:send', {
        _id: rechargeMsgId,
        conversationId: CONVERSATION_ID,
        recipientId: TEST_AGENT_ID,
        type: 'recharge',
        text: '💸 Recharge Request: ₹1000 for Cricket Book 365 (UTR: 123456789012)',
        recharge: {
          userId: TEST_USER_ID,
          bookId: '324',
          bookName: 'Cricket Book 365',
          amount: 1000,
          transactionId: '123456789012',
          proofImage: 'images/conv-1/proof.png'
        }
      });

      // Process stream message
      await processStreamMessage('stream-id-recharge', {
        _id: rechargeMsgId,
        conversationId: CONVERSATION_ID,
        senderId: TEST_USER_ID,
        senderType: 'user',
        recipientId: TEST_AGENT_ID,
        recipientType: 'agent',
        participant1: TEST_AGENT_ID,
        participant2: TEST_USER_ID,
        type: 'recharge',
        text: '💸 Recharge Request: ₹1000 for Cricket Book 365 (UTR: 123456789012)',
        recharge: {
          userId: TEST_USER_ID,
          bookId: '324',
          bookName: 'Cricket Book 365',
          amount: 1000,
          transactionId: '123456789012',
          proofImage: 'images/conv-1/proof.png'
        },
        createdAt: new Date()
      });

      const rechargeMsg = await rechargePromise;
      assert.strictEqual(rechargeMsg.type, 'recharge');
      assert.strictEqual(rechargeMsg.recharge.amount, 1000);
      assert.strictEqual(rechargeMsg.recharge.transactionId, '123456789012');

      // Verify MongoDB document
      const mongoRechargeMsg = await Message.findById(rechargeMsgId);
      assert(mongoRechargeMsg, 'Recharge message document should exist in Mongo');
      assert.strictEqual(mongoRechargeMsg.recharge.amount, 1000);
      assert.strictEqual(mongoRechargeMsg.recharge.transactionId, '123456789012');
      console.log('✔ Recharge Request flow test successful');

    } finally {
      global.fetch = originalFetch;
    }

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
