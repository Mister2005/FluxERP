// ============================================================================
// Routes Index
// Centralizes all route exports for clean server.ts integration
// ============================================================================

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import ecoRoutes from './eco.routes.js';
import bomRoutes from './bom.routes.js';
import workorderRoutes from './workorder.routes.js';
import supplierRoutes from './supplier.routes.js';
import aiRoutes from './ai.routes.js';
import reportRoutes from './report.routes.js';
import roleRoutes from './role.routes.js';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/ecos', ecoRoutes);
router.use('/boms', bomRoutes);
router.use('/workorders', workorderRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/ai', aiRoutes);
router.use('/reports', reportRoutes);
router.use('/roles', roleRoutes);

export default router;

// Also export individual routers for granular use
export {
    authRoutes,
    productRoutes,
    ecoRoutes,
    bomRoutes,
    workorderRoutes,
    supplierRoutes,
    aiRoutes,
    reportRoutes,
    roleRoutes,
};
