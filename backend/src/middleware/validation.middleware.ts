import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../types/errors.js';

// ============================================================================
// Validation Middleware Factory
// ============================================================================

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
    stripUnknown?: boolean;
}

/**
 * Creates a validation middleware for the specified target (body, query, params)
 */
export const validate = (
    schema: ZodSchema,
    target: ValidationTarget = 'body',
    options: ValidationOptions = {}
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[target];
            const validated = await schema.parseAsync(data);
            
            // Replace the request data with validated/transformed data
            req[target] = validated;
            
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.') || target,
                    message: err.message,
                    code: err.code,
                }));

                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: errors,
                });
            }
            next(error);
        }
    };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodSchema, options?: ValidationOptions) => 
    validate(schema, 'body', options);

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema, options?: ValidationOptions) => 
    validate(schema, 'query', options);

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ZodSchema, options?: ValidationOptions) => 
    validate(schema, 'params', options);

// ============================================================================
// Combined Validation
// ============================================================================

interface MultiValidationSchemas {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}

/**
 * Validate multiple targets in one middleware
 */
export const validateRequest = (schemas: MultiValidationSchemas) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const errors: Array<{ target: string; field: string; message: string }> = [];

        for (const [target, schema] of Object.entries(schemas)) {
            if (!schema) continue;
            
            try {
                const data = req[target as ValidationTarget];
                const validated = await schema.parseAsync(data);
                req[target as ValidationTarget] = validated;
            } catch (error) {
                if (error instanceof ZodError) {
                    error.errors.forEach((err) => {
                        errors.push({
                            target,
                            field: err.path.join('.') || target,
                            message: err.message,
                        });
                    });
                } else {
                    return next(error);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: errors,
            });
        }

        next();
    };
};

// ============================================================================
// Custom Validators
// ============================================================================

/**
 * Validate that at least one field is provided in the body
 */
export const requireAtLeastOne = (fields: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const hasAtLeastOne = fields.some((field) => 
            req.body[field] !== undefined && req.body[field] !== null
        );

        if (!hasAtLeastOne) {
            return res.status(400).json({
                success: false,
                error: `At least one of the following fields is required: ${fields.join(', ')}`,
                code: 'VALIDATION_ERROR',
            });
        }

        next();
    };
};

/**
 * Sanitize string fields (trim whitespace)
 */
export const sanitizeStrings = (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
        for (const key of Object.keys(req.body)) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    next();
};
