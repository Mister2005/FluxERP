/**
 * Redis client configuration
 * Provides caching functionality for the application
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Redis client interface (compatible with ioredis)
interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
    setex(key: string, seconds: number, value: string): Promise<string>;
    del(...keys: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    ping(): Promise<string>;
    quit(): Promise<string>;
    flushdb(): Promise<string>;
}

// In-memory cache for when Redis is not available
class InMemoryCache implements RedisClient {
    private cache: Map<string, { value: string; expiry: number | null }> = new Map();
    private isConnected = true;

    async get(key: string): Promise<string | null> {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (item.expiry && Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
        const expiry = mode === 'EX' && duration ? Date.now() + duration * 1000 : null;
        this.cache.set(key, { value, expiry });
        return 'OK';
    }

    async setex(key: string, seconds: number, value: string): Promise<string> {
        this.cache.set(key, { value, expiry: Date.now() + seconds * 1000 });
        return 'OK';
    }

    async del(...keys: string[]): Promise<number> {
        let count = 0;
        for (const key of keys) {
            if (this.cache.delete(key)) count++;
        }
        return count;
    }

    async keys(pattern: string): Promise<string[]> {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.cache.keys()).filter(key => regex.test(key));
    }

    async ping(): Promise<string> {
        return 'PONG';
    }

    async quit(): Promise<string> {
        this.isConnected = false;
        this.cache.clear();
        return 'OK';
    }

    async flushdb(): Promise<string> {
        this.cache.clear();
        return 'OK';
    }
}

// Export singleton instance
let redisClient: RedisClient;
let isRedisConnected = false;

/**
 * Initialize Redis client
 * Falls back to in-memory cache if Redis is not available
 */
export async function initializeRedis(): Promise<RedisClient> {
    if (redisClient) return redisClient;

    const redisUrl = config.redis?.url || process.env.REDIS_URL;
    
    if (redisUrl) {
        try {
            // Dynamically import ioredis only if URL is provided
            // @ts-ignore - ioredis may not be installed
            const Redis = (await import('ioredis')).default;
            const client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                retryStrategy: (times: number) => Math.min(times * 100, 3000),
            });

            await client.connect();
            await client.ping();
            
            isRedisConnected = true;
            logger.info('Redis connected successfully');
            redisClient = client as unknown as RedisClient;
            return redisClient;
        } catch (error) {
            logger.warn({ error: (error as Error).message }, 'Redis connection failed, using in-memory cache');
        }
    }

    // Use in-memory cache as fallback
    logger.info('Using in-memory cache (Redis not configured)');
    redisClient = new InMemoryCache();
    return redisClient;
}

/**
 * Get Redis client (initializes if needed)
 */
export async function getRedisClient(): Promise<RedisClient> {
    if (!redisClient) {
        await initializeRedis();
    }
    return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisAvailable(): boolean {
    return isRedisConnected;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
}

export { redisClient };
export default { initializeRedis, getRedisClient, isRedisAvailable, closeRedis };
