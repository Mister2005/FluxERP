import { z } from 'zod';
import { requiredString, priorityEnum } from './common.validator.js';

// ============================================================================
// AI Request Validators
// ============================================================================

/**
 * Risk analysis request validation
 */
export const riskAnalysisRequestSchema = z.object({
    changeRequest: z.object({
        title: requiredString(3, 200),
        description: requiredString(10, 5000),
        reason: z.string().max(2000).optional(),
        priority: priorityEnum.optional(),
        changes: z.array(z.object({
            field: z.string(),
            oldValue: z.string(),
            newValue: z.string(),
        })).optional(),
    }).optional(),
    // Also accept flat structure
    title: requiredString(3, 200).optional(),
    description: requiredString(10, 5000).optional(),
    reason: z.string().max(2000).optional(),
    priority: priorityEnum.optional(),
    changes: z.array(z.object({
        field: z.string(),
        oldValue: z.string(),
        newValue: z.string(),
    })).optional(),
}).refine(
    (data) => {
        // Either changeRequest or direct fields must be provided
        return data.changeRequest || (data.title && data.description);
    },
    {
        message: 'Either changeRequest object or title and description fields are required',
    }
);

/**
 * AI chat request validation
 */
export const aiChatRequestSchema = z.object({
    message: requiredString(1, 2000),
    context: z.object({
        entityType: z.enum(['product', 'eco', 'bom', 'workorder', 'general']).optional(),
        entityId: z.string().uuid().optional(),
    }).optional(),
});

// Alias for routes that use chatRequestSchema
export const chatRequestSchema = aiChatRequestSchema;

/**
 * AI summary request validation
 */
export const aiSummaryRequestSchema = z.object({
    entityType: z.enum(['product', 'eco', 'bom', 'workorder']),
    entityId: z.string().uuid(),
    summaryType: z.enum(['brief', 'detailed', 'comparison']).default('brief'),
});

/**
 * BOM optimization request validation
 */
export const bomOptimizationSchema = z.object({
    bomId: z.string().uuid(),
    optimizationGoals: z.array(z.enum(['cost', 'quality', 'leadTime', 'sustainability'])).optional(),
    constraints: z.object({
        maxCost: z.number().positive().optional(),
        preferredSuppliers: z.array(z.string()).optional(),
        excludedComponents: z.array(z.string()).optional(),
    }).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RiskAnalysisRequest = z.infer<typeof riskAnalysisRequestSchema>;
export type AIChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AISummaryRequest = z.infer<typeof aiSummaryRequestSchema>;
