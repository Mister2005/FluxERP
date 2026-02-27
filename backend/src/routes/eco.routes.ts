import { Router } from 'express';
import { ecoService } from '../services/index.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission, requireAnyPermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { 
    createECOSchema, 
    updateECOSchema, 
    ecoQuerySchema,
    ecoStatusUpdateSchema,
    ecoCommentSchema,
    ecoApprovalSchema 
} from '../validators/eco.validator.js';
import { idParamSchema } from '../validators/common.validator.js';
import { AuthRequest } from '../types/index.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// ECO Routes
// ============================================================================

/**
 * GET /api/ecos
 * Get all ECOs with pagination and filtering
 */
router.get('/',
    requirePermission('ecos.read'),
    validateQuery(ecoQuerySchema),
    catchAsync(async (req, res) => {
        const result = await ecoService.findAll(req.query as any);
        res.json(successResponse(result));
    })
);

/**
 * GET /api/ecos/stats
 * Get ECO statistics
 */
router.get('/stats',
    requirePermission('ecos.read'),
    catchAsync(async (req, res) => {
        const stats = await ecoService.getStats();
        res.json(successResponse(stats));
    })
);

/**
 * GET /api/ecos/:id
 * Get ECO by ID
 */
router.get('/:id',
    requirePermission('ecos.read'),
    validateParams(idParamSchema),
    catchAsync(async (req, res) => {
        const eco = await ecoService.findById(req.params.id);
        res.json(successResponse(eco));
    })
);

/**
 * GET /api/ecos/:ecoNumber/versions
 * Get ECO version history
 */
router.get('/:ecoNumber/versions',
    requirePermission('ecos.read'),
    catchAsync(async (req, res) => {
        const versions = await ecoService.getVersionHistory(req.params.ecoNumber);
        res.json(successResponse(versions));
    })
);

/**
 * POST /api/ecos
 * Create a new ECO
 */
router.post('/',
    requirePermission('ecos.write'),
    validateBody(createECOSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const eco = await ecoService.create(req.body, authReq.user!.userId);
        res.status(201).json(successResponse(eco, 'ECO created successfully'));
    })
);

/**
 * PUT /api/ecos/:id
 * Update an ECO
 */
router.put('/:id',
    requirePermission('ecos.write'),
    validateParams(idParamSchema),
    validateBody(updateECOSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const eco = await ecoService.update(req.params.id, req.body, authReq.user!.userId);
        res.json(successResponse(eco, 'ECO updated successfully'));
    })
);

/**
 * DELETE /api/ecos/:id
 * Delete an ECO (Draft only)
 */
router.delete('/:id',
    requirePermission('ecos.delete'),
    validateParams(idParamSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await ecoService.delete(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'ECO deleted successfully'));
    })
);

// ============================================================================
// ECO Status Management
// ============================================================================

/**
 * POST /api/ecos/:id/status
 * Update ECO status (with AI risk analysis on submit)
 */
router.post('/:id/status',
    requireAnyPermission(['ecos.write', 'ecos.approve']),
    aiLimiter,  // Rate limit AI analysis
    validateParams(idParamSchema),
    validateBody(ecoStatusUpdateSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const { status, comments } = req.body;
        const eco = await ecoService.updateStatus(
            req.params.id, 
            status, 
            authReq.user!.userId,
            comments
        );
        res.json(successResponse(eco, `ECO status updated to ${status}`));
    })
);

// ============================================================================
// ECO Approvals
// ============================================================================

/**
 * POST /api/ecos/:id/approval
 * Add approval decision to ECO
 */
router.post('/:id/approval',
    requirePermission('ecos.approve'),
    validateParams(idParamSchema),
    validateBody(ecoApprovalSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const { approved, comments } = req.body;
        const approval = await ecoService.addApproval(
            req.params.id,
            authReq.user!.userId,
            approved,
            comments
        );
        res.status(201).json(successResponse(approval, 'Approval recorded'));
    })
);

// ============================================================================
// ECO Comments
// ============================================================================

/**
 * POST /api/ecos/:id/comments
 * Add comment to ECO
 */
router.post('/:id/comments',
    requirePermission('ecos.read'),  // Anyone who can read can comment
    validateParams(idParamSchema),
    validateBody(ecoCommentSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const comment = await ecoService.addComment(
            req.params.id,
            authReq.user!.userId,
            req.body.content
        );
        res.status(201).json(successResponse(comment, 'Comment added'));
    })
);

export default router;
