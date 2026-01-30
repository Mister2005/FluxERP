import { z } from 'zod';
import { 
    requiredString, 
    uuidSchema, 
    positiveNumber,
    nonNegativeNumber,
    bomStatusEnum,
    paginationSchema
} from './common.validator.js';

// ============================================================================
// BOM (Bill of Materials) Validators
// ============================================================================

/**
 * BOM component schema
 */
export const bomComponentSchema = z.object({
    productId: uuidSchema,
    quantity: positiveNumber,
    unitCost: nonNegativeNumber,
});

/**
 * BOM operation schema
 */
export const bomOperationSchema = z.object({
    name: requiredString(2, 100),
    workCenter: requiredString(2, 100),
    duration: z.coerce.number().int().positive('Duration must be positive'),
    cost: nonNegativeNumber,
    sequence: z.coerce.number().int().min(1),
});

/**
 * Create BOM validation
 */
export const createBOMSchema = z.object({
    name: requiredString(2, 200),
    productId: uuidSchema,
    version: z.string().max(20).default('1.0'),
    status: bomStatusEnum.default('draft'),
    components: z.array(bomComponentSchema).min(1, 'At least one component is required'),
    operations: z.array(bomOperationSchema).optional(),
});

/**
 * Update BOM validation
 */
export const updateBOMSchema = z.object({
    name: requiredString(2, 200).optional(),
    status: bomStatusEnum.optional(),
    components: z.array(bomComponentSchema).optional(),
    operations: z.array(bomOperationSchema).optional(),
});

/**
 * Add component to BOM
 */
export const addComponentSchema = bomComponentSchema;

/**
 * Update component in BOM
 */
export const updateComponentSchema = z.object({
    quantity: positiveNumber.optional(),
    unitCost: nonNegativeNumber.optional(),
});

/**
 * BOM query parameters
 */
export const bomQuerySchema = paginationSchema.extend({
    productId: uuidSchema.optional(),
    status: bomStatusEnum.optional(),
    search: z.string().max(200).optional(),
    isLatest: z.coerce.boolean().default(true),
});

/**
 * BOM ID parameter
 */
export const bomIdParamSchema = z.object({
    id: uuidSchema,
});

/**
 * Component ID parameter
 */
export const componentIdParamSchema = z.object({
    id: uuidSchema,
    componentId: uuidSchema,
});

/**
 * Clone BOM schema
 */
export const cloneBOMSchema = z.object({
    newVersion: z.string().max(20).optional(),
    name: requiredString(2, 200).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateBOMInput = z.infer<typeof createBOMSchema>;
export type UpdateBOMInput = z.infer<typeof updateBOMSchema>;
export type BOMComponent = z.infer<typeof bomComponentSchema>;
export type BOMOperation = z.infer<typeof bomOperationSchema>;
export type BOMQuery = z.infer<typeof bomQuerySchema>;
