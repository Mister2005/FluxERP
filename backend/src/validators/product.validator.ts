import { z } from 'zod';
import { 
    requiredString, 
    uuidSchema, 
    positiveNumber, 
    nonNegativeNumber, 
    skuSchema,
    productStatusEnum,
    paginationSchema,
    jsonObjectSchema
} from './common.validator.js';

// ============================================================================
// Product Validators
// ============================================================================

/**
 * Create product validation
 */
export const createProductSchema = z.object({
    name: requiredString(2, 200),
    sku: skuSchema,
    description: requiredString(3, 2000),
    category: requiredString(2, 100),
    status: productStatusEnum.default('active'),
    version: z.string().max(50).optional(),
    unitOfMeasure: z.string().max(20).optional(),
    cost: nonNegativeNumber,
    quantity: z.coerce.number().int().min(0).default(0),
    supplier: z.string().max(200).optional(),
    attributes: jsonObjectSchema,
});

/**
 * Update product validation (all fields optional)
 */
export const updateProductSchema = createProductSchema.partial();

/**
 * Product query parameters
 */
export const productQuerySchema = paginationSchema.extend({
    category: z.string().optional(),
    status: productStatusEnum.optional(),
    search: z.string().max(200).optional(),
    minCost: z.coerce.number().optional(),
    maxCost: z.coerce.number().optional(),
});

/**
 * Product ID parameter
 */
export const productIdParamSchema = z.object({
    id: uuidSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
