import pino from 'pino';
import config from '../config/index.js';

// ============================================================================
// Logger Configuration
// ============================================================================

const loggerOptions: pino.LoggerOptions = {
    level: config.logLevel,
    base: {
        env: config.env,
        service: 'fluxerp-backend',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label }),
    },
    redact: {
        paths: ['password', 'token', 'authorization', 'req.headers.authorization'],
        censor: '[REDACTED]',
    },
};

// Pretty print in development
if (config.isDevelopment) {
    loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    };
}

export const logger = pino(loggerOptions);

// ============================================================================
// Child Logger Factory
// ============================================================================

/**
 * Create a child logger with request context
 */
export const createRequestLogger = (requestId: string, userId?: string) => {
    return logger.child({
        requestId,
        userId,
    });
};

// ============================================================================
// Logging Helpers
// ============================================================================

export const logRequest = (
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId?: string,
    userId?: string
) => {
    const logData = {
        requestId,
        userId,
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
    };

    if (statusCode >= 500) {
        logger.error(logData, 'Request failed with server error');
    } else if (statusCode >= 400) {
        logger.warn(logData, 'Request failed with client error');
    } else {
        logger.info(logData, 'Request completed');
    }
};

export const logError = (
    error: Error,
    context?: Record<string, any>
) => {
    logger.error({
        err: {
            name: error.name,
            message: error.message,
            stack: config.isDevelopment ? error.stack : undefined,
        },
        ...context,
    }, 'Error occurred');
};

export const logDatabaseQuery = (
    operation: string,
    model: string,
    duration: number
) => {
    logger.debug({
        operation,
        model,
        duration: `${duration}ms`,
    }, 'Database query executed');
};

export const logCacheOperation = (
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    duration?: number
) => {
    logger.debug({
        cacheOperation: operation,
        key,
        duration: duration ? `${duration}ms` : undefined,
    }, `Cache ${operation}`);
};

export const logAIRequest = (
    model: string,
    success: boolean,
    duration: number,
    error?: string
) => {
    const logFn = success ? logger.info : logger.warn;
    logFn({
        aiModel: model,
        success,
        duration: `${duration}ms`,
        error,
    }, 'AI request completed');
};

export default logger;
