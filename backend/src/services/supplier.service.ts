import prisma from '../lib/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

// ============================================================================
// Types (aligned with Prisma schema)
// ============================================================================

export interface CreateSupplierInput {
    name: string;
    leadTimeDays?: number;
    defectRate?: number;
    onTimeDeliveryRate?: number;
}

export interface UpdateSupplierInput {
    name?: string;
    leadTimeDays?: number;
    defectRate?: number;
    onTimeDeliveryRate?: number;
}

export interface SupplierQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateDefectInput {
    supplierId?: string;
    productId?: string;
    workOrderId?: string;
    type: string;
    severity: string;
    description: string;
    discoveredAt?: Date;
}

// ============================================================================
// Supplier Service
// ============================================================================

export class SupplierService {
    /**
     * Create a new supplier
     */
    async create(data: CreateSupplierInput, userId: string) {
        // Validate rates if provided
        if (data.defectRate !== undefined && (data.defectRate < 0 || data.defectRate > 100)) {
            throw new ValidationError('Defect rate must be between 0 and 100');
        }
        if (data.onTimeDeliveryRate !== undefined && (data.onTimeDeliveryRate < 0 || data.onTimeDeliveryRate > 100)) {
            throw new ValidationError('On-time delivery rate must be between 0 and 100');
        }

        const supplier = await prisma.supplier.create({
            data: {
                name: data.name,
                leadTimeDays: data.leadTimeDays || 0,
                defectRate: data.defectRate || 0,
                onTimeDeliveryRate: data.onTimeDeliveryRate || 100,
            },
        });

        logger.info({ supplierId: supplier.id, name: supplier.name }, 'Supplier created');
        return supplier;
    }

    /**
     * Get all suppliers with pagination and filtering
     */
    async findAll(options: SupplierQueryOptions = {}) {
        const {
            page = 1,
            limit = 20,
            search,
            sortBy = 'name',
            sortOrder = 'asc',
        } = options;

        const skip = (page - 1) * limit;

        const where: Prisma.SupplierWhereInput = {};

        if (search) {
            where.name = { contains: search };
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    _count: {
                        select: { defects: true },
                    },
                },
            }),
            prisma.supplier.count({ where }),
        ]);

        return {
            data: suppliers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single supplier by ID
     */
    async findById(id: string) {
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                defects: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                },
                _count: {
                    select: { defects: true },
                },
            },
        });

        if (!supplier) {
            throw new NotFoundError('Supplier not found');
        }

        return supplier;
    }

    /**
     * Update a supplier
     */
    async update(id: string, data: UpdateSupplierInput, userId: string) {
        const existing = await prisma.supplier.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('Supplier not found');
        }

        // Validate rates if provided
        if (data.defectRate !== undefined && (data.defectRate < 0 || data.defectRate > 100)) {
            throw new ValidationError('Defect rate must be between 0 and 100');
        }
        if (data.onTimeDeliveryRate !== undefined && (data.onTimeDeliveryRate < 0 || data.onTimeDeliveryRate > 100)) {
            throw new ValidationError('On-time delivery rate must be between 0 and 100');
        }

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name: data.name,
                leadTimeDays: data.leadTimeDays,
                defectRate: data.defectRate,
                onTimeDeliveryRate: data.onTimeDeliveryRate,
            },
        });

        logger.info({ supplierId: id, updatedBy: userId }, 'Supplier updated');
        return supplier;
    }

    /**
     * Delete a supplier
     */
    async delete(id: string, userId: string) {
        const existing = await prisma.supplier.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('Supplier not found');
        }

        // Check for related defects
        const defectCount = await prisma.defect.count({
            where: { supplierId: id },
        });

        if (defectCount > 0) {
            throw new ValidationError(`Cannot delete supplier: ${defectCount} defects reference this supplier`);
        }

        await prisma.supplier.delete({
            where: { id },
        });

        logger.info({ supplierId: id, deletedBy: userId }, 'Supplier deleted');
    }

    /**
     * Get supplier statistics
     */
    async getStats() {
        const [total, avgMetrics] = await Promise.all([
            prisma.supplier.count(),
            prisma.supplier.aggregate({
                _avg: {
                    leadTimeDays: true,
                    defectRate: true,
                    onTimeDeliveryRate: true,
                },
            }),
        ]);

        return {
            total,
            averageLeadTimeDays: avgMetrics._avg.leadTimeDays?.toFixed(1) || '0',
            averageDefectRate: avgMetrics._avg.defectRate?.toFixed(2) || '0',
            averageOnTimeDeliveryRate: avgMetrics._avg.onTimeDeliveryRate?.toFixed(1) || '100',
        };
    }

    /**
     * Record a defect (uses Defect model, not SupplierDefect)
     */
    async recordDefect(data: CreateDefectInput, userId: string) {
        // Verify supplier exists if provided
        if (data.supplierId) {
            const supplier = await prisma.supplier.findUnique({
                where: { id: data.supplierId },
            });

            if (!supplier) {
                throw new NotFoundError('Supplier not found');
            }
        }

        const defect = await prisma.defect.create({
            data: {
                supplierId: data.supplierId,
                productId: data.productId,
                workOrderId: data.workOrderId,
                type: data.type,
                severity: data.severity,
                description: data.description,
                discoveredAt: data.discoveredAt || new Date(),
            },
            include: {
                supplier: { select: { id: true, name: true } },
                product: { select: { id: true, sku: true, name: true } },
            },
        });

        // Recalculate supplier defect rate if supplier is provided
        if (data.supplierId) {
            await this.recalculateSupplierMetrics(data.supplierId);
        }

        logger.info({ defectId: defect.id, supplierId: data.supplierId, reportedBy: userId }, 'Defect recorded');
        return defect;
    }

    /**
     * Get defects for a supplier
     */
    async getSupplierDefects(supplierId: string, options: { page?: number; limit?: number } = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        // Verify supplier exists
        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
        });

        if (!supplier) {
            throw new NotFoundError('Supplier not found');
        }

        const [defects, total] = await Promise.all([
            prisma.defect.findMany({
                where: { supplierId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    product: { select: { id: true, sku: true, name: true } },
                },
            }),
            prisma.defect.count({ where: { supplierId } }),
        ]);

        return {
            data: defects,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get defect statistics for a supplier
     */
    async getSupplierDefectStats(supplierId: string) {
        const [totalDefects, bySeverity, byType] = await Promise.all([
            prisma.defect.count({ where: { supplierId } }),
            prisma.defect.groupBy({
                by: ['severity'],
                where: { supplierId },
                _count: true,
            }),
            prisma.defect.groupBy({
                by: ['type'],
                where: { supplierId },
                _count: true,
            }),
        ]);

        return {
            totalDefects,
            bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
            byType: byType.map(t => ({ type: t.type, count: t._count })),
        };
    }

    /**
     * Recalculate supplier metrics based on defect history
     */
    private async recalculateSupplierMetrics(supplierId: string) {
        // Get defects from last 12 months
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const defects = await prisma.defect.findMany({
            where: {
                supplierId,
                createdAt: { gte: oneYearAgo },
            },
        });

        // Simple defect rate calculation
        // This would ideally be based on total parts received
        const defectCount = defects.length;
        const newDefectRate = Math.min(defectCount * 2, 100); // Simple approximation

        await prisma.supplier.update({
            where: { id: supplierId },
            data: { defectRate: newDefectRate },
        });

        logger.debug({ supplierId, newDefectRate }, 'Supplier metrics recalculated');
    }
}

// Export singleton instance
export const supplierService = new SupplierService();
