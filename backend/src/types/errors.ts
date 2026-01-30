// ============================================================================
// Custom Error Classes for FluxERP
// ============================================================================

/**
 * Base application error class
 * All custom errors should extend this
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: any
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Operational errors are expected
        this.details = details;

        // Captures proper stack trace
        Error.captureStackTrace(this, this.constructor);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * 400 Bad Request - Invalid input or malformed request
 */
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request', details?: any) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed', details?: any) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

/**
 * 403 Forbidden - Authenticated but not permitted
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * 422 Unprocessable Entity - Request understood but cannot be processed
 */
export class UnprocessableEntityError extends AppError {
    constructor(message: string = 'Unprocessable entity', details?: any) {
        super(message, 422, 'UNPROCESSABLE_ENTITY', details);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests, please try again later') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR');
    }
}

/**
 * 503 Service Unavailable - Temporary service issue
 */
export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service temporarily unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE');
    }
}

/**
 * External API errors (e.g., Gemini API)
 */
export class ExternalServiceError extends AppError {
    constructor(service: string, message: string = 'External service error') {
        super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
    constructor(message: string = 'Database error') {
        super(message, 500, 'DATABASE_ERROR');
    }
}

// ============================================================================
// Error Type Guards
// ============================================================================

export const isAppError = (error: unknown): error is AppError => {
    return error instanceof AppError;
};

export const isOperationalError = (error: unknown): boolean => {
    if (isAppError(error)) {
        return error.isOperational;
    }
    return false;
};
