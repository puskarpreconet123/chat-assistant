import { verifyToken } from '../services/auth.service.js';
import { config } from '../config/env.js';

export function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: JWT token missing'));
    }

    // Bypass token check for fixed API token (if configured)
    if (config.fixedApiToken && config.fixedApiToken.trim() !== '' && token === config.fixedApiToken) {
      const actAsEmail = socket.handshake.auth?.actAsEmail || socket.handshake.headers?.['x-act-as-email'] || 'developer';
      const actAsRole = socket.handshake.auth?.actAsRole || socket.handshake.headers?.['x-act-as-role'] || 'user';
      const actAsName = socket.handshake.auth?.actAsName || socket.handshake.headers?.['x-act-as-name'] || 'App User';
      const actAsAgentId = socket.handshake.auth?.actAsAgentId || socket.handshake.headers?.['x-act-as-agent-id'] || ((actAsRole === 'agent' || actAsRole === 'admin') ? actAsEmail : null);

      socket.data.user = {
        emailId: actAsEmail,
        role: actAsRole,
        agentId: actAsAgentId,
        name: actAsName
      };
      return next();
    }

    const decoded = verifyToken(token);
    socket.data.user = {
      emailId: decoded.emailId || decoded.id,
      role: decoded.role || 'user',
      agentId: decoded.agentId || ((decoded.role === 'agent' || decoded.role === 'admin') ? (decoded.emailId || decoded.id) : null),
      name: decoded.name
    };

    next();
  } catch (err) {
    console.error('[SocketAuth] Authentication failed:', err.message);
    next(new Error(`Authentication error: ${err.message}`));
  }
}
