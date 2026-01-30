import { z } from 'zod';
import { 
    requiredString, 
    uuidSchema, 
    priorityEnum,
    ecoStatusEnum,
    paginationSchema,
    optionalString
} from './common.validator.js';

// ============================================================================
// ECO (Engineering Change Order) Validators
// ============================================================================

/**
 * Proposed change item schema
 */
export const proposedChangeSchema = z.object({
    field: requiredString(1, 100),
    oldValue: z.string().max(500).default(''),
    newValue: z.string().max(500).default(''),
});

/**
 * Impact analysis schema (from AI)
 */
export const impactAnalysisSchema = z.object({
    riskScore: z.number().min(0).max(100).optional(),
    predictedDelay: z.number().int().min(0).optional(),
    riskFactors: z.array(z.string()).optional(),
}).optional();

/**
 * Create ECO validation
 */
export const createECOSchema = z.object({
    title: requiredString(3, 200),
    description: requiredString(10, 5000),
    reason: requiredString(3, 2000).optional(),
    type: z.enum(['standard', 'emergency', 'deviation']).default('standard'),
    priority: priorityEnum.default('medium'),
    productId: uuidSchema.optional(),
    bomId: uuidSchema.optional(),
    proposedChanges: z.array(proposedChangeSchema).optional(),
    impactAnalysis: impactAnalysisSchema,
});

/**
 * Update ECO validation
 */
export const updateECOSchema = z.object({
    title: requiredString(3, 200).optional(),
    description: requiredString(10, 5000).optional(),
    reason: requiredString(3, 2000).optional(),
    type: z.enum(['standard', 'emergency', 'deviation']).optional(),
    priority: priorityEnum.optional(),
    status: ecoStatusEnum.optional(),
    productId: uuidSchema.optional().nullable(),
    bomId: uuidSchema.optional().nullable(),
    proposedChanges: z.array(proposedChangeSchema).optional(),
    impactAnalysis: impactAnalysisSchema,
});

/**
 * ECO status transition validation
 */
export const updateECOStatusSchema = z.object({
    status: ecoStatusEnum,
    comment: z.string().max(1000).optional(),
});

/**
 * ECO comment validation
 */
export const createECOCommentSchema = z.object({
    content: requiredString(1, 2000),
});

/**
 * ECO query parameters
 */
export const ecoQuerySchema = paginationSchema.extend({
    status: ecoStatusEnum.optional(),
    priority: priorityEnum.optional(),
    productId: uuidSchema.optional(),
    type: z.enum(['standard', 'emergency', 'deviation']).optional(),
    search: z.string().max(200).optional(),
    showAll: z.coerce.boolean().default(false), // Include non-latest versions
});

/**
 * ECO ID parameter
 */
export const ecoIdParamSchema = z.object({
    id: uuidSchema,
});

// Aliases for routes
export const ecoStatusUpdateSchema = updateECOStatusSchema;
export const ecoCommentSchema = createECOCommentSchema;

/**
 * ECO approval schema
 */
export const ecoApprovalSchema = z.object({
    approved: z.boolean(),
    comment: z.string().max(2000).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateECOInput = z.infer<typeof createECOSchema>;
export type UpdateECOInput = z.infer<typeof updateECOSchema>;
export type UpdateECOStatusInput = z.infer<typeof updateECOStatusSchema>;
export type CreateECOCommentInput = z.infer<typeof createECOCommentSchema>;
export type ECOQuery = z.infer<typeof ecoQuerySchema>;
export type ProposedChange = z.infer<typeof proposedChangeSchema>;
export type ImpactAnalysis = z.infer<typeof impactAnalysisSchema>;
