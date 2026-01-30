import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError, ValidationError, isAppError, isOperationalError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';
import { AuthRequest } from '../types/index.js';

// ============================================================================
// Error Handler Middleware
// ============================================================================

/**
 * Central error handling middleware
 * Should be registered last in the middleware chain
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authReq = req as AuthRequest;

    // Log the error
    logger.error({
        err: {
            name: err.name,
            message: err.message,
            stack: config.isDevelopment ? err.stack : undefined,
        },
        requestId: authReq.requestId,
        method: req.method,
        url: req.url,
        userId: authReq.user?.userId,
    }, 'Error occurred');

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const validationErrors = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));

        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationErrors,
        });
    }

    // Handle custom AppError
    if (isAppError(err)) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            code: err.code,
            details: err.details,
        });
    }

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err as any;
        
        switch (prismaErr.code) {
            case 'P2002': // Unique constraint violation
                return res.status(409).json({
                    success: false,
                    error: 'Resource already exists',
                    code: 'CONFLICT',
                    details: { field: prismaErr.meta?.target },
                });
            case 'P2025': // Record not found
                return res.status(404).json({
                    success: false,
                    error: 'Resource not found',
                    code: 'NOT_FOUND',
                });
            case 'P2003': // Foreign key constraint failed
                return res.status(400).json({
                    success: false,
                    error: 'Related resource not found',
                    code: 'INVALID_REFERENCE',
                });
            default:
                // Log unknown Prisma errors
                logger.error({
                    prismaCode: prismaErr.code,
                    meta: prismaErr.meta,
                }, 'Unknown Prisma error');
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
        });
    }

    // Handle syntax errors (invalid JSON)
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body',
            code: 'INVALID_JSON',
        });
    }

    // Default to 500 Internal Server Error
    // Don't expose internal error details in production
    res.status(500).json({
        success: false,
        error: config.isProduction ? 'Internal server error' : err.message,
        code: 'INTERNAL_ERROR',
        ...(config.isDevelopment && { stack: err.stack }),
    });
};

// ============================================================================
// 404 Not Found Handler
// ============================================================================

/**
 * Handle 404 - Route not found
 */
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
        code: 'ROUTE_NOT_FOUND',
    });
};

// ============================================================================
// Async Error Wrapper
// ============================================================================

/**
 * Wraps async function to catch errors and pass to error handler
 */
export const catchAsync = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
