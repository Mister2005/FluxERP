import { z } from 'zod';
import { 
    requiredString, 
    uuidSchema, 
    positiveNumber,
    nonNegativeNumber,
    priorityEnum,
    workOrderStatusEnum,
    paginationSchema,
    percentageSchema
} from './common.validator.js';

// ============================================================================
// Work Order Validators
// ============================================================================

/**
 * Create work order validation
 */
export const createWorkOrderSchema = z.object({
    productId: uuidSchema,
    bomId: uuidSchema.optional(),
    name: requiredString(2, 200).optional(),
    quantity: z.coerce.number().int().positive('Quantity must be positive'),
    priority: priorityEnum.default('medium'),
    scheduledStart: z.coerce.date().optional(),
    scheduledEnd: z.coerce.date().optional(),
}).refine(
    (data) => {
        if (data.scheduledStart && data.scheduledEnd) {
            return data.scheduledStart <= data.scheduledEnd;
        }
        return true;
    },
    {
        message: 'Scheduled start must be before or equal to scheduled end',
        path: ['scheduledEnd'],
    }
);

/**
 * Update work order validation
 */
export const updateWorkOrderSchema = z.object({
    name: requiredString(2, 200).optional(),
    quantity: z.coerce.number().int().positive().optional(),
    priority: priorityEnum.optional(),
    status: workOrderStatusEnum.optional(),
    scheduledStart: z.coerce.date().optional().nullable(),
    scheduledEnd: z.coerce.date().optional().nullable(),
    plannedStart: z.coerce.date().optional().nullable(),
    plannedEnd: z.coerce.date().optional().nullable(),
    actualStart: z.coerce.date().optional().nullable(),
    actualEnd: z.coerce.date().optional().nullable(),
    progress: percentageSchema.optional(),
    scrapCount: nonNegativeNumber.optional(),
    reworkCount: nonNegativeNumber.optional(),
});

/**
 * Work order status transition
 */
export const updateWorkOrderStatusSchema = z.object({
    status: workOrderStatusEnum,
    progress: percentageSchema.optional(),
    actualStart: z.coerce.date().optional(),
    actualEnd: z.coerce.date().optional(),
}).refine(
    (data) => {
        // If status is 'in-progress', actualStart should be set
        if (data.status === 'in-progress' && !data.actualStart) {
            return true; // Allow - will set automatically
        }
        // If status is 'completed', actualEnd should be set
        if (data.status === 'completed' && !data.actualEnd) {
            return true; // Allow - will set automatically
        }
        return true;
    }
);

/**
 * Work order query parameters
 */
export const workOrderQuerySchema = paginationSchema.extend({
    productId: uuidSchema.optional(),
    status: workOrderStatusEnum.optional(),
    priority: priorityEnum.optional(),
    search: z.string().max(200).optional(),
    scheduledStartFrom: z.coerce.date().optional(),
    scheduledStartTo: z.coerce.date().optional(),
});

/**
 * Work order ID parameter
 */
export const workOrderIdParamSchema = z.object({
    id: uuidSchema,
});

// Alias for routes
export const workOrderStatusUpdateSchema = updateWorkOrderStatusSchema;

// ============================================================================
// Type Exports
// ============================================================================

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type UpdateWorkOrderStatusInput = z.infer<typeof updateWorkOrderStatusSchema>;
export type WorkOrderQuery = z.infer<typeof workOrderQuerySchema>;
