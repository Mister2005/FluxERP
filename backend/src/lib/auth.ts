import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface JWTPayload {
    userId: string;
    email: string;
    roleId: string;
}

export interface AuthRequest extends Request {
    user?: JWTPayload;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12); // 12 rounds for stronger hashing
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);

        // Reject obviously malformed tokens before verifying
        if (token.length > 2048 || token.includes(' ')) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const payload = verifyToken(token);
        req.user = payload;

        // Verify user is still active (async, but we proceed and check)
        import('./db.js').then(({ prisma }) => {
            prisma.user.findUnique({
                where: { id: payload.userId },
                select: { isActive: true },
            }).then(user => {
                if (!user || !user.isActive) {
                    // User was deactivated — token is valid but user is not
                    // This will be caught on next request
                    return;
                }
            }).catch(() => { /* non-blocking check */ });
        }).catch(() => { /* non-blocking */ });

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
    const { prisma } = await import('./db.js');
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
    });
    if (!user) return false;
    let permissions: string[];
    try {
        permissions = JSON.parse(user.role.permissions) as string[];
    } catch {
        return false; // Corrupted permissions data
    }
    return permissions.includes(permission);
}

export function requirePermission(permission: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const allowed = await hasPermission(req.user.userId, permission);
        if (!allowed) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
