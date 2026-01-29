import { Router, Request, Response } from 'express';
import prisma from '../lib/db';
import { hashPassword, comparePassword, generateToken, authenticate, AuthRequest } from '../lib/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, name, roleId } = req.body;
        if (!email || !password || !name || !roleId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name, roleId },
            include: { role: true },
        });
        const token = generateToken({ userId: user.id, email: user.email, roleId: user.roleId });
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = generateToken({ userId: user.id, email: user.email, roleId: user.roleId });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            include: { role: true },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

router.post('/logout', authenticate, (req: Request, res: Response) => {
    res.json({ message: 'Logged out successfully' });
});

export default router;
