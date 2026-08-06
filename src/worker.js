import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { connectMySQL, disconnectMySQL } from './config/mysql.js';
import { closeRedisConnections } from './config/redis.js';
import { startWorkerLoop, stopWorkerLoop } from './queue/streamWorker.js';

async function bootstrapWorker() {
  try {
    await connectDB();
    await connectMySQL();
    console.log(`=======================================================`);
    console.log(` Starting Redis Stream Queue Worker (${config.gatewayId})`);
    console.log(`=======================================================`);

    // Start background stream loop
    startWorkerLoop({ pollMs: 2000 });

    const shutdown = async (signal) => {
      console.log(`\n[Worker] Received ${signal}. Shutting down worker...`);
      stopWorkerLoop();
      await disconnectDB();
      await disconnectMySQL();
      await closeRedisConnections();
      console.log('[Worker] Graceful worker shutdown completed');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[Worker] Fatal worker error:', err);
    process.exit(1);
  }
}

bootstrapWorker();
