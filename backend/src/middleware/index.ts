import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { logger, logRequest } from '../utils/logger.js';
import { generateRequestId } from '../utils/helpers.js';

// ============================================================================
// Request Logging Middleware
// ============================================================================

/**
 * Adds request ID and timing to each request
 * Logs request completion with duration
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const start = Date.now();
    
    // Generate and attach request ID
    const requestId = generateRequestId();
    authReq.requestId = requestId;
    
    // Add request ID to response headers for debugging
    res.setHeader('X-Request-ID', requestId);

    // Log request completion
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        logRequest(
            req.method,
            req.originalUrl || req.url,
            res.statusCode,
            duration,
            requestId,
            authReq.user?.userId
        );
    });

    next();
};

// ============================================================================
// Security Headers Middleware
// ============================================================================

/**
 * Adds security headers to responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
};

// ============================================================================
// Request Size Limiter
// ============================================================================

/**
 * Middleware to limit request body size for specific routes
 */
export const limitRequestSize = (maxSizeKb: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        const maxSize = maxSizeKb * 1024;

        if (contentLength > maxSize) {
            return res.status(413).json({
                success: false,
                error: `Request body too large. Maximum size is ${maxSizeKb}KB`,
                code: 'PAYLOAD_TOO_LARGE',
            });
        }

        next();
    };
};

// ============================================================================
// CORS Preflight Handler
// ============================================================================

/**
 * Handle CORS preflight requests explicitly
 */
export const handleCorsPreflights = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
};

// ============================================================================
// Request Timeout Middleware
// ============================================================================

/**
 * Add timeout to requests
 */
export const requestTimeout = (timeoutMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        res.setTimeout(timeoutMs, () => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: 'Request timeout',
                    code: 'REQUEST_TIMEOUT',
                });
            }
        });
        next();
    };
};

// ============================================================================
// Maintenance Mode Middleware
// ============================================================================

let isMaintenanceMode = false;

/**
 * Enable/disable maintenance mode
 */
export const setMaintenanceMode = (enabled: boolean) => {
    isMaintenanceMode = enabled;
    logger.info({ enabled }, 'Maintenance mode updated');
};

/**
 * Middleware to check maintenance mode
 */
export const maintenanceMode = (req: Request, res: Response, next: NextFunction) => {
    if (isMaintenanceMode) {
        // Allow health checks during maintenance
        if (req.path === '/health' || req.path === '/health/live') {
            return next();
        }

        return res.status(503).json({
            success: false,
            error: 'Service is under maintenance. Please try again later.',
            code: 'MAINTENANCE_MODE',
        });
    }
    next();
};

// ============================================================================
// Export Middleware Index
// ============================================================================

export { errorHandler, notFoundHandler, catchAsync } from './error.middleware.js';
export { 
    validate, 
    validateBody, 
    validateQuery, 
    validateParams, 
    validateRequest,
    requireAtLeastOne,
    sanitizeStrings 
} from './validation.middleware.js';
export {
    authenticate,
    optionalAuth,
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireOwnerOrPermission,
    hasPermission,
    clearPermissionCache
} from './auth.middleware.js';
export {
    generalLimiter,
    aiLimiter,
    authLimiter,
    strictLimiter,
    readOnlyLimiter,
    createRateLimiter
} from './rateLimit.middleware.js';
