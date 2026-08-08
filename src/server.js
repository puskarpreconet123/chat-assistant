import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { closeRedisConnections } from './config/redis.js';
import { setupSocketGateway } from './socket/gateway.js';
import { startWorkerLoop, stopWorkerLoop } from './queue/streamWorker.js';

async function bootstrap() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Create HTTP server & attach Socket.io Gateway
    const httpServer = http.createServer(app);
    const io = setupSocketGateway(httpServer);

    // 3. Start embedded Queue Worker for processing Redis Streams
    startWorkerLoop({ pollMs: 1000 });

    // 4. Start listening
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Gateway Server [${config.gatewayId}] listening on port ${PORT}`);
      console.log(` REST API: http://localhost:${PORT}/api/v1`);
      console.log(` Socket.io Gateway: ws://localhost:${PORT}`);
      console.log(` Testing UI: http://localhost:${PORT}/`);
      console.log(` Environment: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      stopWorkerLoop();
      io.close();
      httpServer.close(async () => {
        await disconnectDB();
        await closeRedisConnections();
        console.log('[Server] Graceful shutdown completed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
