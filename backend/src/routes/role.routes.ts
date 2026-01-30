import { Router } from 'express';
import { IAMRole } from '@prisma/client';
import prisma from '../lib/db.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All role routes require authentication
router.use(authenticate);

// ============================================================================
// Role Management Routes
// ============================================================================

/**
 * GET /api/roles
 * Get all roles
 */
router.get('/',
    requirePermission('roles.read'),
    catchAsync(async (req, res) => {
        const roles = await prisma.iAMRole.findMany({
            orderBy: { name: 'asc' },
        });

        const formattedRoles = roles.map((role: IAMRole) => ({
            ...role,
            permissions: JSON.parse(role.permissions),
        }));

        res.json(successResponse(formattedRoles));
    })
);

/**
 * GET /api/roles/:id
 * Get role by ID
 */
router.get('/:id',
    requirePermission('roles.read'),
    catchAsync(async (req, res) => {
        const role = await prisma.iAMRole.findUnique({
            where: { id: req.params.id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }

        res.json(successResponse({
            ...role,
            permissions: JSON.parse(role.permissions),
        }));
    })
);

/**
 * POST /api/roles
 * Create a new role
 */
router.post('/',
    requirePermission('roles.write'),
    catchAsync(async (req, res) => {
        const { name, description, permissions } = req.body;

        // Check for duplicate name
        const existing = await prisma.iAMRole.findUnique({
            where: { name },
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Role with this name already exists',
            });
        }

        const role = await prisma.iAMRole.create({
            data: {
                name,
                description: description || '',
                permissions: JSON.stringify(permissions || []),
            },
        });

        res.status(201).json(successResponse({
            ...role,
            permissions: JSON.parse(role.permissions),
        }, 'Role created successfully'));
    })
);

/**
 * PUT /api/roles/:id
 * Update a role
 */
router.put('/:id',
    requirePermission('roles.write'),
    catchAsync(async (req, res) => {
        const { name, description, permissions } = req.body;

        const existing = await prisma.iAMRole.findUnique({
            where: { id: req.params.id },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }

        // Check name uniqueness if changing
        if (name && name !== existing.name) {
            const nameExists = await prisma.iAMRole.findUnique({
                where: { name },
            });
            if (nameExists) {
                return res.status(409).json({
                    success: false,
                    error: 'Role with this name already exists',
                });
            }
        }

        const role = await prisma.iAMRole.update({
            where: { id: req.params.id },
            data: {
                name,
                description,
                permissions: permissions ? JSON.stringify(permissions) : undefined,
            },
        });

        res.json(successResponse({
            ...role,
            permissions: JSON.parse(role.permissions),
        }, 'Role updated successfully'));
    })
);

/**
 * DELETE /api/roles/:id
 * Delete a role
 */
router.delete('/:id',
    requirePermission('roles.delete'),
    catchAsync(async (req, res) => {
        const role = await prisma.iAMRole.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { users: true } } },
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }

        // Prevent deletion of system roles
        if (role.isSystem) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete system roles',
            });
        }

        // Check if role has users
        if (role._count.users > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete role: ${role._count.users} users have this role`,
            });
        }

        await prisma.iAMRole.delete({
            where: { id: req.params.id },
        });

        res.json(successResponse(null, 'Role deleted successfully'));
    })
);

/**
 * GET /api/roles/permissions/list
 * Get list of all available permissions
 */
router.get('/permissions/list',
    requirePermission('roles.read'),
    catchAsync(async (req, res) => {
        const permissions = [
            // Products
            { key: 'products.read', description: 'View products' },
            { key: 'products.write', description: 'Create and edit products' },
            { key: 'products.delete', description: 'Delete products' },
            
            // ECOs
            { key: 'ecos.read', description: 'View ECOs' },
            { key: 'ecos.write', description: 'Create and edit ECOs' },
            { key: 'ecos.delete', description: 'Delete ECOs' },
            { key: 'ecos.approve', description: 'Approve/reject ECOs' },
            
            // BOMs
            { key: 'boms.read', description: 'View BOMs' },
            { key: 'boms.write', description: 'Create and edit BOMs' },
            { key: 'boms.delete', description: 'Delete BOMs' },
            
            // Work Orders
            { key: 'workorders.read', description: 'View work orders' },
            { key: 'workorders.write', description: 'Create and edit work orders' },
            { key: 'workorders.delete', description: 'Delete work orders' },
            
            // Suppliers
            { key: 'suppliers.read', description: 'View suppliers' },
            { key: 'suppliers.write', description: 'Create and edit suppliers' },
            { key: 'suppliers.delete', description: 'Delete suppliers' },
            
            // Reports
            { key: 'reports.read', description: 'View reports and dashboards' },
            
            // Users
            { key: 'users.read', description: 'View users' },
            { key: 'users.write', description: 'Create and edit users' },
            
            // Roles
            { key: 'roles.read', description: 'View roles' },
            { key: 'roles.write', description: 'Create and edit roles' },
            { key: 'roles.delete', description: 'Delete roles' },
            
            // AI
            { key: 'ai.chat', description: 'Use AI assistant' },
            { key: 'ai.analyze', description: 'Use AI analysis features' },
            
            // Admin
            { key: '*', description: 'Full admin access (all permissions)' },
        ];

        res.json(successResponse(permissions));
    })
);

export default router;
