// ============================================================================
// FluxERP Backend Server - Refactored Architecture
// Clean entry point with modular architecture
// ============================================================================

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import { 
    errorHandler, 
    notFoundHandler,
} from './middleware/error.middleware.js';
import { 
    requestLogger, 
    securityHeaders,
    maintenanceMode 
} from './middleware/index.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import routes from './routes/index.js';

// ============================================================================
// Initialize Express Application
// ============================================================================

const app: Express = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false,
}));

// Custom security headers
app.use(securityHeaders);

// CORS configuration — allow explicit origins + Vercel preview URLs matching project
const VERCEL_PROJECT_SLUG = 'fluxerp';
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Allow Vercel preview/production URLs that match the project slug
        if (origin.endsWith('.vercel.app') && origin.toLowerCase().includes(VERCEL_PROJECT_SLUG)) {
            return callback(null, true);
        }

        // Allow explicit origins from CORS_ORIGINS env var
        if (config.corsOrigins.includes(origin)) return callback(null, true);

        // Allow localhost during development
        if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) return callback(null, true);

        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

// ============================================================================
// Core Middleware
// ============================================================================

// Request compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Maintenance mode check
app.use(maintenanceMode);

// Request logging
app.use(requestLogger);

// Rate limiting (applied globally)
if (config.isProduction) {
    app.use('/api', generalLimiter);
}

// ============================================================================
// Trust Proxy (for production behind load balancer)
// ============================================================================

if (config.isProduction) {
    app.set('trust proxy', 1);
}

// ============================================================================
// API Routes
// ============================================================================

// Mount all routes under /api
app.use('/api', routes);

// Also mount health at root for convenience
app.use('/health', routes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// ============================================================================
// Graceful Shutdown
// ============================================================================

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info({ signal }, 'Received shutdown signal');
    
    // Give existing requests time to complete
    setTimeout(async () => {
        logger.info('Shutting down server...');
        process.exit(0);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// Unhandled Errors
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught Exception');
    process.exit(1);
});

// ============================================================================
// Start Server
// ============================================================================

const startServer = async () => {
    try {
        // Start HTTP server
        const server = app.listen(config.port, () => {
            logger.info({
                port: config.port,
                environment: config.nodeEnv,
                corsOrigins: config.corsOrigins,
            }, '🚀 FluxERP Backend Server started');
            
            console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  FluxERP Backend Server                       ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${config.port.toString().padEnd(32)} ║
║  📊 Environment: ${config.nodeEnv.padEnd(40)} ║
║  🔗 Frontend URL: ${(config.corsOrigins?.[0] || 'Not configured').padEnd(40).slice(0, 40)} ║
║  💚 Health check: http://localhost:${config.port}/health              ║
╚═══════════════════════════════════════════════════════════════╝
            `);
        });

        // Server timeout
        server.setTimeout(30000);

        // Handle server errors
        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                logger.fatal({ port: config.port }, 'Port already in use');
            } else {
                logger.fatal({ error }, 'Server error');
            }
            process.exit(1);
        });

    } catch (error) {
        logger.fatal({ error }, 'Failed to start server');
        process.exit(1);
    }
};

// Start the server
startServer();

export default app;
