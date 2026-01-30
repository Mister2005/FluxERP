import { Router } from 'express';
import { authService, userService } from '../services/index.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { loginSchema, registerSchema, changePasswordSchema, profileUpdateSchema } from '../validators/auth.validator.js';
import { paginationSchema, uuidSchema } from '../validators/common.validator.js';
import { AuthRequest } from '../types/index.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// ============================================================================
// Public Routes (with rate limiting)
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register',
    authLimiter,
    validateBody(registerSchema),
    catchAsync(async (req, res) => {
        const result = await authService.register(req.body);
        res.status(201).json(successResponse(result, 'Registration successful'));
    })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login',
    authLimiter,
    validateBody(loginSchema),
    catchAsync(async (req, res) => {
        const result = await authService.login(req.body);
        res.json(successResponse(result, 'Login successful'));
    })
);

// ============================================================================
// Protected Routes
// ============================================================================

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me',
    authenticate,
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const profile = await authService.getProfile(authReq.user!.userId);
        res.json(successResponse(profile));
    })
);

/**
 * PUT /api/auth/me
 * Update current user profile
 */
router.put('/me',
    authenticate,
    validateBody(profileUpdateSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const profile = await authService.updateProfile(authReq.user!.userId, req.body);
        res.json(successResponse(profile, 'Profile updated'));
    })
);

/**
 * POST /api/auth/change-password
 * Change current user password
 */
router.post('/change-password',
    authenticate,
    authLimiter,
    validateBody(changePasswordSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await authService.changePassword(authReq.user!.userId, req.body);
        res.json(successResponse(null, 'Password changed successfully'));
    })
);

// ============================================================================
// Admin User Management Routes
// ============================================================================

/**
 * GET /api/auth/users
 * Get all users (admin only)
 */
router.get('/users',
    authenticate,
    requirePermission('users.read'),
    validateQuery(paginationSchema),
    catchAsync(async (req, res) => {
        const result = await userService.findAll(req.query as any);
        res.json(successResponse(result));
    })
);

/**
 * GET /api/auth/users/:id
 * Get user by ID (admin only)
 */
router.get('/users/:id',
    authenticate,
    requirePermission('users.read'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const user = await userService.findById(req.params.id);
        res.json(successResponse(user));
    })
);

/**
 * PUT /api/auth/users/:id
 * Update user (admin only)
 */
router.put('/users/:id',
    authenticate,
    requirePermission('users.write'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        const user = await userService.update(req.params.id, req.body, authReq.user!.userId);
        res.json(successResponse(user, 'User updated'));
    })
);

/**
 * POST /api/auth/users/:id/deactivate
 * Deactivate user (admin only)
 */
router.post('/users/:id/deactivate',
    authenticate,
    requirePermission('users.write'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await userService.deactivate(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'User deactivated'));
    })
);

/**
 * POST /api/auth/users/:id/reactivate
 * Reactivate user (admin only)
 */
router.post('/users/:id/reactivate',
    authenticate,
    requirePermission('users.write'),
    validateParams(uuidSchema),
    catchAsync(async (req, res) => {
        const authReq = req as AuthRequest;
        await userService.reactivate(req.params.id, authReq.user!.userId);
        res.json(successResponse(null, 'User reactivated'));
    })
);

export default router;
