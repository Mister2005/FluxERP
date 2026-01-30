import { Router } from 'express';
import { authenticate } from '../lib/auth';
import prisma from '../lib/db';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                role: true
            },
            orderBy: { createdAt: 'desc' }
        });
        
        // Remove password from response
        const safeUsers = users.map(({ password, ...user }) => user);
        res.json(safeUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user
router.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: { role: true }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { password, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create user
router.post('/', async (req, res) => {
    try {
        const { email, password, name, roleId, isActive = true } = req.body;
        
        if (!email || !password || !name || !roleId) {
            return res.status(400).json({ error: 'Email, password, name, and roleId are required' });
        }
        
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                roleId,
                isActive
            },
            include: { role: true }
        });
        
        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const { email, password, name, roleId, isActive } = req.body;
        
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // If changing email, check it's not already in use
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({ where: { email } });
            if (emailExists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        
        const updateData: any = {};
        if (email) updateData.email = email;
        if (name) updateData.name = name;
        if (roleId) updateData.roleId = roleId;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            include: { role: true }
        });
        
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete user with associated records' });
        }
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
