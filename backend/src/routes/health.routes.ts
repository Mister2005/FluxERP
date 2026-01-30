import { Router } from 'express';
import prisma from '../lib/db.js';
import config from '../config/index.js';
import { aiService } from '../services/index.js';
import { logger } from '../utils/logger.js';
import { getRedisClient, isRedisAvailable } from '../lib/redis.js';

const router = Router();

// ============================================================================
// Graceful Shutdown State
// ============================================================================
let isShuttingDown = false;
const serverStartTime = Date.now();

/**
 * Set shutdown state (called during graceful shutdown)
 */
export function setShuttingDown(value: boolean): void {
    isShuttingDown = value;
}

/**
 * Check if application is shutting down
 */
export function isApplicationShuttingDown(): boolean {
    return isShuttingDown;
}

// ============================================================================
// Health Check Routes
// No authentication required
// ============================================================================

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Quick database ping
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - startTime;

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.nodeEnv,
            database: {
                status: 'connected',
                latency: `${dbLatency}ms`,
            },
        });
    } catch (error) {
        logger.error({ error }, 'Health check failed');
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
        });
    }
});

/**
 * GET /health/live
 * Kubernetes liveness probe - returns 200 if server is alive
 */
router.get('/live', (req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({ 
            status: 'shutting_down',
            timestamp: new Date().toISOString(),
        });
    }
    res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe - returns 200 if server is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({ 
            status: 'shutting_down',
            timestamp: new Date().toISOString(),
        });
    }
    
    try {
        // Check database connectivity
        await prisma.$queryRaw`SELECT 1`;
        
        res.status(200).json({ 
            status: 'ready',
            checks: {
                database: 'ok',
            },
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'not ready',
            checks: {
                database: 'failed',
            },
        });
    }
});

/**
 * GET /health/detailed
 * Detailed health check with all service statuses
 * Should be protected in production
 */
router.get('/detailed', async (req, res) => {
    const checks: Record<string, any> = {};
    let overallStatus = 'healthy';

    // Database check
    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        checks.database = {
            status: 'healthy',
            latency: `${Date.now() - dbStart}ms`,
        };
    } catch (error) {
        checks.database = { status: 'unhealthy', error: 'Connection failed' };
        overallStatus = 'unhealthy';
    }

    // Redis/Cache check
    try {
        if (config.redis?.enabled || config.redis?.url) {
            const cacheStart = Date.now();
            const redis = await getRedisClient();
            await redis.ping();
            checks.cache = {
                status: 'healthy',
                latency: `${Date.now() - cacheStart}ms`,
                type: isRedisAvailable() ? 'redis' : 'in-memory',
            };
        } else {
            checks.cache = { 
                status: 'disabled',
                message: 'Using in-memory fallback (Redis not configured)',
            };
        }
    } catch (error) {
        checks.cache = { status: 'error', error: 'Cache check failed' };
    }

    // AI Service check
    try {
        const aiInfo = aiService.getModelInfo();
        checks.ai = {
            status: aiInfo.available ? 'available' : 'unavailable',
            model: aiInfo.model || 'not initialized',
            initialized: aiInfo.initialized,
        };
    } catch (error) {
        checks.ai = { status: 'error', error: 'Check failed' };
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const memPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    checks.memory = {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        percentage: `${memPercentage}%`,
        status: memPercentage > 90 ? 'warning' : 'healthy',
    };

    if (memPercentage > 95) {
        overallStatus = 'degraded';
    }

    // System info
    checks.system = {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: `${Math.round(process.uptime())}s`,
        serverUptime: `${Math.round((Date.now() - serverStartTime) / 1000)}s`,
        pid: process.pid,
    };

    // App info
    checks.app = {
        environment: config.nodeEnv,
        port: config.port,
        shuttingDown: isShuttingDown,
    };

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
    });
});

/**
 * GET /health/metrics
 * Basic metrics endpoint (can be extended for Prometheus)
 */
router.get('/metrics', async (req, res) => {
    try {
        const [
            userCount,
            productCount,
            ecoCount,
            bomCount,
            workOrderCount
        ] = await Promise.all([
            prisma.user.count(),
            prisma.product.count(),
            prisma.eCO.count({ where: { isLatest: true } }),
            prisma.bOM.count(),
            prisma.workOrder.count(),
        ]);

        const memUsage = process.memoryUsage();

        // Simple Prometheus-style metrics
        const metrics = [
            `# HELP fluxerp_users_total Total number of users`,
            `# TYPE fluxerp_users_total gauge`,
            `fluxerp_users_total ${userCount}`,
            ``,
            `# HELP fluxerp_products_total Total number of products`,
            `# TYPE fluxerp_products_total gauge`,
            `fluxerp_products_total ${productCount}`,
            ``,
            `# HELP fluxerp_ecos_total Total number of ECOs`,
            `# TYPE fluxerp_ecos_total gauge`,
            `fluxerp_ecos_total ${ecoCount}`,
            ``,
            `# HELP fluxerp_boms_total Total number of BOMs`,
            `# TYPE fluxerp_boms_total gauge`,
            `fluxerp_boms_total ${bomCount}`,
            ``,
            `# HELP fluxerp_workorders_total Total number of work orders`,
            `# TYPE fluxerp_workorders_total gauge`,
            `fluxerp_workorders_total ${workOrderCount}`,
            ``,
            `# HELP nodejs_heap_used_bytes Process heap used in bytes`,
            `# TYPE nodejs_heap_used_bytes gauge`,
            `nodejs_heap_used_bytes ${memUsage.heapUsed}`,
            ``,
            `# HELP nodejs_heap_total_bytes Process heap total in bytes`,
            `# TYPE nodejs_heap_total_bytes gauge`,
            `nodejs_heap_total_bytes ${memUsage.heapTotal}`,
            ``,
            `# HELP nodejs_process_uptime_seconds Process uptime in seconds`,
            `# TYPE nodejs_process_uptime_seconds counter`,
            `nodejs_process_uptime_seconds ${Math.round(process.uptime())}`,
        ].join('\n');

        res.type('text/plain').send(metrics);
    } catch (error) {
        logger.error({ error }, 'Metrics collection failed');
        res.status(500).send('# Error collecting metrics');
    }
});

export default router;
