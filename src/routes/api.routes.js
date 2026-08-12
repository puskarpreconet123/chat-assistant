import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken } from '../services/auth.service.js';
import { restRateLimiter } from '../services/rateLimiter.service.js';
import { config } from '../config/env.js';
import * as authController from '../controllers/auth.controller.js';
import * as adminController from '../controllers/admin.controller.js';
import * as conversationController from '../controllers/conversation.controller.js';
import * as messageController from '../controllers/message.controller.js';
import * as voiceController from '../controllers/voice.controller.js';
import * as imageController from '../controllers/image.controller.js';
import * as gamesController from '../controllers/games.controller.js';
import * as rechargeController from '../controllers/recharge.controller.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const router = express.Router();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header with Bearer token required' });
  }

  const token = authHeader.split(' ')[1];

  // Bypass token check for fixed API token (if configured)
  if (config.fixedApiToken && config.fixedApiToken.trim() !== '' && token === config.fixedApiToken) {
    const actAsEmail = req.headers['x-act-as-email'] || 'developer';
    const actAsRole = req.headers['x-act-as-role'] || 'user';
    const actAsName = req.headers['x-act-as-name'] || 'App User';
    const actAsAgentId = req.headers['x-act-as-agent-id'] || ((actAsRole === 'agent' || actAsRole === 'admin') ? actAsEmail : null);

    req.user = {
      emailId: actAsEmail,
      role: actAsRole,
      name: actAsName,
      agentId: actAsAgentId
    };
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}

// Global REST rate limiter (100 req / min)
router.use(restRateLimiter(100, 60));

// Conditionally parse JSON — skip for binary uploads (audio/webm, etc.)
router.use((req, res, next) => {
  if (req.is('application/json') || (!req.headers['content-type'] && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'))) {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    next();
  }
});

// Auth routes (Public)
router.post('/auth/login', authController.login);

// Mock upload endpoint for voice notes
router.put('/voice/upload-mock', requireAuth, express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const fileKey = req.query.key;
    if (!fileKey) {
      return res.status(400).json({ error: 'key query parameter is required' });
    }

    const publicPath = path.join(__dirname, '../../public');
    const fullPath = path.join(publicPath, 'uploads', fileKey);
    const dirPath = path.dirname(fullPath);

    // Ensure directory exists
    await fs.promises.mkdir(dirPath, { recursive: true });

    // Write binary buffer
    await fs.promises.writeFile(fullPath, req.body);

    console.log(`[MockUpload] Saved mock audio file to ${fullPath}`);
    return res.json({ success: true, fileKey, url: `/uploads/${fileKey}` });
  } catch (err) {
    console.error('[MockUpload] Error saving mock upload:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Mock upload endpoint for images
router.put('/image/upload-mock', requireAuth, express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const fileKey = req.query.key;
    if (!fileKey) {
      return res.status(400).json({ error: 'key query parameter is required' });
    }

    const publicPath = path.join(__dirname, '../../public');
    const fullPath = path.join(publicPath, 'uploads', fileKey);
    const dirPath = path.dirname(fullPath);

    // Ensure directory exists
    await fs.promises.mkdir(dirPath, { recursive: true });

    // Write binary buffer
    await fs.promises.writeFile(fullPath, req.body);

    console.log(`[MockUpload] Saved mock image file to ${fullPath}`);
    return res.json({ success: true, fileKey, url: `/uploads/${fileKey}` });
  } catch (err) {
    console.error('[MockUpload] Error saving mock upload:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Admin routes (Protected with requireAuth)
router.post('/admin/agents', requireAuth, adminController.createAgent);
router.post('/admin/users', requireAuth, adminController.createUser);
router.post('/admin/users/assign', requireAuth, adminController.assignUsers);
router.get('/admin/agents', requireAuth, adminController.listAgents);
router.get('/admin/users', requireAuth, adminController.listUsers);
router.delete('/admin/users', requireAuth, adminController.deleteUsers);

// Protected routes
router.use(requireAuth);

// Conversation routes
router.get('/conversations', conversationController.listConversations);
router.get('/conversations/:conversationId/messages', messageController.getMessages);

// Voice note routes
router.post('/voice/presigned-url', voiceController.getVoiceUploadUrl);
router.get('/voice/play-url', voiceController.getVoicePlayUrl);

// Image routes
router.post('/image/presigned-url', imageController.getImageUploadUrl);
router.get('/image/play-url', imageController.getImagePlayUrl);

// Game and Subscription routes
router.get('/games', gamesController.getGames);
router.post('/games/subscribe', gamesController.subscribeGame);

// Recharge routes
router.post('/recharge/generate-qr', rechargeController.generateQrCode);
router.post('/recharge/submit', rechargeController.submitRecharge);


