import prisma from '../lib/db.js';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';
import { aiService } from './ai.service.js';

// ============================================================================
// Types (aligned with Prisma schema)
// ============================================================================

// Status values from schema: string type - define valid values
export type ECOStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'implementing' | 'completed' | 'rejected';

export interface CreateECOInput {
    title: string;
    description: string;
    reason?: string;
    type: string;  // Schema uses 'type' instead of 'changeType'
    priority?: string;
    productId?: string;
    bomId?: string;
    proposedChanges: Record<string, any>;
    impactAnalysis: Record<string, any>;
    complianceChecks?: Record<string, any>;
    effectiveDate?: Date;
    requestedByName: string;
}

export interface UpdateECOInput {
    title?: string;
    description?: string;
    reason?: string;
    type?: string;
    priority?: string;
    proposedChanges?: Record<string, any>;
    impactAnalysis?: Record<string, any>;
    complianceChecks?: Record<string, any>;
    effectiveDate?: Date;
}

export interface ECOQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    productId?: string;
    priority?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    latestOnly?: boolean;
}

interface ECOStatusTransitionMap {
    [key: string]: string[];
}

// ============================================================================
// ECO Service
// ============================================================================

export class ECOService {
    // Valid status transitions
    private readonly statusTransitions: ECOStatusTransitionMap = {
        draft: ['submitted'],
        submitted: ['under_review', 'rejected'],
        under_review: ['approved', 'rejected', 'submitted'],
        approved: ['implementing', 'rejected'],
        implementing: ['completed', 'approved'],
        completed: [],  // Terminal state
        rejected: ['submitted'],  // Can resubmit
    };

    /**
     * Create a new ECO
     */
    async create(data: CreateECOInput, userId: string) {
        // Verify product exists if provided
        if (data.productId) {
            const product = await prisma.product.findUnique({
                where: { id: data.productId },
            });
            if (!product) {
                throw new NotFoundError('Product not found');
            }
        }

        const eco = await prisma.eCO.create({
            data: {
                title: data.title,
                description: data.description,
                reason: data.reason,
                type: data.type,
                priority: data.priority || 'medium',
                productId: data.productId,
                bomId: data.bomId,
                status: 'draft',
                proposedChanges: JSON.stringify(data.proposedChanges),
                impactAnalysis: JSON.stringify(data.impactAnalysis),
                complianceChecks: data.complianceChecks ? JSON.stringify(data.complianceChecks) : '{}',
                effectiveDate: data.effectiveDate,
                requestedById: userId,
                requestedByName: data.requestedByName,
                version: 1,
                isLatest: true,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        logger.info({ ecoId: eco.id }, 'ECO created');
        return this.formatECO(eco);
    }

    /**
     * Get all ECOs with pagination and filtering
     */
    async findAll(options: ECOQueryOptions = {}) {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            productId,
            priority,
            type,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            latestOnly = true,
        } = options;

        const skip = (page - 1) * limit;

        const where: Prisma.ECOWhereInput = {};

        // Default to latest versions only
        if (latestOnly) {
            where.isLatest = true;
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (productId) {
            where.productId = productId;
        }

        if (priority) {
            where.priority = priority;
        }

        if (type) {
            where.type = type;
        }

        const [ecos, total] = await Promise.all([
            prisma.eCO.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    product: {
                        select: { id: true, sku: true, name: true },
                    },
                    requestedBy: {
                        select: { id: true, name: true },
                    },
                },
            }),
            prisma.eCO.count({ where }),
        ]);

        return {
            data: ecos.map(eco => this.formatECO(eco)),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single ECO by ID
     */
    async findById(id: string) {
        const eco = await prisma.eCO.findUnique({
            where: { id },
            include: {
                product: true,
                bom: true,
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
                approvedBy: {
                    select: { id: true, name: true },
                },
                executedBy: {
                    select: { id: true, name: true },
                },
                comments: {
                    include: {
                        user: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                versions: {
                    select: { id: true, version: true, status: true, isLatest: true, createdAt: true },
                    orderBy: { version: 'desc' },
                },
            },
        });

        if (!eco) {
            throw new NotFoundError('ECO not found');
        }

        return this.formatECO(eco);
    }

    /**
     * Get ECO version history
     */
    async getVersionHistory(id: string) {
        const eco = await prisma.eCO.findUnique({
            where: { id },
            select: { parentId: true },
        });

        if (!eco) {
            throw new NotFoundError('ECO not found');
        }

        // Find the root ECO (one without parent OR itself if it has no parent)
        let rootId = id;
        if (eco.parentId) {
            // Walk up to find root
            let current = eco;
            while (current.parentId) {
                const parent = await prisma.eCO.findUnique({
                    where: { id: current.parentId },
                    select: { id: true, parentId: true },
                });
                if (!parent) break;
                rootId = parent.id;
                current = parent;
            }
        }

        // Get all versions from this tree
        const versions = await prisma.eCO.findMany({
            where: {
                OR: [
                    { id: rootId },
                    { parentId: rootId },
                ],
            },
            orderBy: { version: 'desc' },
            select: {
                id: true,
                version: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                isLatest: true,
            },
        });

        return versions;
    }

    /**
     * Update an ECO
     */
    async update(id: string, data: UpdateECOInput, userId: string) {
        const existing = await prisma.eCO.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('ECO not found');
        }

        // Can only update Draft or Rejected ECOs
        if (!['draft', 'rejected'].includes(existing.status)) {
            throw new ValidationError(`Cannot update ECO in ${existing.status} status`);
        }

        const eco = await prisma.eCO.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                reason: data.reason,
                type: data.type,
                priority: data.priority,
                proposedChanges: data.proposedChanges ? JSON.stringify(data.proposedChanges) : undefined,
                impactAnalysis: data.impactAnalysis ? JSON.stringify(data.impactAnalysis) : undefined,
                complianceChecks: data.complianceChecks ? JSON.stringify(data.complianceChecks) : undefined,
                effectiveDate: data.effectiveDate,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
                requestedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        logger.info({ ecoId: id, updatedBy: userId }, 'ECO updated');
        return this.formatECO(eco);
    }

    /**
     * Update ECO status
     */
    async updateStatus(id: string, newStatus: string, userId: string, comments?: string) {
        const existing = await prisma.eCO.findUnique({
            where: { id },
            include: {
                product: true,
            },
        });

        if (!existing) {
            throw new NotFoundError('ECO not found');
        }

        // Validate status transition
        const currentStatus = existing.status;
        const allowedTransitions = this.statusTransitions[currentStatus] || [];

        if (!allowedTransitions.includes(newStatus)) {
            throw new ValidationError(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
            );
        }

        // Run AI risk analysis when submitting for review
        let aiData: Prisma.ECOUpdateInput = {};
        if (newStatus === 'submitted' && existing.status === 'draft') {
            try {
                const analysis = await aiService.analyzeECORisk({
                    title: existing.title,
                    description: existing.description,
                    type: existing.type,
                    priority: existing.priority,
                    proposedChanges: existing.proposedChanges ? JSON.parse(existing.proposedChanges) : {},
                    product: existing.product ? {
                        sku: existing.product.sku,
                        name: existing.product.name,
                        category: existing.product.category,
                    } : undefined,
                });

                aiData = {
                    aiRiskScore: analysis.riskScore,
                    aiPredictedDelay: analysis.predictedDelay,
                    aiKeyRisks: JSON.stringify(analysis.keyRisks),
                };
            } catch (error) {
                logger.warn({ ecoId: id, error }, 'AI risk analysis failed');
                // Continue without AI analysis
            }
        }

        // Update status with a new version if transitioning to major state
        const shouldVersion = ['submitted', 'approved', 'completed'].includes(newStatus);
        
        const result = await prisma.$transaction(async (tx) => {
            // Determine approval/execution tracking data
            let approvedById: string | null = existing.approvedById;
            let approvalDate: Date | null = existing.approvalDate;
            let executedById: string | null = existing.executedById;
            let executedAt: Date | null = existing.executedAt;
            
            if (newStatus === 'approved') {
                approvedById = userId;
                approvalDate = new Date();
            } else if (newStatus === 'completed') {
                executedById = userId;
                executedAt = new Date();
            }

            if (shouldVersion) {
                // Mark current version as not latest
                await tx.eCO.update({
                    where: { id },
                    data: { isLatest: false },
                });

                // Create new version
                const newEco = await tx.eCO.create({
                    data: {
                        title: existing.title,
                        description: existing.description,
                        reason: existing.reason,
                        type: existing.type,
                        priority: existing.priority,
                        productId: existing.productId,
                        bomId: existing.bomId,
                        status: newStatus,
                        proposedChanges: existing.proposedChanges,
                        impactAnalysis: existing.impactAnalysis,
                        complianceChecks: existing.complianceChecks,
                        effectiveDate: existing.effectiveDate,
                        requestedById: existing.requestedById,
                        requestedByName: existing.requestedByName,
                        approvedById,
                        approvalDate,
                        executedById,
                        executedAt,
                        version: existing.version + 1,
                        parentId: existing.id,
                        isLatest: true,
                        aiRiskScore: (aiData.aiRiskScore as number) || existing.aiRiskScore,
                        aiPredictedDelay: (aiData.aiPredictedDelay as number) || existing.aiPredictedDelay,
                        aiKeyRisks: (aiData.aiKeyRisks as string) || existing.aiKeyRisks,
                    },
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                });

                // Add comment for status change
                if (comments) {
                    await tx.eCOComment.create({
                        data: {
                            content: `Status changed to ${newStatus}: ${comments}`,
                            ecoId: newEco.id,
                            userId: userId,
                        },
                    });
                }

                return newEco;
            } else {
                // Build update data dynamically to avoid undefined values
                const updateData: Record<string, any> = {
                    status: newStatus,
                    ...aiData,
                };
                
                if (newStatus === 'approved') {
                    updateData.approvedById = userId;
                    updateData.approvalDate = new Date();
                }
                if (newStatus === 'completed') {
                    updateData.executedById = userId;
                    updateData.executedAt = new Date();
                }

                // Just update the status
                const updatedEco = await tx.eCO.update({
                    where: { id },
                    data: updateData,
                    include: {
                        product: { select: { id: true, sku: true, name: true } },
                    },
                });

                if (comments) {
                    await tx.eCOComment.create({
                        data: {
                            content: `Status changed to ${newStatus}: ${comments}`,
                            ecoId: id,
                            userId: userId,
                        },
                    });
                }

                return updatedEco;
            }
        });

        logger.info({ 
            ecoId: id, 
            newVersion: result.id,
            from: currentStatus, 
            to: newStatus, 
            userId 
        }, 'ECO status updated');

        return this.formatECO(result);
    }

    /**
     * Add comment to ECO
     */
    async addComment(ecoId: string, userId: string, content: string) {
        const eco = await prisma.eCO.findUnique({
            where: { id: ecoId },
        });

        if (!eco) {
            throw new NotFoundError('ECO not found');
        }

        const comment = await prisma.eCOComment.create({
            data: {
                content,
                ecoId,
                userId,
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        });

        logger.info({ ecoId, userId }, 'ECO comment added');
        return comment;
    }

    /**
     * Delete an ECO (only Draft status)
     */
    async delete(id: string, userId: string) {
        const existing = await prisma.eCO.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError('ECO not found');
        }

        if (existing.status !== 'draft') {
            throw new ValidationError('Can only delete ECOs in Draft status');
        }

        if (existing.requestedById !== userId) {
            throw new ForbiddenError('Only the requester can delete an ECO');
        }

        await prisma.eCO.delete({
            where: { id },
        });

        logger.info({ ecoId: id, deletedBy: userId }, 'ECO deleted');
    }

    /**
     * Add approval to ECO
     */
    async addApproval(id: string, userId: string, approved: boolean, comments?: string) {
        const eco = await prisma.eCO.findUnique({
            where: { id },
        });

        if (!eco) {
            throw new NotFoundError('ECO not found');
        }

        // Determine new status based on approval decision
        const newStatus = approved ? 'approved' : 'rejected';

        // Update ECO using the status transition method
        const result = await this.updateStatus(id, newStatus, userId, comments);

        // Add comment about approval decision
        await prisma.eCOComment.create({
            data: {
                content: approved 
                    ? `ECO approved${comments ? `: ${comments}` : ''}`
                    : `ECO rejected${comments ? `: ${comments}` : ''}`,
                ecoId: id,
                userId: userId,
            },
        });

        logger.info({ ecoId: id, approved, userId }, 'ECO approval recorded');

        return {
            eco: result,
            approved,
            approvedAt: new Date(),
            comments,
        };
    }

    /**
     * Get ECO statistics
     */
    async getStats() {
        const [total, byStatus, byPriority, byType] = await Promise.all([
            prisma.eCO.count({ where: { isLatest: true } }),
            prisma.eCO.groupBy({
                by: ['status'],
                where: { isLatest: true },
                _count: true,
            }),
            prisma.eCO.groupBy({
                by: ['priority'],
                where: { isLatest: true },
                _count: true,
            }),
            prisma.eCO.groupBy({
                by: ['type'],
                where: { isLatest: true },
                _count: true,
            }),
        ]);

        return {
            total,
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
            byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
            byType: byType.map(t => ({ type: t.type, count: t._count })),
        };
    }

    /**
     * Format ECO response (parse JSON fields)
     */
    private formatECO(eco: any) {
        return {
            ...eco,
            proposedChanges: eco.proposedChanges ? JSON.parse(eco.proposedChanges) : null,
            impactAnalysis: eco.impactAnalysis ? JSON.parse(eco.impactAnalysis) : null,
            complianceChecks: eco.complianceChecks ? JSON.parse(eco.complianceChecks) : null,
            aiKeyRisks: eco.aiKeyRisks ? JSON.parse(eco.aiKeyRisks) : null,
        };
    }
}

// Export singleton instance
export const ecoService = new ECOService();
