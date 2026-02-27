import prisma from '../lib/db.js';
import { NotFoundError, ConflictError, UnauthorizedError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { hashPassword, comparePassword, generateToken, clearPermissionCache } from '../middleware/auth.middleware.js';

// ============================================================================
// Types (aligned with Prisma schema - User uses IAMRole)
// ============================================================================

export interface RegisterInput {
    email: string;
    password: string;
    name: string;
    roleId?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
    roleId?: string;
    isActive?: boolean;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

// ============================================================================
// Auth Service
// ============================================================================

export class AuthService {
    /**
     * Register a new user
     */
    async register(data: RegisterInput) {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new ConflictError('Email already registered');
        }

        // Get default role or specified role
        let roleId = data.roleId;
        if (!roleId) {
            const defaultRole = await prisma.iAMRole.findFirst({
                where: { name: 'Viewer' },
            });
            if (!defaultRole) {
                // Create a default viewer role if it doesn't exist
                const newRole = await prisma.iAMRole.create({
                    data: {
                        name: 'Viewer',
                        description: 'Read-only access',
                        isSystem: true,
                        permissions: JSON.stringify(['read']),
                    },
                });
                roleId = newRole.id;
            } else {
                roleId = defaultRole.id;
            }
        }

        const hashedPassword = await hashPassword(data.password);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                roleId,
                isActive: true,
            },
            include: {
                role: true,
            },
        });

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role.name,
        });

        logger.info({ userId: user.id, email: user.email }, 'User registered');

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
            },
            token,
        };
    }

    /**
     * Login user
     */
    async login(data: LoginInput) {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
            include: { role: true },
        });

        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Account is deactivated');
        }

        const isValidPassword = await comparePassword(data.password, user.password);

        if (!isValidPassword) {
            logger.warn({ email: data.email }, 'Failed login attempt');
            throw new UnauthorizedError('Invalid email or password');
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role.name,
        });

        logger.info({ userId: user.id }, 'User logged in');

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                permissions: JSON.parse(user.role.permissions || '[]'),
            },
            token,
        };
    }

    /**
     * Get current user profile
     */
    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.name,
            permissions: JSON.parse(user.role.permissions),
            createdAt: user.createdAt,
        };
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: { name?: string }) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
            },
            include: { role: true },
        });

        logger.info({ userId }, 'User profile updated');

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.name,
        };
    }

    /**
     * Change user password
     */
    async changePassword(userId: string, data: ChangePasswordInput) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const isValidPassword = await comparePassword(data.currentPassword, user.password);

        if (!isValidPassword) {
            throw new UnauthorizedError('Current password is incorrect');
        }

        const hashedPassword = await hashPassword(data.newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        logger.info({ userId }, 'Password changed');
    }
}

// ============================================================================
// User Management Service
// ============================================================================

export class UserService {
    /**
     * Get all users (admin only)
     */
    async findAll(options: { page?: number; limit?: number; search?: string } = {}) {
        const { page = 1, limit = 20, search } = options;
        const skip = (page - 1) * limit;

        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                ],
            }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isActive: true,
                    createdAt: true,
                    role: {
                        select: { id: true, name: true },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get user by ID
     */
    async findById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
                createdAt: true,
                role: {
                    select: { id: true, name: true, permissions: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return {
            ...user,
            role: {
                ...user.role,
                permissions: JSON.parse(user.role.permissions),
            },
        };
    }

    /**
     * Update user (admin only)
     */
    async update(userId: string, data: UpdateUserInput, adminId: string) {
        const existing = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existing) {
            throw new NotFoundError('User not found');
        }

        // Check email uniqueness if changing email
        if (data.email && data.email !== existing.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email: data.email },
            });
            if (emailExists) {
                throw new ConflictError('Email already in use');
            }
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                roleId: data.roleId,
                isActive: data.isActive,
            },
            include: { role: true },
        });

        // Clear permission cache if role changed
        if (data.roleId) {
            clearPermissionCache(userId);
        }

        logger.info({ userId, updatedBy: adminId }, 'User updated');

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            isActive: user.isActive,
            role: user.role.name,
        };
    }

    /**
     * Deactivate user (admin only)
     */
    async deactivate(userId: string, adminId: string) {
        const existing = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existing) {
            throw new NotFoundError('User not found');
        }

        if (userId === adminId) {
            throw new ConflictError('Cannot deactivate your own account');
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        });

        logger.info({ userId, deactivatedBy: adminId }, 'User deactivated');
    }

    /**
     * Reactivate user (admin only)
     */
    async reactivate(userId: string, adminId: string) {
        const existing = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existing) {
            throw new NotFoundError('User not found');
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isActive: true },
        });

        logger.info({ userId, reactivatedBy: adminId }, 'User reactivated');
    }
}

// Export singleton instances
export const authService = new AuthService();
export const userService = new UserService();
