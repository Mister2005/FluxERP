import { Router } from 'express';
import { productService } from '../services/index.js';
import { generalLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../validators/product.validator.js';
import { uuidSchema } from '../validators/common.validator.js';
import { AuthRequest } from '../types/index.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Product Routes
// ============================================================================

/**
 * GET /api/products
 * Get all products with pagination and filtering
 */
router.get('/',
    requirePermission('products.read'),
    validateQuery(productQuerySchema),
    catchAsync(async (req, res) => {
        const result = await productService.findAll(req.query as any);
        res.json(successResponse(result));
    })
);

/**
 * GET /api/products/categories
 * Get list of unique product categories
 */
router.get('/categories',
    requirePermission('products.read'),
    catchAsync(async (req, res) => {
        const categories = await productService.getCategories();
        res.json(successResponse(categories));
    })
);

/**
 * GET /api/products/stats
 * Get product statistics
 */
router.get('/stats',
    requirePermission('products.read'),
    catchAsync(async (req, res) => {
        const stats = await productService.getStats();
        res.json(successResponse(stats));
    })
);

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id',
    requirePermission('products.read'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const product = await productService.findById(req.params.id);
        res.json(successResponse(product));
    })
);

/**
 * POST /api/products
 * Create a new product
 */
router.post('/',
    requirePermission('products.write'),
    validateBody(createProductSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const product = await productService.create(req.body, authReq.user!.userId);
        res.status(201).json(successResponse(product, 'Product created successfully'));
    })
);

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put('/:id',
    requirePermission('products.write'),
    validateParams(uuidSchema),
    validateBody(updateProductSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const product = await productService.update(req.params.id, req.body, authReq.user!.userId);
        res.json(successResponse(product, 'Product updated successfully'));
    })
);

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id',
    requirePermission('products.delete'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await productService.delete(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'Product deleted successfully'));
    })
);

/**
 * GET /api/products/sku/:sku
 * Get product by SKU
 */
router.get('/sku/:sku',
    requirePermission('products.read'),
    catchAsync(async (req, res) => {
        const product = await productService.findBySku(req.params.sku);
        res.json(successResponse(product));
    })
);

export default router;
