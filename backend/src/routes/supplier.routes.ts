import { Router } from 'express';
import { supplierService } from '../services/index.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { 
    createSupplierSchema, 
    updateSupplierSchema, 
    supplierQuerySchema,
    supplierDefectSchema 
} from '../validators/supplier.validator.js';
import { uuidSchema, paginationSchema } from '../validators/common.validator.js';
import { AuthRequest } from '../types/index.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Supplier Routes
// ============================================================================

/**
 * GET /api/suppliers
 * Get all suppliers with pagination and filtering
 */
router.get('/',
    requirePermission('suppliers.read'),
    validateQuery(supplierQuerySchema),
    catchAsync(async (req, res) => {
        const result = await supplierService.findAll(req.query as any);
        res.json(successResponse(result));
    })
);

/**
 * GET /api/suppliers/stats
 * Get supplier statistics
 */
router.get('/stats',
    requirePermission('suppliers.read'),
    catchAsync(async (req, res) => {
        const stats = await supplierService.getStats();
        res.json(successResponse(stats));
    })
);

/**
 * GET /api/suppliers/:id
 * Get supplier by ID
 */
router.get('/:id',
    requirePermission('suppliers.read'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const supplier = await supplierService.findById(req.params.id);
        res.json(successResponse(supplier));
    })
);

/**
 * POST /api/suppliers
 * Create a new supplier
 */
router.post('/',
    requirePermission('suppliers.write'),
    validateBody(createSupplierSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const supplier = await supplierService.create(req.body, authReq.user!.userId);
        res.status(201).json(successResponse(supplier, 'Supplier created successfully'));
    })
);

/**
 * PUT /api/suppliers/:id
 * Update a supplier
 */
router.put('/:id',
    requirePermission('suppliers.write'),
    validateParams(uuidSchema),
    validateBody(updateSupplierSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const supplier = await supplierService.update(req.params.id, req.body, authReq.user!.userId);
        res.json(successResponse(supplier, 'Supplier updated successfully'));
    })
);

/**
 * DELETE /api/suppliers/:id
 * Delete (deactivate) a supplier
 */
router.delete('/:id',
    requirePermission('suppliers.delete'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await supplierService.delete(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'Supplier deactivated successfully'));
    })
);

// ============================================================================
// Supplier Defects Routes
// ============================================================================

/**
 * GET /api/suppliers/:id/defects
 * Get defects for a supplier
 */
router.get('/:id/defects',
    requirePermission('suppliers.read'),
    validateParams(uuidSchema),
    validateQuery(paginationSchema),
    catchAsync(async (req, res) => {
        const result = await supplierService.getSupplierDefects(
            req.params.id,
            req.query as any
        );
        res.json(successResponse(result));
    })
);

/**
 * POST /api/suppliers/:id/defects
 * Record a defect for a supplier
 */
router.post('/:id/defects',
    requirePermission('suppliers.write'),
    validateParams(uuidSchema),
    validateBody(supplierDefectSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const defect = await supplierService.recordDefect(
            { ...req.body, supplierId: req.params.id },
            authReq.user!.userId
        );
        res.status(201).json(successResponse(defect, 'Defect recorded successfully'));
    })
);

/**
 * GET /api/suppliers/:id/defects/stats
 * Get defect statistics for a supplier
 */
router.get('/:id/defects/stats',
    requirePermission('suppliers.read'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const stats = await supplierService.getSupplierDefectStats(req.params.id);
        res.json(successResponse(stats));
    })
);

export default router;
