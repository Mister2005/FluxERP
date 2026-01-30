import { Router } from 'express';
import { authenticate } from '../lib/auth';
import prisma from '../lib/db';

const router = Router();
router.use(authenticate);

// Get all roles with user count
router.get('/', async (req, res) => {
    try {
        const roles = await prisma.iAMRole.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        
        // Add userCount field for frontend compatibility
        const rolesWithCount = roles.map(role => ({
            ...role,
            userCount: role._count.users
        }));
        
        res.json(rolesWithCount);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// Get single role
router.get('/:id', async (req, res) => {
    try {
        const role = await prisma.iAMRole.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
        
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        res.json({ ...role, userCount: role._count.users });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ error: 'Failed to fetch role' });
    }
});

// Create role
router.post('/', async (req, res) => {
    try {
        const { name, description, permissions = [] } = req.body;
        
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }
        
        // Check if role name already exists
        const existingRole = await prisma.iAMRole.findUnique({ where: { name } });
        if (existingRole) {
            return res.status(400).json({ error: 'Role name already exists' });
        }
        
        const role = await prisma.iAMRole.create({
            data: {
                name,
                description,
                permissions: JSON.stringify(permissions),
                isSystem: false
            }
        });
        
        res.status(201).json({ ...role, userCount: 0 });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// Update role
router.put('/:id', async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        
        const existingRole = await prisma.iAMRole.findUnique({ where: { id: req.params.id } });
        if (!existingRole) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        // Prevent editing system roles
        if (existingRole.isSystem) {
            return res.status(400).json({ error: 'Cannot edit system roles' });
        }
        
        // If changing name, check it doesn't conflict
        if (name && name !== existingRole.name) {
            const nameExists = await prisma.iAMRole.findUnique({ where: { name } });
            if (nameExists) {
                return res.status(400).json({ error: 'Role name already exists' });
            }
        }
        
        const updateData: any = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (permissions) updateData.permissions = JSON.stringify(permissions);
        
        const role = await prisma.iAMRole.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
        
        res.json({ ...role, userCount: role._count.users });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Delete role
router.delete('/:id', async (req, res) => {
    try {
        const role = await prisma.iAMRole.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
        
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        // Prevent deleting system roles
        if (role.isSystem) {
            return res.status(400).json({ error: 'Cannot delete system roles' });
        }
        
        // Prevent deleting roles with users
        if (role._count.users > 0) {
            return res.status(400).json({ error: 'Cannot delete role with assigned users. Reassign users first.' });
        }
        
        await prisma.iAMRole.delete({ where: { id: req.params.id } });
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

export default router;
