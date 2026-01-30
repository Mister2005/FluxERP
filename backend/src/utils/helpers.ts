import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../types/index.js';

// ============================================================================
// Async Handler Wrapper
// ============================================================================

/**
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handling middleware
 */
export const asyncHandler = (
    fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
    };
};

/**
 * Wraps async middleware to automatically catch errors
 */
export const asyncMiddleware = (
    fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
    };
};

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Send successful JSON response
 */
export const sendSuccess = <T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    }
) => {
    const response: any = {
        success: true,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number
) => {
    sendSuccess(res, data, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
};

/**
 * Send created response (201)
 */
export const sendCreated = <T>(res: Response, data: T) => {
    sendSuccess(res, data, 201);
};

/**
 * Send no content response (204)
 */
export const sendNoContent = (res: Response) => {
    res.status(204).send();
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a request ID
 */
export const generateRequestId = (): string => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parse pagination parameters from query string
 */
export const parsePagination = (
    query: any,
    defaults: { page: number; limit: number } = { page: 1, limit: 20 }
) => {
    const page = Math.max(1, parseInt(query.page) || defaults.page);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaults.limit));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Parse sort parameters from query string
 */
export const parseSort = (
    query: any,
    allowedFields: string[],
    defaults: { field: string; order: 'asc' | 'desc' }
) => {
    const field = allowedFields.includes(query.sortBy) ? query.sortBy : defaults.field;
    const order = query.sortOrder === 'asc' || query.sortOrder === 'desc' 
        ? query.sortOrder 
        : defaults.order;

    return { field, order };
};

/**
 * Safely parse JSON string
 */
export const safeJsonParse = <T>(json: string | null | undefined, fallback: T): T => {
    if (!json) return fallback;
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
};

/**
 * Stringify data for storage (handles objects consistently)
 */
export const stringify = (data: any): string => {
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
};

/**
 * Omit specified keys from object
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
};

/**
 * Pick specified keys from object
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
        if (key in obj) result[key] = obj[key];
    });
    return result;
};

// ============================================================================
// Aliases for API Response Helper (used by routes)
// ============================================================================

/**
 * Build a success response object
 */
export const successResponse = <T>(data: T, message?: string) => {
    return {
        success: true as const,
        data,
        ...(message && { message }),
    };
};

/**
 * Build an error response object
 */
export const errorResponse = (message: string, details?: any) => {
    return {
        success: false as const,
        error: message,
        ...(details && { details }),
    };
};
