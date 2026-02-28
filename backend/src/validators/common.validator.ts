import { z } from 'zod';

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Date range filter
 */
export const dateRangeSchema = z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
}).refine(
    (data) => {
        if (data.startDate && data.endDate) {
            return data.startDate <= data.endDate;
        }
        return true;
    },
    { message: 'Start date must be before or equal to end date' }
);

/**
 * Search query
 */
export const searchSchema = z.object({
    q: z.string().min(1).max(200).optional(),
    search: z.string().min(1).max(200).optional(),
});

/**
 * ID parameter (accepts any non-empty string for route params)
 */
export const idParamSchema = z.object({
    id: z.string().min(1, 'ID is required'),
});

// ============================================================================
// Enums
// ============================================================================

export const priorityEnum = z.enum(['low', 'medium', 'normal', 'high', 'critical']);
export const ecoStatusEnum = z.enum(['draft', 'submitted', 'under_review', 'approved', 'implementing', 'completed', 'rejected']);
export const workOrderStatusEnum = z.enum(['draft', 'planned', 'scheduled', 'in-progress', 'completed', 'cancelled']);
export const productStatusEnum = z.enum(['active', 'inactive', 'discontinued', 'draft']);
export const bomStatusEnum = z.enum(['draft', 'active', 'obsolete']);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create optional string that transforms empty string to undefined
 */
export const optionalString = z.string().transform(val => val === '' ? undefined : val).optional();

/**
 * Create required non-empty string
 */
export const requiredString = (minLength: number = 1, maxLength: number = 500) => 
    z.string()
        .min(minLength, `Must be at least ${minLength} character(s)`)
        .max(maxLength, `Must be at most ${maxLength} characters`);

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address').toLowerCase();

/**
 * Password validation (strong policy)
 * - At least 8 characters
 * - At most 100 characters
 * - Must contain uppercase, lowercase, and a number
 */
export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * SKU validation (alphanumeric with dashes)
 */
export const skuSchema = z.string()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU must be at most 50 characters')
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU must only contain letters, numbers, dashes, and underscores');

/**
 * Positive number
 */
export const positiveNumber = z.coerce.number().positive('Must be a positive number');

/**
 * Non-negative number  
 */
export const nonNegativeNumber = z.coerce.number().min(0, 'Must be zero or greater');

/**
 * Percentage (0-100)
 */
export const percentageSchema = z.coerce.number()
    .min(0, 'Must be at least 0')
    .max(100, 'Must be at most 100');

/**
 * JSON object validation (for JSONB fields)
 */
export const jsonObjectSchema = z.record(z.unknown()).optional();
