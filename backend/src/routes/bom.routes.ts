import { Router } from 'express';
import { z } from 'zod';
import { bomService } from '../services/index.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { createBOMSchema, updateBOMSchema, bomQuerySchema, cloneBOMSchema } from '../validators/bom.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { AuthRequest } from '../types/index.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// BOM Routes
// ============================================================================

/**
 * GET /api/boms
 * Get all BOMs with pagination and filtering
 */
router.get('/',
    requirePermission('boms.read'),
    validateQuery(bomQuerySchema),
    catchAsync(async (req, res) => {
        const result = await bomService.findAll(req.query as any);
        res.json(successResponse(result));
    })
);

/**
 * GET /api/boms/stats
 * Get BOM statistics
 */
router.get('/stats',
    requirePermission('boms.read'),
    catchAsync(async (req, res) => {
        const stats = await bomService.getStats();
        res.json(successResponse(stats));
    })
);

/**
 * GET /api/boms/:id
 * Get BOM by ID
 */
router.get('/:id',
    requirePermission('boms.read'),
    validateParams(idParamSchema),
    catchAsync(async (req, res) => {
        const bom = await bomService.findById(req.params.id);
        res.json(successResponse(bom));
    })
);

/**
 * GET /api/boms/product/:productId
 * Get all BOMs for a product
 */
router.get('/product/:productId',
    requirePermission('boms.read'),
    validateParams(z.object({ productId: z.string().min(1, 'Product ID is required') })),
    catchAsync(async (req, res) => {
        const { status } = req.query;
        const boms = await bomService.findByProductId(
            req.params.productId,
            { status: status as string }
        );
        res.json(successResponse(boms));
    })
);

/**
 * GET /api/boms/product/:productId/active
 * Get active BOM for a product
 */
router.get('/product/:productId/active',
    requirePermission('boms.read'),
    catchAsync(async (req, res) => {
        const bom = await bomService.findActiveByProductId(req.params.productId);
        res.json(successResponse(bom));
    })
);

/**
 * POST /api/boms
 * Create a new BOM
 */
router.post('/',
    requirePermission('boms.write'),
    validateBody(createBOMSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const bom = await bomService.create(req.body, authReq.user!.userId);
        res.status(201).json(successResponse(bom, 'BOM created successfully'));
    })
);

/**
 * PUT /api/boms/:id
 * Update a BOM
 */
router.put('/:id',
    requirePermission('boms.write'),
    validateParams(idParamSchema),
    validateBody(updateBOMSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const bom = await bomService.update(req.params.id, req.body, authReq.user!.userId);
        res.json(successResponse(bom, 'BOM updated successfully'));
    })
);

/**
 * DELETE /api/boms/:id
 * Delete a BOM (Draft only)
 */
router.delete('/:id',
    requirePermission('boms.delete'),
    validateParams(idParamSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await bomService.delete(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'BOM deleted successfully'));
    })
);

/**
 * POST /api/boms/:id/clone
 * Clone a BOM with new revision
 */
router.post('/:id/clone',
    requirePermission('boms.write'),
    validateParams(idParamSchema),
    validateBody(cloneBOMSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const bom = await bomService.clone(
            req.params.id,
            req.body.newVersion,
            authReq.user!.userId
        );
        res.status(201).json(successResponse(bom, 'BOM cloned successfully'));
    })
);

export default router;
