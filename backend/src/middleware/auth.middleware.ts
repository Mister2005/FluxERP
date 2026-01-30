import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Response, NextFunction } from 'express';
import { AuthRequest, JWTPayload } from '../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../types/errors.js';
import config from '../config/index.js';
import prisma from '../lib/db.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Password Utilities
// ============================================================================

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12); // Increased from 10 to 12 rounds
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ============================================================================
// JWT Utilities
// ============================================================================

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwtSecret, { 
        expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn']
    });
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
}

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, isActive: true },
        });

        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('User account is deactivated');
        }

        req.user = payload;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new UnauthorizedError('Invalid token'));
        }
        if (error instanceof jwt.TokenExpiredError) {
            return next(new UnauthorizedError('Token expired'));
        }
        next(error);
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (error) {
        // Silently fail and continue without user
        next();
    }
};

// ============================================================================
// Authorization Middleware
// ============================================================================

/**
 * Cache for user permissions (in-memory, consider Redis for production)
 */
const permissionCache = new Map<string, { permissions: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user permissions with caching
 */
async function getUserPermissions(userId: string): Promise<string[]> {
    const cached = permissionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.permissions;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
    });

    if (!user) return [];

    const permissions = JSON.parse(user.role.permissions) as string[];
    permissionCache.set(userId, { permissions, timestamp: Date.now() });
    
    return permissions;
}

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId: string) {
    permissionCache.delete(userId);
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await getUserPermissions(userId);
    
    // Check for exact match or wildcard
    return permissions.includes(permission) || 
           permissions.includes('*') || 
           permissions.some(p => {
               // Handle wildcard patterns like 'products.*'
               if (p.endsWith('.*')) {
                   const prefix = p.slice(0, -2);
                   return permission.startsWith(prefix);
               }
               return false;
           });
}

/**
 * Require specific permission middleware
 */
export const requirePermission = (permission: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new UnauthorizedError('Not authenticated'));
        }

        const allowed = await hasPermission(req.user.userId, permission);
        
        if (!allowed) {
            logger.warn({
                userId: req.user.userId,
                permission,
                path: req.path,
            }, 'Permission denied');
            
            return next(new ForbiddenError(`Insufficient permissions: ${permission} required`));
        }

        next();
    };
};

/**
 * Require any of the specified permissions
 */
export const requireAnyPermission = (permissions: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new UnauthorizedError('Not authenticated'));
        }

        for (const permission of permissions) {
            if (await hasPermission(req.user.userId, permission)) {
                return next();
            }
        }

        return next(new ForbiddenError(
            `Insufficient permissions: one of [${permissions.join(', ')}] required`
        ));
    };
};

/**
 * Require all of the specified permissions
 */
export const requireAllPermissions = (permissions: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new UnauthorizedError('Not authenticated'));
        }

        for (const permission of permissions) {
            if (!(await hasPermission(req.user.userId, permission))) {
                return next(new ForbiddenError(
                    `Insufficient permissions: ${permission} required`
                ));
            }
        }

        next();
    };
};

/**
 * Require user to be the owner of a resource or have admin permission
 */
export const requireOwnerOrPermission = (
    getOwnerId: (req: AuthRequest) => Promise<string | null>,
    permission: string
) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new UnauthorizedError('Not authenticated'));
        }

        // Check if user has the permission (admin override)
        if (await hasPermission(req.user.userId, permission)) {
            return next();
        }

        // Check if user is the owner
        const ownerId = await getOwnerId(req);
        if (ownerId === req.user.userId) {
            return next();
        }

        return next(new ForbiddenError('Not authorized to access this resource'));
    };
};
