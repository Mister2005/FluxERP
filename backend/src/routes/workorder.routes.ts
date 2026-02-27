import { Router } from 'express';
import { workOrderService } from '../services/index.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { 
    createWorkOrderSchema, 
    updateWorkOrderSchema, 
    workOrderQuerySchema,
    workOrderStatusUpdateSchema 
} from '../validators/workorder.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { AuthRequest } from '../types/index.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Work Order Routes
// ============================================================================

/**
 * GET /api/workorders
 * Get all work orders with pagination and filtering
 */
router.get('/',
    requirePermission('workorders.read'),
    validateQuery(workOrderQuerySchema),
    catchAsync(async (req, res) => {
        const result = await workOrderService.findAll(req.query as any);
        res.json(successResponse(result));
    })
);

/**
 * GET /api/workorders/stats
 * Get work order statistics
 */
router.get('/stats',
    requirePermission('workorders.read'),
    catchAsync(async (req, res) => {
        const stats = await workOrderService.getStats();
        res.json(successResponse(stats));
    })
);

/**
 * GET /api/workorders/upcoming
 * Get upcoming work orders (next 7 days by default)
 */
router.get('/upcoming',
    requirePermission('workorders.read'),
    catchAsync(async (req, res) => {
        const days = parseInt(req.query.days as string) || 7;
        const workOrders = await workOrderService.getUpcoming(days);
        res.json(successResponse(workOrders));
    })
);

/**
 * GET /api/workorders/overdue
 * Get overdue work orders
 */
router.get('/overdue',
    requirePermission('workorders.read'),
    catchAsync(async (req, res) => {
        const workOrders = await workOrderService.getOverdue();
        res.json(successResponse(workOrders));
    })
);

/**
 * GET /api/workorders/:id
 * Get work order by ID
 */
router.get('/:id',
    requirePermission('workorders.read'),
    validateParams(idParamSchema),
    catchAsync(async (req, res) => {
        const workOrder = await workOrderService.findById(req.params.id);
        res.json(successResponse(workOrder));
    })
);

/**
 * POST /api/workorders
 * Create a new work order
 */
router.post('/',
    requirePermission('workorders.write'),
    validateBody(createWorkOrderSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const workOrder = await workOrderService.create(req.body, authReq.user!.userId);
        res.status(201).json(successResponse(workOrder, 'Work order created successfully'));
    })
);

/**
 * PUT /api/workorders/:id
 * Update a work order
 */
router.put('/:id',
    requirePermission('workorders.write'),
    validateParams(idParamSchema),
    validateBody(updateWorkOrderSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const workOrder = await workOrderService.update(req.params.id, req.body, authReq.user!.userId);
        res.json(successResponse(workOrder, 'Work order updated successfully'));
    })
);

/**
 * DELETE /api/workorders/:id
 * Delete a work order (Planned or Cancelled only)
 */
router.delete('/:id',
    requirePermission('workorders.delete'),
    validateParams(idParamSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await workOrderService.delete(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'Work order deleted successfully'));
    })
);

// ============================================================================
// Work Order Status Management
// ============================================================================

/**
 * POST /api/workorders/:id/status
 * Update work order status
 */
router.post('/:id/status',
    requirePermission('workorders.write'),
    validateParams(idParamSchema),
    validateBody(workOrderStatusUpdateSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const { status, comments } = req.body;
        const workOrder = await workOrderService.updateStatus(
            req.params.id,
            status,
            authReq.user!.userId,
            comments
        );
        res.json(successResponse(workOrder, `Work order status updated to ${status}`));
    })
);

export default router;
