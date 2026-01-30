import prisma from '../lib/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

// ============================================================================
// Types (aligned with Prisma schema)
// ============================================================================

export interface CreateWorkOrderInput {
    productId: string;
    bomId?: string;
    name?: string;
    quantity: number;
    priority?: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    plannedStart?: Date;
    plannedEnd?: Date;
}

export interface UpdateWorkOrderInput {
    name?: string;
    quantity?: number;
    priority?: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    plannedStart?: Date;
    plannedEnd?: Date;
    progress?: number;
    scrapCount?: number;
    reworkCount?: number;
}

export interface WorkOrderQueryOptions {
    page?: number;
    limit?: number;
    productId?: string;
    status?: string;
    priority?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

type WorkOrderStatus = 'Planned' | 'Released' | 'InProgress' | 'OnHold' | 'Completed' | 'Cancelled';

// ============================================================================
// Work Order Service
// ============================================================================

export class WorkOrderService {
    // Valid status transitions
    private readonly statusTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
        Planned: ['Released', 'Cancelled'],
        Released: ['InProgress', 'OnHold', 'Cancelled'],
        InProgress: ['OnHold', 'Completed', 'Cancelled'],
        OnHold: ['Released', 'InProgress', 'Cancelled'],
        Completed: [],  // Terminal state
        Cancelled: [],  // Terminal state
    };

    /**
     * Create a new Work Order
     */
    async create(data: CreateWorkOrderInput, userId: string) {
        // Verify product exists
        const product = await prisma.product.findUnique({
            where: { id: data.productId },
        });

        if (!product) {
            throw new NotFoundError('Product not found');
        }

        // Verify BOM exists if provided
        if (data.bomId) {
            const bom = await prisma.bOM.findUnique({
                where: { id: data.bomId },
            });

            if (!bom) {
                throw new NotFoundError('BOM not found');
            }

            if (bom.status !== 'Active') {
                throw new ValidationError('BOM must be in Active status to create a work order');
            }

            if (bom.productId !== data.productId) {
                throw new ValidationError('BOM does not belong to the specified product');
            }
        }

        // Validate quantity
        if (data.quantity <= 0) {
            throw new ValidationError('Quantity must be greater than 0');
        }

        // Validate dates
        if (data.scheduledStart && data.scheduledEnd) {
            if (new Date(data.scheduledEnd) < new Date(data.scheduledStart)) {
                throw new ValidationError('Scheduled end date must be after start date');
            }
        }

        const workOrder = await prisma.workOrder.create({
            data: {
                productId: data.productId,
                bomId: data.bomId,
                name: data.name,
                quantity: data.quantity,
                priority: data.priority || 'medium',
                status: 'Planned',
                scheduledStart: data.scheduledStart,
                scheduledEnd: data.scheduledEnd,
                plannedStart: data.plannedStart,
                plannedEnd: data.plannedEnd,
                progress: 0,
                scrapCount: 0,
                reworkCount: 0,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                bom: {
                    select: { id: true, name: true, version: true },
                },
            },
        });

        logger.info({ woId: workOrder.id, productId: data.productId }, 'Work order created');
        return workOrder;
    }

    /**
     * Get all Work Orders with pagination and filtering
     */
    async findAll(options: WorkOrderQueryOptions = {}) {
        const {
            page = 1,
            limit = 20,
            productId,
            status,
            priority,
            search,
            dateFrom,
            dateTo,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options;

        const skip = (page - 1) * limit;

        const where: Prisma.WorkOrderWhereInput = {};

        if (productId) {
            where.productId = productId;
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { product: { sku: { contains: search } } },
                { product: { name: { contains: search } } },
            ];
        }

        if (dateFrom || dateTo) {
            where.scheduledStart = {};
            if (dateFrom) {
                where.scheduledStart.gte = dateFrom;
            }
            if (dateTo) {
                where.scheduledStart.lte = dateTo;
            }
        }

        const [workOrders, total] = await Promise.all([
            prisma.workOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    product: {
                        select: { id: true, sku: true, name: true },
                    },
                    bom: {
                        select: { id: true, name: true, version: true },
                    },
                },
            }),
            prisma.workOrder.count({ where }),
        ]);

        return {
            data: workOrders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single Work Order by ID
     */
    async findById(id: string) {
        const workOrder = await prisma.workOrder.findUnique({
            where: { id },
            include: {
                product: true,
                bom: {
                    include: {
                        components: {
                            include: {
                                product: { select: { id: true, sku: true, name: true, cost: true } },
                            },
                        },
                        operations: { orderBy: { sequence: 'asc' } },
                    },
                },
                defects: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!workOrder) {
            throw new NotFoundError('Work order not found');
        }

        return workOrder;
    }

    /**
     * Update a Work Order
     */
    async update(id: string, data: UpdateWorkOrderInput, userId: string) {
        const existing = await prisma.workOrder.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('Work order not found');
        }

        // Can't update completed or cancelled orders (most fields)
        if (['Completed', 'Cancelled'].includes(existing.status)) {
            throw new ValidationError(`Cannot update work order in ${existing.status} status`);
        }

        // Validate progress
        if (data.progress !== undefined) {
            if (data.progress < 0 || data.progress > 100) {
                throw new ValidationError('Progress must be between 0 and 100');
            }
        }

        if (data.scrapCount !== undefined && data.scrapCount < 0) {
            throw new ValidationError('Scrap count cannot be negative');
        }

        if (data.reworkCount !== undefined && data.reworkCount < 0) {
            throw new ValidationError('Rework count cannot be negative');
        }

        // Validate dates
        if (data.scheduledStart && data.scheduledEnd) {
            if (new Date(data.scheduledEnd) < new Date(data.scheduledStart)) {
                throw new ValidationError('Scheduled end date must be after start date');
            }
        }

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: {
                name: data.name,
                quantity: data.quantity,
                priority: data.priority,
                scheduledStart: data.scheduledStart,
                scheduledEnd: data.scheduledEnd,
                plannedStart: data.plannedStart,
                plannedEnd: data.plannedEnd,
                progress: data.progress,
                scrapCount: data.scrapCount,
                reworkCount: data.reworkCount,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                bom: {
                    select: { id: true, name: true, version: true },
                },
            },
        });

        logger.info({ woId: id, updatedBy: userId }, 'Work order updated');
        return workOrder;
    }

    /**
     * Update Work Order status
     */
    async updateStatus(id: string, newStatus: WorkOrderStatus, userId: string, comments?: string) {
        const existing = await prisma.workOrder.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('Work order not found');
        }

        // Validate status transition
        const currentStatus = existing.status as WorkOrderStatus;
        const allowedTransitions = this.statusTransitions[currentStatus] || [];

        if (!allowedTransitions.includes(newStatus)) {
            throw new ValidationError(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
            );
        }

        // Set actual start/end dates based on status
        const updateData: Prisma.WorkOrderUpdateInput = {
            status: newStatus,
        };

        if (newStatus === 'InProgress' && !existing.actualStart) {
            updateData.actualStart = new Date();
        }

        if (newStatus === 'Completed') {
            updateData.actualEnd = new Date();
            updateData.progress = 100;
        }

        const workOrder = await prisma.workOrder.update({
            where: { id },
            data: updateData,
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                bom: {
                    select: { id: true, name: true, version: true },
                },
            },
        });

        logger.info({ woId: id, from: currentStatus, to: newStatus, userId }, 'Work order status updated');
        return workOrder;
    }

    /**
     * Delete a Work Order (only Planned or Cancelled status)
     */
    async delete(id: string, userId: string) {
        const existing = await prisma.workOrder.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('Work order not found');
        }

        if (!['Planned', 'Cancelled'].includes(existing.status)) {
            throw new ValidationError(`Can only delete work orders in Planned or Cancelled status`);
        }

        await prisma.workOrder.delete({
            where: { id },
        });

        logger.info({ woId: id, deletedBy: userId }, 'Work order deleted');
    }

    /**
     * Get Work Order statistics
     */
    async getStats() {
        const [total, byStatus, byPriority] = await Promise.all([
            prisma.workOrder.count(),
            prisma.workOrder.groupBy({
                by: ['status'],
                _count: true,
            }),
            prisma.workOrder.groupBy({
                by: ['priority'],
                _count: true,
            }),
        ]);

        // Calculate on-time completion rate
        const completedOrders = await prisma.workOrder.findMany({
            where: { status: 'Completed' },
            select: { scheduledEnd: true, actualEnd: true },
        });

        let onTimeCount = 0;
        for (const order of completedOrders) {
            if (order.scheduledEnd && order.actualEnd) {
                if (new Date(order.actualEnd) <= new Date(order.scheduledEnd)) {
                    onTimeCount++;
                }
            }
        }

        const onTimeRate = completedOrders.length > 0 
            ? (onTimeCount / completedOrders.length * 100).toFixed(1)
            : '0';

        return {
            total,
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
            byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
            onTimeCompletionRate: `${onTimeRate}%`,
        };
    }

    /**
     * Get upcoming work orders (scheduled to start within X days)
     */
    async getUpcoming(days: number = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return prisma.workOrder.findMany({
            where: {
                status: { in: ['Planned', 'Released'] },
                scheduledStart: {
                    gte: today,
                    lte: futureDate,
                },
            },
            orderBy: { scheduledStart: 'asc' },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
            },
        });
    }

    /**
     * Get overdue work orders
     */
    async getOverdue() {
        const today = new Date();

        return prisma.workOrder.findMany({
            where: {
                status: { in: ['Planned', 'Released', 'InProgress'] },
                scheduledEnd: { lt: today },
            },
            orderBy: { scheduledEnd: 'asc' },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
            },
        });
    }
}

// Export singleton instance
export const workOrderService = new WorkOrderService();
