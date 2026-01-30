import { z } from 'zod';
import { 
    requiredString, 
    uuidSchema, 
    positiveNumber,
    nonNegativeNumber,
    percentageSchema,
    paginationSchema
} from './common.validator.js';

// ============================================================================
// Supplier Validators
// ============================================================================

/**
 * Create supplier validation
 */
export const createSupplierSchema = z.object({
    name: requiredString(2, 200),
    leadTimeDays: z.coerce.number().int().min(0, 'Lead time cannot be negative'),
    defectRate: percentageSchema,
    onTimeDeliveryRate: percentageSchema,
});

/**
 * Update supplier validation
 */
export const updateSupplierSchema = createSupplierSchema.partial();

/**
 * Supplier query parameters
 */
export const supplierQuerySchema = paginationSchema.extend({
    search: z.string().max(200).optional(),
    minDefectRate: z.coerce.number().min(0).max(100).optional(),
    maxDefectRate: z.coerce.number().min(0).max(100).optional(),
    minOnTimeRate: z.coerce.number().min(0).max(100).optional(),
});

/**
 * Supplier ID parameter
 */
export const supplierIdParamSchema = z.object({
    id: uuidSchema,
});

// ============================================================================
// Defect Validators
// ============================================================================

/**
 * Defect severity enum
 */
export const defectSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Defect type enum
 */
export const defectTypeEnum = z.enum(['manufacturing', 'material', 'design', 'other']);

/**
 * Create defect validation
 */
export const createDefectSchema = z.object({
    productId: uuidSchema.optional(),
    supplierId: uuidSchema.optional(),
    workOrderId: uuidSchema.optional(),
    type: defectTypeEnum,
    severity: defectSeverityEnum,
    description: requiredString(10, 2000),
    discoveredAt: z.coerce.date().default(() => new Date()),
});

/**
 * Defect query parameters
 */
export const defectQuerySchema = paginationSchema.extend({
    productId: uuidSchema.optional(),
    supplierId: uuidSchema.optional(),
    workOrderId: uuidSchema.optional(),
    type: defectTypeEnum.optional(),
    severity: defectSeverityEnum.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

// Alias for routes
export const supplierDefectSchema = createDefectSchema;

// ============================================================================
// Type Exports
// ============================================================================

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQuery = z.infer<typeof supplierQuerySchema>;
export type CreateDefectInput = z.infer<typeof createDefectSchema>;
export type DefectQuery = z.infer<typeof defectQuerySchema>;
