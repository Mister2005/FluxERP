import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Environment Configuration
// ============================================================================

const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (value === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number for environment variable: ${key}`);
    }
    return parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
};

export const config = {
    // Server
    env: getEnvVar('NODE_ENV', 'development'),
    nodeEnv: getEnvVar('NODE_ENV', 'development'), // Alias for compatibility
    port: getEnvNumber('PORT', 5000),
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',

    // URLs
    frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:3000'),
    corsOrigins: getEnvVar('CORS_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),

    // Database
    databaseUrl: getEnvVar('DATABASE_URL', 'file:./dev.db'),

    // Redis
    redisUrl: process.env.REDIS_URL || '',
    redisEnabled: getEnvBoolean('REDIS_ENABLED', false),
    redis: {
        url: process.env.REDIS_URL || '',
        enabled: getEnvBoolean('REDIS_ENABLED', false),
    },

    // JWT
    jwtSecret: getEnvVar('JWT_SECRET', 'default-secret-change-in-production'),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),

    // AI Providers
    geminiApiKey: getEnvVar('GEMINI_API_KEY', ''),
    groqApiKey: getEnvVar('GROQ_API_KEY', ''),
    ollamaApiKey: getEnvVar('OLLAMA_API_KEY', ''),
    ollamaUrl: getEnvVar('OLLAMA_URL', ''),

    // Rate Limiting
    rateLimit: {
        windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
        maxRequests: getEnvNumber('RATE_LIMIT_MAX', 100),
        aiMaxRequests: getEnvNumber('RATE_LIMIT_AI_MAX', 10),
        authMaxRequests: getEnvNumber('RATE_LIMIT_AUTH_MAX', 5),
    },

    // Logging
    logLevel: getEnvVar('LOG_LEVEL', 'info'),

    // Cache TTL (seconds)
    cache: {
        productsTtl: getEnvNumber('CACHE_PRODUCTS_TTL', 300), // 5 minutes
        bomsTtl: getEnvNumber('CACHE_BOMS_TTL', 300),
        rolesTtl: getEnvNumber('CACHE_ROLES_TTL', 900), // 15 minutes
        defaultTtl: getEnvNumber('CACHE_DEFAULT_TTL', 300),
    },

    // Pagination defaults
    pagination: {
        defaultLimit: getEnvNumber('PAGINATION_DEFAULT_LIMIT', 20),
        maxLimit: getEnvNumber('PAGINATION_MAX_LIMIT', 100),
    },
} as const;

// Validate critical config in production
if (config.isProduction) {
    if (config.jwtSecret === 'default-secret-change-in-production') {
        throw new Error('JWT_SECRET must be set in production');
    }
}

export default config;
