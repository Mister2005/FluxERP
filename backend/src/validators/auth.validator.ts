import { z } from 'zod';
import { emailSchema, passwordSchema, requiredString, uuidSchema } from './common.validator.js';

// ============================================================================
// Auth Validators
// ============================================================================

/**
 * Login request validation
 */
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

/**
 * Registration request validation
 */
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: requiredString(2, 100),
    roleId: uuidSchema,
});

/**
 * Change password validation
 */
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
}).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }
);

/**
 * Update profile validation
 */
export const updateProfileSchema = z.object({
    name: requiredString(2, 100).optional(),
    email: emailSchema.optional(),
});

// Alias for routes
export const profileUpdateSchema = updateProfileSchema;

// ============================================================================
// Type Exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
