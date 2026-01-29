import express, { Express, Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/db.js';
import { hashPassword, comparePassword, generateToken, authenticate, AuthRequest, requirePermission } from './lib/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
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

authRouter.post('/login', async (req: Request, res: Response) => {
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

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
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

authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
    res.json({ message: 'Logged out successfully' });
});

// Products Routes
const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get('/', requirePermission('products.view'), async (req: AuthRequest, res: Response) => {
    try {
        const { category, status, search } = req.query;
        const where: any = {};
        if (category) where.category = String(category);
        if (status) where.status = String(status);
        if (search) {
            where.OR = [
                { name: { contains: String(search) } },
                { sku: { contains: String(search) } },
            ];
        }
        const products = await prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' } });
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

productsRouter.get('/:id', requirePermission('products.view'), async (req: AuthRequest, res: Response) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: String(req.params.id) },
            include: { boms: true, ecos: true, workOrders: true },
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});


productsRouter.post('/', requirePermission('products.create'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, sku, category, description, cost, quantity, supplier, status } = req.body;
        if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }

        const existing = await prisma.product.findUnique({ where: { sku } });
        if (existing) {
            return res.status(409).json({ error: 'Product with this SKU already exists' });
        }

        const product = await prisma.product.create({
            data: {
                name,
                sku,
                category,
                description,
                cost: cost ? parseFloat(cost) : 0,
                quantity: quantity ? parseInt(quantity) : 0,
                supplier,
                status: status || 'active'
            }
        });
        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

productsRouter.put('/:id', requirePermission('products.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { name, sku, category, description, cost, quantity, supplier, status } = req.body;

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Product not found' });

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(sku && { sku }),
                ...(category && { category }),
                ...(description && { description }),
                ...(cost !== undefined && { cost: parseFloat(cost) }),
                ...(quantity !== undefined && { quantity: parseInt(quantity) }),
                ...(supplier && { supplier }),
                ...(status && { status })
            }
        });
        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

productsRouter.delete('/:id', requirePermission('products.delete'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// BOMs Routes
const bomsRouter = Router();
bomsRouter.use(authenticate);

bomsRouter.get('/', requirePermission('boms.view'), async (req: AuthRequest, res: Response) => {
    try {
        const boms = await prisma.bOM.findMany({
            include: {
                product: true,
                components: { include: { product: true } },
                operations: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(boms);
    } catch (error) {
        console.error('Get BOMs error:', error);
        res.status(500).json({ error: 'Failed to fetch BOMs' });
    }
});

bomsRouter.get('/:id', requirePermission('boms.view'), async (req: AuthRequest, res: Response) => {
    try {
        const bom = await prisma.bOM.findUnique({
            where: { id: String(req.params.id) },
            include: {
                product: true,
                components: { include: { product: true } },
                operations: true,
                ecos: true,
            },
        });
        if (!bom) return res.status(404).json({ error: 'BOM not found' });
        res.json(bom);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch BOM' });
    }
});

// Get BOM version history
bomsRouter.get('/:id/versions', requirePermission('boms.view'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const bom = await prisma.bOM.findUnique({ where: { id } });
        if (!bom) return res.status(404).json({ error: 'BOM not found' });

        // Get all versions (including this one and its siblings)
        const rootId = bom.parentId || bom.id;
        const versions = await prisma.bOM.findMany({
            where: {
                OR: [
                    { id: rootId },
                    { parentId: rootId }
                ]
            },
            include: {
                product: { select: { id: true, name: true, sku: true } },
                components: { include: { product: true } },
                operations: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(versions);
    } catch (error) {
        console.error('Get BOM versions error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM versions' });
    }
});

bomsRouter.post('/', requirePermission('boms.create'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, productId, version, status, components, operations } = req.body;

        if (!name || !productId) {
            return res.status(400).json({ error: 'Name and Product ID are required' });
        }

        // Calculate total cost from components and operations
        let totalCost = 0;
        if (components && Array.isArray(components)) {
            totalCost += components.reduce((sum: number, c: any) => sum + (c.quantity * c.unitCost), 0);
        }
        if (operations && Array.isArray(operations)) {
            totalCost += operations.reduce((sum: number, o: any) => sum + (o.cost || 0), 0);
        }

        const bom = await prisma.bOM.create({
            data: {
                name,
                productId,
                version: version || '1',
                status: status || 'draft',
                totalCost,
                components: {
                    create: components?.map((c: any) => ({
                        productId: c.productId,
                        quantity: parseFloat(c.quantity),
                        unitCost: parseFloat(c.unitCost)
                    })) || []
                },
                operations: {
                    create: operations?.map((o: any, idx: number) => ({
                        name: o.name,
                        workCenter: o.workCenter,
                        duration: parseInt(o.duration),
                        cost: parseFloat(o.cost),
                        sequence: o.sequence || idx + 1
                    })) || []
                }
            },
            include: {
                product: true,
                components: { include: { product: true } },
                operations: true
            }
        });

        res.status(201).json(bom);
    } catch (error) {
        console.error('Create BOM error:', error);
        res.status(500).json({ error: 'Failed to create BOM' });
    }
});

bomsRouter.put('/:id', requirePermission('boms.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { name, version, status, components, operations } = req.body;

        const existing = await prisma.bOM.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'BOM not found' });

        // Calculate new total cost
        let totalCost = existing.totalCost;
        if (components && Array.isArray(components)) {
            totalCost = components.reduce((sum: number, c: any) => sum + (c.quantity * c.unitCost), 0);
            if (operations && Array.isArray(operations)) {
                totalCost += operations.reduce((sum: number, o: any) => sum + (o.cost || 0), 0);
            }
        }

        // Update BOM with components and operations
        const updateData: any = {
            ...(name && { name }),
            ...(version && { version }),
            ...(status && { status }),
            totalCost,
            updatedAt: new Date()
        };

        // If components/operations provided, delete existing and recreate
        if (components) {
            await prisma.bOMComponent.deleteMany({ where: { bomId: id } });
            await prisma.bOMComponent.createMany({
                data: components.map((c: any) => ({
                    bomId: id,
                    productId: c.productId,
                    quantity: parseFloat(c.quantity),
                    unitCost: parseFloat(c.unitCost)
                }))
            });
        }

        if (operations) {
            await prisma.bOMOperation.deleteMany({ where: { bomId: id } });
            await prisma.bOMOperation.createMany({
                data: operations.map((o: any, idx: number) => ({
                    bomId: id,
                    name: o.name,
                    workCenter: o.workCenter,
                    duration: parseInt(o.duration),
                    cost: parseFloat(o.cost),
                    sequence: o.sequence || idx + 1
                }))
            });
        }

        const bom = await prisma.bOM.update({
            where: { id },
            data: updateData,
            include: {
                product: true,
                components: { include: { product: true } },
                operations: true
            }
        });

        res.json(bom);
    } catch (error) {
        console.error('Update BOM error:', error);
        res.status(500).json({ error: 'Failed to update BOM' });
    }
});

bomsRouter.delete('/:id', requirePermission('boms.delete'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        await prisma.bOM.delete({ where: { id } });
        res.json({ message: 'BOM deleted successfully' });
    } catch (error) {
        console.error('Delete BOM error:', error);
        res.status(500).json({ error: 'Failed to delete BOM' });
    }
});

// ECOs Routes
const ecosRouter = Router();
ecosRouter.use(authenticate);

ecosRouter.get('/', requirePermission('ecos.view'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, priority, type, showAll } = req.query;
        const where: any = {};
        
        // By default, only show the latest version of each ECO
        // Use showAll=true to see all versions
        if (!showAll) {
            where.isLatest = true;
        }
        
        if (status) where.status = String(status);
        if (priority) where.priority = String(priority);
        if (type) where.type = String(type);

        const ecos = await prisma.eCO.findMany({
            where,
            include: {
                product: true,
                bom: true,
                requestedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(ecos);
    } catch (error) {
        console.error('Get ECOs error:', error);
        res.status(500).json({ error: 'Failed to fetch ECOs' });
    }
});

ecosRouter.get('/:id', requirePermission('ecos.view'), async (req: AuthRequest, res: Response) => {
    try {
        const eco = await prisma.eCO.findUnique({
            where: { id: String(req.params.id) },
            include: {
                product: true,
                bom: { include: { components: { include: { product: true } }, operations: true } },
                requestedBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true, email: true } },
                executedBy: { select: { id: true, name: true, email: true } },
                auditLogs: { include: { user: { select: { name: true, email: true } } }, orderBy: { timestamp: 'desc' } },
                comments: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!eco) return res.status(404).json({ error: 'ECO not found' });
        res.json(eco);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch ECO' });
    }
});

ecosRouter.post('/', requirePermission('ecos.create'), async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, reason, type, priority, productId, bomId, proposedChanges, impactAnalysis } = req.body;

        if (!title || !description || !type || !priority) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Extract AI analysis fields if provided
        const aiRiskScore = impactAnalysis?.riskScore ?? null;
        const aiPredictedDelay = impactAnalysis?.predictedDelay ?? null;
        const aiKeyRisks = impactAnalysis?.riskFactors ? JSON.stringify(impactAnalysis.riskFactors) : null;

        const eco = await prisma.eCO.create({
            data: {
                title,
                description,
                reason: reason || null,
                type,
                priority,
                status: 'draft',
                productId: productId || null,
                bomId: bomId || null,
                requestedById: req.user!.userId,
                requestedByName: req.user!.email,
                proposedChanges: proposedChanges ? (typeof proposedChanges === 'string' ? proposedChanges : JSON.stringify(proposedChanges)) : '[]',
                impactAnalysis: impactAnalysis ? (typeof impactAnalysis === 'string' ? impactAnalysis : JSON.stringify(impactAnalysis)) : '{}',
                complianceChecks: '[]',
                aiRiskScore,
                aiPredictedDelay,
                aiKeyRisks,
            },
            include: {
                product: true,
                bom: true,
                requestedBy: { select: { id: true, name: true, email: true } },
            },
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entityType: 'ECO',
                entityId: eco.id,
                userId: req.user!.userId,
                newValue: 'draft',
                timestamp: new Date()
            }
        });

        res.status(201).json(eco);
    } catch (error) {
        console.error('Create ECO error:', error);
        res.status(500).json({ error: 'Failed to create ECO' });
    }
});

ecosRouter.put('/:id', requirePermission('ecos.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { title, description, type, priority, status, reason, proposedChanges, impactAnalysis } = req.body;

        const existing = await prisma.eCO.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'ECO not found' });

        // Check if this is a content edit (fields that trigger versioning)
        const hasContentChanges = (
            (title && title !== existing.title) ||
            (description && description !== existing.description) ||
            (type && type !== existing.type) ||
            (priority && priority !== existing.priority) ||
            (reason && reason !== (existing as any).reason) ||
            (proposedChanges !== undefined)
        );

        // Check if this is just a status change
        const isOnlyStatusChange = status && !hasContentChanges;

        // If content has changed (regardless of status), create a new version
        if (hasContentChanges) {
            // Extract AI analysis fields if provided
            const aiRiskScore = impactAnalysis?.riskScore ?? existing.aiRiskScore;
            const aiPredictedDelay = impactAnalysis?.predictedDelay ?? existing.aiPredictedDelay;
            const aiKeyRisks = impactAnalysis?.riskFactors ? JSON.stringify(impactAnalysis.riskFactors) : existing.aiKeyRisks;

            // Create new version
            const newVersion = await prisma.eCO.create({
                data: {
                    title: title || existing.title,
                    description: description || existing.description,
                    reason: reason || existing.reason,
                    type: type || existing.type,
                    priority: priority || existing.priority,
                    status: status || 'draft', // Use provided status or default to draft
                    version: existing.version + 1,
                    parentId: existing.parentId || existing.id,
                    isLatest: true,
                    productId: existing.productId,
                    bomId: existing.bomId,
                    requestedById: req.user!.userId,
                    requestedByName: req.user!.email,
                    proposedChanges: proposedChanges ? (typeof proposedChanges === 'string' ? proposedChanges : JSON.stringify(proposedChanges)) : existing.proposedChanges,
                    impactAnalysis: impactAnalysis ? (typeof impactAnalysis === 'string' ? impactAnalysis : JSON.stringify(impactAnalysis)) : existing.impactAnalysis,
                    complianceChecks: existing.complianceChecks,
                    aiRiskScore,
                    aiPredictedDelay,
                    aiKeyRisks,
                },
                include: {
                    product: true,
                    bom: true,
                    requestedBy: { select: { id: true, name: true, email: true } },
                },
            });

            // Mark previous version as not latest
            await prisma.eCO.update({
                where: { id },
                data: { isLatest: false }
            });

            await prisma.auditLog.create({
                data: {
                    action: 'CREATE_VERSION',
                    entityType: 'ECO',
                    entityId: newVersion.id,
                    userId: req.user!.userId,
                    oldValue: `v${existing.version}`,
                    newValue: `v${newVersion.version}`,
                    timestamp: new Date()
                }
            });

            return res.status(201).json(newVersion);
        }

        // Otherwise, just update status (no versioning needed for status changes only)
        if (isOnlyStatusChange) {
            const updateData: any = { status };

            if (status === 'approved' && existing.status !== 'approved') {
                updateData.approvedById = req.user!.userId;
                updateData.approvalDate = new Date();
            }

            if (status === 'implemented' && existing.status !== 'implemented') {
                updateData.executedById = req.user!.userId;
                updateData.executedAt = new Date();
            }

            const eco = await prisma.eCO.update({
                where: { id },
                data: updateData,
                include: {
                    product: true,
                    bom: true,
                    requestedBy: { select: { id: true, name: true, email: true } },
                    approvedBy: { select: { id: true, name: true, email: true } },
                    executedBy: { select: { id: true, name: true, email: true } },
                    auditLogs: { include: { user: { select: { name: true, email: true } } }, orderBy: { timestamp: 'desc' } },
                    comments: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
                },
            });

            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE_STATUS',
                    entityType: 'ECO',
                    entityId: id,
                    userId: req.user!.userId,
                    oldValue: existing.status,
                    newValue: status,
                    timestamp: new Date()
                }
            });

            return res.json(eco);
        }

        // No changes detected - return existing
        return res.json(existing);
    } catch (error) {
        console.error('Update ECO error:', error);
        res.status(500).json({ error: 'Failed to update ECO' });
    }
});

ecosRouter.post('/:id/comments', requirePermission('ecos.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const { content } = req.body;
        const comment = await prisma.eCOComment.create({
            data: {
                content,
                ecoId: String(req.params.id),
                userId: req.user!.userId
            },
            include: { user: { select: { name: true, email: true } } }
        });
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Get ECO versions
ecosRouter.get('/:id/versions', requirePermission('ecos.view'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const eco = await prisma.eCO.findUnique({ where: { id } });
        if (!eco) return res.status(404).json({ error: 'ECO not found' });

        // Get the root parent ID
        const rootId = eco.parentId || id;

        // Get all versions in this family
        const versions = await prisma.eCO.findMany({
            where: {
                OR: [
                    { id: rootId },
                    { parentId: rootId }
                ]
            },
            include: {
                requestedBy: { select: { id: true, name: true, email: true } },
                approvedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { version: 'asc' }
        });

        res.json(versions);
    } catch (error) {
        console.error('Get ECO versions error:', error);
        res.status(500).json({ error: 'Failed to get ECO versions' });
    }
});

ecosRouter.post('/:id/submit', requirePermission('ecos.submit'), async (req: AuthRequest, res: Response) => {
    try {
        const eco = await prisma.eCO.update({
            where: { id: String(req.params.id) },
            data: { status: 'in-review' },
        });
        res.json(eco);
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit ECO' });
    }
});

ecosRouter.post('/:id/approve', requirePermission('ecos.approve'), async (req: AuthRequest, res: Response) => {
    try {
        const eco = await prisma.eCO.update({
            where: { id: String(req.params.id) },
            data: { status: 'approved', approvalDate: new Date() },
        });
        res.json(eco);
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve ECO' });
    }
});

ecosRouter.post('/:id/reject', requirePermission('ecos.reject'), async (req: AuthRequest, res: Response) => {
    try {
        const eco = await prisma.eCO.update({
            where: { id: String(req.params.id) },
            data: { status: 'rejected' },
        });
        res.json(eco);
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject ECO' });
    }
});

// Placeholder routers
const createPlaceholderRouter = () => {
    const router = Router();
    router.use(authenticate);
    router.get('/', (req, res) => res.json([]));
    router.get('/:id', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
    router.post('/', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
    router.put('/:id', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
    router.delete('/:id', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
    return router;
};

// Mount all routes
// AI Routes
const aiRouter = Router();
aiRouter.use(authenticate);

aiRouter.post('/risk-score', async (req: AuthRequest, res: Response) => {
    try {
        const { changeRequest } = req.body;
        // Fallback for direct params
        const title = changeRequest?.title || req.body.title;
        const description = changeRequest?.description || req.body.description;
        const changes = changeRequest?.changes || req.body.changes;

        if (!title || !description) return res.status(400).json({ error: 'Missing required fields' });

        const { generateJSON } = await import('./lib/gemini.js');
        const prompt = `
            Analyze this engineering change request for risk (0-100), predicted delay (days), and key risks.
            Title: ${title}
            Description: ${description}
            Changes: ${JSON.stringify(changes)}
            
            Return JSON format: { "riskScore": number, "predictedDelay": number, "riskFactors": string[] }
        `;

        interface RiskAnalysis {
            riskScore: number;
            predictedDelay: number;
            riskFactors?: string[];
            keyRisks?: string[];
        }

        // Default fallback values if AI fails
        const fallback: RiskAnalysis = {
            riskScore: 50,
            predictedDelay: 3,
            riskFactors: ['Unable to perform AI analysis - using estimated values', 'Manual review recommended']
        };

        const analysis = await generateJSON<RiskAnalysis>(prompt, fallback);
        res.json({ ...analysis, riskFactors: analysis.riskFactors || analysis.keyRisks });
    } catch (error) {
        console.error('AI risk score error:', error);
        res.status(500).json({ error: 'Failed to generate risk score' });
    }
});

aiRouter.post('/chat', async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message required' });

        const { generateContent } = await import('./lib/gemini.js');
        // In a real app, we would inject context from the database here
        try {
            const response = await generateContent(`You are an intelligent PLM assistant for FluxERP. Answer this user query: ${message}`);
            res.json({ response });
        } catch (aiError) {
            // Fallback response when AI is unavailable
            res.json({ 
                response: "I'm sorry, the AI service is temporarily unavailable. Please check your Gemini API key configuration or try again later. In the meantime, you can navigate through the app to find the information you need."
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'AI chat failed' });
    }
});

// User/Role Routes (Basic Implementation)
const usersRouter = Router();
usersRouter.use(authenticate);
usersRouter.get('/', requirePermission('users.view'), async (req, res) => {
    const users = await prisma.user.findMany({ include: { role: true } });
    const safeUsers = users.map(u => { const { password, ...rest } = u; return rest; });
    res.json(safeUsers);
});

const rolesRouter = Router();
rolesRouter.use(authenticate);
rolesRouter.get('/', async (req, res) => {
    const roles = await prisma.iAMRole.findMany();
    res.json(roles);
});

// Work Orders Routes
const workOrdersRouter = Router();
workOrdersRouter.use(authenticate);

workOrdersRouter.get('/', requirePermission('workorders.view'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, priority } = req.query;
        const where: any = {};
        if (status) where.status = String(status);
        if (priority) where.priority = String(priority);

        const workOrders = await prisma.workOrder.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true } },
                bom: { select: { id: true, name: true, version: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(workOrders);
    } catch (error) {
        console.error('Get work orders error:', error);
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
});

workOrdersRouter.get('/:id', requirePermission('workorders.view'), async (req: AuthRequest, res: Response) => {
    try {
        const workOrder = await prisma.workOrder.findUnique({
            where: { id: String(req.params.id) },
            include: {
                product: true,
                bom: true,
                defects: true,
            },
        });
        if (!workOrder) return res.status(404).json({ error: 'Work order not found' });
        res.json(workOrder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch work order' });
    }
});

workOrdersRouter.post('/', requirePermission('workorders.create'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, productId, bomId, quantity, priority, scheduledStart, scheduledEnd, progress } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({ error: 'Product ID and quantity are required' });
        }

        const workOrder = await prisma.workOrder.create({
            data: {
                name: name || null,
                productId,
                bomId: bomId || null,
                quantity: parseInt(quantity),
                status: 'planned',
                priority: priority || 'medium',
                progress: progress ? parseInt(progress) : 0,
                scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
                scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
            },
            include: {
                product: true,
                bom: true,
            },
        });

        res.status(201).json(workOrder);
    } catch (error) {
        console.error('Create work order error:', error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
});

workOrdersRouter.put('/:id', requirePermission('workorders.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { name, status, priority, quantity, progress, scheduledStart, scheduledEnd } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (quantity) updateData.quantity = parseInt(quantity);
        if (progress !== undefined) updateData.progress = parseInt(progress);
        if (scheduledStart) updateData.scheduledStart = new Date(scheduledStart);
        if (scheduledEnd) updateData.scheduledEnd = new Date(scheduledEnd);

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: updateData,
            include: {
                product: true,
                bom: true,
            },
        });

        res.json(workOrder);
    } catch (error) {
        console.error('Update work order error:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

// PATCH for partial updates (commonly used for status changes)
workOrdersRouter.patch('/:id', requirePermission('workorders.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { status, progress } = req.body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (progress !== undefined) updateData.progress = parseInt(progress);

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: updateData,
            include: {
                product: true,
                bom: true,
            },
        });

        res.json(workOrder);
    } catch (error) {
        console.error('Patch work order error:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

// Suppliers Routes
const suppliersRouter = Router();
suppliersRouter.use(authenticate);

suppliersRouter.get('/', requirePermission('products.view'), async (req: AuthRequest, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: {
                defects: {
                    select: { id: true, severity: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

suppliersRouter.get('/:id', requirePermission('products.view'), async (req: AuthRequest, res: Response) => {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id: String(req.params.id) },
            include: {
                defects: {
                    include: {
                        product: { select: { name: true, sku: true } },
                        workOrder: { select: { id: true, status: true } }
                    }
                }
            }
        });
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
        res.json(supplier);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
});

suppliersRouter.post('/', requirePermission('products.create'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, leadTimeDays, defectRate, onTimeDeliveryRate, contactPerson, email, phone, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const supplier = await prisma.supplier.create({
            data: {
                name,
                leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : 14,
                defectRate: defectRate ? parseFloat(defectRate) : 0,
                onTimeDeliveryRate: onTimeDeliveryRate ? parseFloat(onTimeDeliveryRate) : 0.95
            }
        });

        res.status(201).json(supplier);
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

suppliersRouter.put('/:id', requirePermission('products.edit'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        const { name, leadTimeDays, defectRate, onTimeDeliveryRate } = req.body;

        const existing = await prisma.supplier.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Supplier not found' });

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(leadTimeDays !== undefined && { leadTimeDays: parseInt(leadTimeDays) }),
                ...(defectRate !== undefined && { defectRate: parseFloat(defectRate) }),
                ...(onTimeDeliveryRate !== undefined && { onTimeDeliveryRate: parseFloat(onTimeDeliveryRate) })
            }
        });

        res.json(supplier);
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

suppliersRouter.delete('/:id', requirePermission('products.delete'), async (req: AuthRequest, res: Response) => {
    try {
        const id = String(req.params.id);
        await prisma.supplier.delete({ where: { id } });
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

// Analytics/Reports Routes
const analyticsRouter = Router();
analyticsRouter.use(authenticate);

analyticsRouter.get('/eco-stats', requirePermission('reports.view'), async (req: AuthRequest, res: Response) => {
    try {
        const ecos = await prisma.eCO.findMany();
        const stats = {
            total: ecos.length,
            byStatus: {
                draft: ecos.filter(e => e.status === 'draft').length,
                'in-review': ecos.filter(e => e.status === 'in-review').length,
                approved: ecos.filter(e => e.status === 'approved').length,
                rejected: ecos.filter(e => e.status === 'rejected').length,
                implemented: ecos.filter(e => e.status === 'implemented').length,
                done: ecos.filter(e => e.status === 'done').length,
            },
            byPriority: {
                low: ecos.filter(e => e.priority === 'low').length,
                normal: ecos.filter(e => e.priority === 'normal').length,
                high: ecos.filter(e => e.priority === 'high').length,
                critical: ecos.filter(e => e.priority === 'critical').length,
            },
            avgRiskScore: ecos.reduce((sum, e) => sum + (e.aiRiskScore || 0), 0) / (ecos.length || 1),
            avgPredictedDelay: ecos.reduce((sum, e) => sum + (e.aiPredictedDelay || 0), 0) / (ecos.length || 1),
        };
        res.json(stats);
    } catch (error) {
        console.error('ECO stats error:', error);
        res.status(500).json({ error: 'Failed to fetch ECO statistics' });
    }
});

analyticsRouter.get('/product-stats', requirePermission('reports.view'), async (req: AuthRequest, res: Response) => {
    try {
        const products = await prisma.product.findMany();
        const stats = {
            total: products.length,
            byStatus: {
                active: products.filter(p => p.status === 'active').length,
                draft: products.filter(p => p.status === 'draft').length,
                archived: products.filter(p => p.status === 'archived').length,
            },
            byCategory: products.reduce((acc: Record<string, number>, p) => {
                acc[p.category] = (acc[p.category] || 0) + 1;
                return acc;
            }, {}),
            totalValue: products.reduce((sum, p) => sum + (p.cost * p.quantity), 0),
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product statistics' });
    }
});

analyticsRouter.get('/workorder-stats', requirePermission('reports.view'), async (req: AuthRequest, res: Response) => {
    try {
        const workOrders = await prisma.workOrder.findMany();
        const stats = {
            total: workOrders.length,
            byStatus: {
                planned: workOrders.filter(wo => wo.status === 'planned').length,
                'in-progress': workOrders.filter(wo => wo.status === 'in-progress' || wo.status === 'in_progress').length,
                completed: workOrders.filter(wo => wo.status === 'completed').length,
                cancelled: workOrders.filter(wo => wo.status === 'cancelled').length,
            },
            totalQuantity: workOrders.reduce((sum, wo) => sum + wo.quantity, 0),
            totalScrap: workOrders.reduce((sum, wo) => sum + wo.scrapCount, 0),
            totalRework: workOrders.reduce((sum, wo) => sum + wo.reworkCount, 0),
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch work order statistics' });
    }
});

analyticsRouter.get('/supplier-stats', requirePermission('reports.view'), async (req: AuthRequest, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            include: { defects: true }
        });
        const stats = {
            total: suppliers.length,
            avgLeadTime: suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / (suppliers.length || 1),
            avgDefectRate: suppliers.reduce((sum, s) => sum + s.defectRate, 0) / (suppliers.length || 1),
            avgOnTimeDelivery: suppliers.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / (suppliers.length || 1),
            topPerformers: suppliers
                .sort((a, b) => b.onTimeDeliveryRate - a.onTimeDeliveryRate)
                .slice(0, 5)
                .map(s => ({ id: s.id, name: s.name, onTimeRate: s.onTimeDeliveryRate })),
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch supplier statistics' });
    }
});

analyticsRouter.get('/dashboard', requirePermission('reports.view'), async (req: AuthRequest, res: Response) => {
    try {
        const [products, boms, ecos, workOrders, suppliers] = await Promise.all([
            prisma.product.count(),
            prisma.bOM.count(),
            prisma.eCO.count(),
            prisma.workOrder.count(),
            prisma.supplier.count(),
        ]);

        const recentECOs = await prisma.eCO.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { name: true } },
                requestedBy: { select: { name: true } }
            }
        });

        const recentWorkOrders = await prisma.workOrder.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { name: true } }
            }
        });

        res.json({
            counts: { products, boms, ecos, workOrders, suppliers },
            recentECOs,
            recentWorkOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Mount all routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/boms', bomsRouter);
app.use('/api/ecos', ecosRouter);
app.use('/api/workorders', workOrdersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', analyticsRouter);

app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 FluxERP Backend Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app;
