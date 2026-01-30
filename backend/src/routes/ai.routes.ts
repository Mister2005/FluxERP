import { Router } from 'express';
import { aiService } from '../services/index.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { chatRequestSchema, riskAnalysisRequestSchema, bomOptimizationSchema } from '../validators/ai.validator.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All AI routes require authentication and rate limiting
router.use(authenticate);
router.use(aiLimiter);

// ============================================================================
// AI Routes
// ============================================================================

/**
 * GET /api/ai/status
 * Get AI service status
 */
router.get('/status',
    catchAsync(async (req, res) => {
        const info = aiService.getModelInfo();
        res.json(successResponse(info));
    })
);

/**
 * POST /api/ai/chat
 * Chat with AI assistant
 */
router.post('/chat',
    requirePermission('ai.chat'),
    validateBody(chatRequestSchema),
    catchAsync(async (req, res) => {
        const { messages, context } = req.body;
        const response = await aiService.chat(messages, context);
        res.json(successResponse({ response }));
    })
);

/**
 * POST /api/ai/analyze-risk
 * Analyze ECO risk (used internally, but exposed for testing)
 */
router.post('/analyze-risk',
    requirePermission('ai.analyze'),
    validateBody(riskAnalysisRequestSchema),
    catchAsync(async (req, res) => {
        const analysis = await aiService.analyzeECORisk(req.body);
        res.json(successResponse(analysis));
    })
);

/**
 * POST /api/ai/bom-optimization
 * Get BOM optimization suggestions
 */
router.post('/bom-optimization',
    requirePermission('ai.analyze'),
    validateBody(bomOptimizationSchema),
    catchAsync(async (req, res) => {
        const suggestions = await aiService.suggestBOMOptimizations(req.body);
        res.json(successResponse(suggestions));
    })
);

export default router;
