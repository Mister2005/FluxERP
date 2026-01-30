/**
 * Graceful Shutdown Handler
 * Ensures proper cleanup of resources when the application terminates
 */

import { Server } from 'http';
import prisma from '../lib/db.js';
import { closeRedis } from '../lib/redis.js';
import { logger } from './logger.js';
import { setShuttingDown } from '../routes/health.routes.js';

interface ShutdownOptions {
    server: Server;
    timeout?: number; // Milliseconds to wait before forcing shutdown
}

let isShuttingDown = false;

/**
 * Initialize graceful shutdown handlers
 */
export function initGracefulShutdown(options: ShutdownOptions): void {
    const { server, timeout = 30000 } = options;

    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            logger.warn(`Received ${signal} during shutdown, ignoring...`);
            return;
        }

        isShuttingDown = true;
        setShuttingDown(true);
        logger.info(`Received ${signal}, starting graceful shutdown...`);

        // Force exit timeout
        const forceExitTimer = setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, timeout);

        try {
            // 1. Stop accepting new connections
            logger.info('Closing HTTP server...');
            await new Promise<void>((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        logger.error({ error: err }, 'Error closing HTTP server');
                        reject(err);
                    } else {
                        logger.info('HTTP server closed');
                        resolve();
                    }
                });
            });

            // 2. Close database connections
            logger.info('Disconnecting from database...');
            await prisma.$disconnect();
            logger.info('Database disconnected');

            // 3. Close Redis connections
            logger.info('Closing Redis connection...');
            await closeRedis();
            logger.info('Redis connection closed');

            // 4. Any other cleanup tasks can go here

            clearTimeout(forceExitTimer);
            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            clearTimeout(forceExitTimer);
            logger.error({ error }, 'Error during graceful shutdown');
            process.exit(1);
        }
    };

    // Register signal handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
        logger.fatal({ error }, 'Uncaught exception');
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.fatal({ reason, promise }, 'Unhandled rejection');
        // Don't shutdown on unhandled rejections, just log
    });

    logger.info('Graceful shutdown handlers registered');
}

export default { initGracefulShutdown };
