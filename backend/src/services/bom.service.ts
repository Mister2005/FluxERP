import prisma from '../lib/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

// ============================================================================
// Types (aligned with Prisma schema)
// ============================================================================

export interface BOMComponentInput {
    productId: string;
    quantity: number;
    unitCost: number;
}

export interface BOMOperationInput {
    name: string;
    workCenter: string;
    duration: number;
    cost: number;
    sequence: number;
}

export interface CreateBOMInput {
    name: string;
    productId: string;
    version: string;
    status?: string;
    totalCost?: number;
    parentId?: string;
    components?: BOMComponentInput[];
    operations?: BOMOperationInput[];
}

export interface UpdateBOMInput {
    name?: string;
    version?: string;
    status?: string;
    totalCost?: number;
    isLatest?: boolean;
}

export interface BOMQueryOptions {
    page?: number;
    limit?: number;
    productId?: string;
    status?: string;
    search?: string;
    isLatest?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// BOM Service
// ============================================================================

export class BOMService {
    /**
     * Create a new BOM
     */
    async create(data: CreateBOMInput, userId: string) {
        // Verify product exists
        const product = await prisma.product.findUnique({
            where: { id: data.productId },
        });

        if (!product) {
            throw new NotFoundError('Product not found');
        }

        // Check for existing active BOM with same version
        const existingBOM = await prisma.bOM.findFirst({
            where: {
                productId: data.productId,
                version: data.version,
                status: { not: 'Obsolete' },
            },
        });

        if (existingBOM) {
            throw new ConflictError(`Active BOM with version ${data.version} already exists for this product`);
        }

        // If this is a new version, mark previous as not latest
        if (data.parentId) {
            await prisma.bOM.update({
                where: { id: data.parentId },
                data: { isLatest: false },
            });
        } else {
            // Mark all other BOMs for this product as not latest
            await prisma.bOM.updateMany({
                where: { productId: data.productId },
                data: { isLatest: false },
            });
        }

        const bom = await prisma.bOM.create({
            data: {
                name: data.name,
                productId: data.productId,
                version: data.version,
                status: data.status || 'Draft',
                totalCost: data.totalCost || 0,
                parentId: data.parentId,
                isLatest: true,
                components: data.components ? {
                    create: data.components.map(c => ({
                        productId: c.productId,
                        quantity: c.quantity,
                        unitCost: c.unitCost,
                    })),
                } : undefined,
                operations: data.operations ? {
                    create: data.operations.map(o => ({
                        name: o.name,
                        workCenter: o.workCenter,
                        duration: o.duration,
                        cost: o.cost,
                        sequence: o.sequence,
                    })),
                } : undefined,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                components: {
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                },
                operations: true,
            },
        });

        logger.info({ bomId: bom.id, version: data.version, productId: data.productId }, 'BOM created');
        return bom;
    }

    /**
     * Get all BOMs with pagination and filtering
     */
    async findAll(options: BOMQueryOptions = {}) {
        const {
            page = 1,
            limit = 20,
            productId,
            status,
            search,
            isLatest,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options;

        const skip = (page - 1) * limit;

        const where: Prisma.BOMWhereInput = {};

        if (productId) {
            where.productId = productId;
        }

        if (status) {
            where.status = status;
        }

        if (isLatest !== undefined) {
            where.isLatest = isLatest;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { version: { contains: search } },
                { product: { sku: { contains: search } } },
                { product: { name: { contains: search } } },
            ];
        }

        const [boms, total] = await Promise.all([
            prisma.bOM.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    product: {
                        select: { id: true, sku: true, name: true, category: true },
                    },
                    components: {
                        include: {
                            product: { select: { id: true, sku: true, name: true } },
                        },
                    },
                    operations: true,
                },
            }),
            prisma.bOM.count({ where }),
        ]);

        return {
            data: boms,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single BOM by ID
     */
    async findById(id: string) {
        const bom = await prisma.bOM.findUnique({
            where: { id },
            include: {
                product: true,
                components: {
                    include: {
                        product: { select: { id: true, sku: true, name: true, cost: true } },
                    },
                },
                operations: { orderBy: { sequence: 'asc' } },
                versions: { select: { id: true, version: true, status: true, isLatest: true } },
                parent: { select: { id: true, version: true } },
            },
        });

        if (!bom) {
            throw new NotFoundError('BOM not found');
        }

        return bom;
    }

    /**
     * Get BOM by product ID
     */
    async findByProductId(productId: string, options: { status?: string; isLatest?: boolean } = {}) {
        const where: Prisma.BOMWhereInput = { productId };
        
        if (options.status) {
            where.status = options.status;
        }

        if (options.isLatest !== undefined) {
            where.isLatest = options.isLatest;
        }

        const boms = await prisma.bOM.findMany({
            where,
            orderBy: { version: 'desc' },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                components: {
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                },
                operations: true,
            },
        });

        return boms;
    }

    /**
     * Get active BOM for a product (latest with Active status)
     */
    async findActiveByProductId(productId: string) {
        const bom = await prisma.bOM.findFirst({
            where: {
                productId,
                status: 'Active',
                isLatest: true,
            },
            include: {
                product: true,
                components: {
                    include: {
                        product: { select: { id: true, sku: true, name: true, cost: true } },
                    },
                },
                operations: { orderBy: { sequence: 'asc' } },
            },
        });

        if (!bom) {
            throw new NotFoundError('No active BOM found for this product');
        }

        return bom;
    }

    /**
     * Update a BOM
     */
    async update(id: string, data: UpdateBOMInput, userId: string) {
        const existing = await prisma.bOM.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('BOM not found');
        }

        // Validate status transitions
        if (data.status && data.status !== existing.status) {
            this.validateStatusTransition(existing.status, data.status);
        }

        // If activating, deactivate other active BOMs for the same product
        if (data.status === 'Active' && existing.status !== 'Active') {
            await prisma.bOM.updateMany({
                where: {
                    productId: existing.productId,
                    status: 'Active',
                    id: { not: id },
                },
                data: { status: 'Obsolete' },
            });
        }

        const bom = await prisma.bOM.update({
            where: { id },
            data: {
                name: data.name,
                version: data.version,
                status: data.status,
                totalCost: data.totalCost,
                isLatest: data.isLatest,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                components: {
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                },
                operations: true,
            },
        });

        logger.info({ bomId: id, updatedBy: userId }, 'BOM updated');
        return bom;
    }

    /**
     * Add component to BOM
     */
    async addComponent(bomId: string, component: BOMComponentInput, userId: string) {
        const bom = await prisma.bOM.findUnique({ where: { id: bomId } });
        if (!bom) {
            throw new NotFoundError('BOM not found');
        }

        const newComponent = await prisma.bOMComponent.create({
            data: {
                bomId,
                productId: component.productId,
                quantity: component.quantity,
                unitCost: component.unitCost,
            },
            include: {
                product: { select: { id: true, sku: true, name: true } },
            },
        });

        logger.info({ bomId, componentId: newComponent.id, userId }, 'BOM component added');
        return newComponent;
    }

    /**
     * Remove component from BOM
     */
    async removeComponent(bomId: string, componentId: string, userId: string) {
        await prisma.bOMComponent.delete({
            where: { id: componentId },
        });

        logger.info({ bomId, componentId, userId }, 'BOM component removed');
    }

    /**
     * Delete a BOM (only Draft status)
     */
    async delete(id: string, userId: string) {
        const existing = await prisma.bOM.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('BOM not found');
        }

        if (existing.status !== 'Draft') {
            throw new ValidationError('Can only delete BOMs in Draft status');
        }

        // Check if BOM is used in any work orders
        const workOrderCount = await prisma.workOrder.count({
            where: { bomId: id },
        });

        if (workOrderCount > 0) {
            throw new ValidationError(`Cannot delete BOM: ${workOrderCount} work orders reference this BOM`);
        }

        await prisma.bOM.delete({
            where: { id },
        });

        logger.info({ bomId: id, deletedBy: userId }, 'BOM deleted');
    }

    /**
     * Clone a BOM to a new version
     */
    async clone(id: string, newVersion: string, userId: string) {
        const original = await prisma.bOM.findUnique({
            where: { id },
            include: {
                components: true,
                operations: true,
            },
        });

        if (!original) {
            throw new NotFoundError('BOM not found');
        }

        // Check if version already exists
        const existingVersion = await prisma.bOM.findFirst({
            where: {
                productId: original.productId,
                version: newVersion,
            },
        });

        if (existingVersion) {
            throw new ConflictError(`BOM version ${newVersion} already exists`);
        }

        // Mark original as not latest
        await prisma.bOM.update({
            where: { id },
            data: { isLatest: false },
        });

        const clonedBOM = await prisma.bOM.create({
            data: {
                name: `${original.name} (v${newVersion})`,
                productId: original.productId,
                version: newVersion,
                status: 'Draft',
                totalCost: original.totalCost,
                parentId: original.id,
                isLatest: true,
                components: {
                    create: original.components.map(c => ({
                        productId: c.productId,
                        quantity: c.quantity,
                        unitCost: c.unitCost,
                    })),
                },
                operations: {
                    create: original.operations.map(o => ({
                        name: o.name,
                        workCenter: o.workCenter,
                        duration: o.duration,
                        cost: o.cost,
                        sequence: o.sequence,
                    })),
                },
            },
            include: {
                product: { select: { id: true, sku: true, name: true } },
                components: {
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                },
                operations: true,
            },
        });

        logger.info({ originalBomId: id, clonedBomId: clonedBOM.id, userId }, 'BOM cloned');
        return clonedBOM;
    }

    /**
     * Get BOM statistics
     */
    async getStats() {
        const [total, byStatus] = await Promise.all([
            prisma.bOM.count(),
            prisma.bOM.groupBy({
                by: ['status'],
                _count: true,
            }),
        ]);

        return {
            total,
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        };
    }

    /**
     * Validate BOM status transition
     */
    private validateStatusTransition(currentStatus: string, newStatus: string) {
        const validTransitions: Record<string, string[]> = {
            Draft: ['Active', 'Obsolete'],
            Active: ['Obsolete'],
            Obsolete: [],
        };

        const allowed = validTransitions[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
            throw new ValidationError(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Allowed: ${allowed.join(', ') || 'none'}`
            );
        }
    }
}

// Export singleton instance
export const bomService = new BOMService();
