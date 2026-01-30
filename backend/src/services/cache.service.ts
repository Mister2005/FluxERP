/**
 * Cache Service
 * Provides high-level caching operations with automatic serialization
 */

import { getRedisClient, isRedisAvailable } from '../lib/redis.js';
import { logger } from '../utils/logger.js';

// Cache TTL constants (in seconds)
export const CacheTTL = {
    SHORT: 60,           // 1 minute
    MEDIUM: 300,         // 5 minutes
    LONG: 900,           // 15 minutes
    VERY_LONG: 3600,     // 1 hour
    DAY: 86400,          // 24 hours
} as const;

// Cache key prefixes
export const CacheKeys = {
    PRODUCTS: 'products',
    PRODUCT: 'product',
    BOMS: 'boms',
    BOM: 'bom',
    ECOS: 'ecos',
    ECO: 'eco',
    ROLES: 'roles',
    USERS: 'users',
    DASHBOARD: 'dashboard',
    ANALYTICS: 'analytics',
} as const;

class CacheService {
    /**
     * Get a cached value
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const redis = await getRedisClient();
            const data = await redis.get(key);
            
            if (!data) return null;
            
            return JSON.parse(data) as T;
        } catch (error) {
            logger.error({ key, error: (error as Error).message }, 'Cache get error');
            return null;
        }
    }

    /**
     * Set a cached value
     */
    async set<T>(key: string, value: T, ttlSeconds: number = CacheTTL.MEDIUM): Promise<boolean> {
        try {
            const redis = await getRedisClient();
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error({ key, error: (error as Error).message }, 'Cache set error');
            return false;
        }
    }

    /**
     * Delete a cached value
     */
    async delete(key: string): Promise<boolean> {
        try {
            const redis = await getRedisClient();
            await redis.del(key);
            return true;
        } catch (error) {
            logger.error({ key, error: (error as Error).message }, 'Cache delete error');
            return false;
        }
    }

    /**
     * Delete all keys matching a pattern
     */
    async invalidatePattern(pattern: string): Promise<number> {
        try {
            const redis = await getRedisClient();
            const keys = await redis.keys(pattern);
            
            if (keys.length === 0) return 0;
            
            const deleted = await redis.del(...keys);
            logger.debug({ pattern, count: deleted }, 'Cache invalidated');
            return deleted;
        } catch (error) {
            logger.error({ pattern, error: (error as Error).message }, 'Cache invalidate error');
            return 0;
        }
    }

    /**
     * Get or set - returns cached value or fetches and caches it
     */
    async getOrSet<T>(
        key: string, 
        fetchFn: () => Promise<T>, 
        ttlSeconds: number = CacheTTL.MEDIUM
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            logger.debug({ key }, 'Cache hit');
            return cached;
        }

        // Fetch and cache
        logger.debug({ key }, 'Cache miss');
        const value = await fetchFn();
        await this.set(key, value, ttlSeconds);
        return value;
    }

    // =========================================================================
    // Entity-specific cache methods
    // =========================================================================

    /**
     * Invalidate all product-related caches
     */
    async invalidateProducts(): Promise<void> {
        await this.invalidatePattern(`${CacheKeys.PRODUCTS}:*`);
        await this.invalidatePattern(`${CacheKeys.PRODUCT}:*`);
        await this.invalidatePattern(`${CacheKeys.DASHBOARD}:*`);
    }

    /**
     * Invalidate all BOM-related caches
     */
    async invalidateBOMs(): Promise<void> {
        await this.invalidatePattern(`${CacheKeys.BOMS}:*`);
        await this.invalidatePattern(`${CacheKeys.BOM}:*`);
        await this.invalidatePattern(`${CacheKeys.DASHBOARD}:*`);
    }

    /**
     * Invalidate all ECO-related caches
     */
    async invalidateECOs(): Promise<void> {
        await this.invalidatePattern(`${CacheKeys.ECOS}:*`);
        await this.invalidatePattern(`${CacheKeys.ECO}:*`);
        await this.invalidatePattern(`${CacheKeys.DASHBOARD}:*`);
        await this.invalidatePattern(`${CacheKeys.ANALYTICS}:*`);
    }

    /**
     * Invalidate all role/permission caches
     */
    async invalidateRoles(): Promise<void> {
        await this.invalidatePattern(`${CacheKeys.ROLES}:*`);
    }

    /**
     * Check if caching is available
     */
    isAvailable(): boolean {
        return isRedisAvailable();
    }

    // =========================================================================
    // Helper methods for building cache keys
    // =========================================================================

    /**
     * Build a list cache key with optional filters
     */
    buildListKey(prefix: string, filters?: Record<string, string | number | boolean>): string {
        if (!filters || Object.keys(filters).length === 0) {
            return `${prefix}:list`;
        }
        
        const sortedFilters = Object.entries(filters)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        
        return `${prefix}:list:${sortedFilters}`;
    }

    /**
     * Build an entity cache key
     */
    buildEntityKey(prefix: string, id: string): string {
        return `${prefix}:${id}`;
    }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
