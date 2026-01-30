import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AuthRequest } from '../types/index.js';

// ============================================================================
// Rate Limiter Configuration
// ============================================================================

/**
 * Key generator for rate limiting
 * Uses user ID if authenticated, otherwise IP address
 */
const keyGenerator = (req: Request): string => {
    const authReq = req as AuthRequest;
    if (authReq.user?.userId) {
        return `user:${authReq.user.userId}`;
    }
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
};

/**
 * Handler when rate limit is exceeded
 */
const rateLimitHandler = (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    logger.warn({
        ip: req.ip,
        userId: authReq.user?.userId,
        path: req.path,
        method: req.method,
    }, 'Rate limit exceeded');

    res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('Retry-After'),
    });
};

// ============================================================================
// Rate Limiters
// ============================================================================

/**
 * General API rate limiter
 * Default: 100 requests per minute
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    keyGenerator,
    handler: rateLimitHandler,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/health/live';
    },
});

/**
 * AI endpoints rate limiter
 * More restrictive: 10 requests per minute
 */
export const aiLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.aiMaxRequests,
    keyGenerator,
    handler: (req, res) => {
        logger.warn({
            ip: req.ip,
            userId: (req as AuthRequest).user?.userId,
        }, 'AI rate limit exceeded');

        res.status(429).json({
            success: false,
            error: 'AI rate limit exceeded. Please wait before trying again.',
            code: 'AI_RATE_LIMIT_EXCEEDED',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Authentication endpoints rate limiter
 * Very restrictive: 5 requests per minute
 * Helps prevent brute force attacks
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMaxRequests,
    keyGenerator: (req) => {
        // Use IP for auth endpoints (can't use userId since not authenticated)
        return `auth:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    },
    handler: (req, res) => {
        logger.warn({
            ip: req.ip,
            path: req.path,
        }, 'Auth rate limit exceeded (potential brute force)');

        res.status(429).json({
            success: false,
            error: 'Too many login attempts. Please try again later.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count successful requests too
});

/**
 * Strict rate limiter for sensitive operations
 * 3 requests per minute
 */
export const strictLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: 3,
    keyGenerator,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Very lenient rate limiter for read-only operations
 * 500 requests per minute
 */
export const readOnlyLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: 500,
    keyGenerator,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
});

// ============================================================================
// Custom Rate Limiter Factory
// ============================================================================

interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string;
    skipFailedRequests?: boolean;
}

/**
 * Create a custom rate limiter with specified options
 */
export const createRateLimiter = (options: RateLimitOptions): RateLimitRequestHandler => {
    return rateLimit({
        windowMs: options.windowMs || config.rateLimit.windowMs,
        max: options.max || config.rateLimit.maxRequests,
        keyGenerator,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: options.message || 'Too many requests, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: res.getHeader('Retry-After'),
            });
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipFailedRequests: options.skipFailedRequests ?? false,
    });
};
