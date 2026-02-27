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

        // ====================================================================
        // ECO Cost Propagation: When ECO is completed, propagate cost/price
        // changes to the product and all affected BOMs
        // ====================================================================
        if (newStatus === 'completed' && existing.productId) {
            try {
                await this.propagateCostChanges(existing, userId);
            } catch (error) {
                logger.error({ ecoId: id, error }, 'ECO cost propagation failed (non-blocking)');
            }
        }

        return this.formatECO(result);
    }

    /**
     * Propagate cost/price changes from a completed ECO to the product and all affected BOMs.
     * When an ECO modifies product cost, this method:
     *   1. Detects cost/price fields in proposedChanges
     *   2. Updates the product's cost in the system
     *   3. Finds all active/latest BOMs that reference this product as a component
     *   4. Creates new BOM versions with updated component unitCost and recalculated totalCost
     */
    private async propagateCostChanges(eco: any, userId: string) {
        let proposedChanges: Record<string, any> = {};
        try {
            proposedChanges = eco.proposedChanges ? JSON.parse(eco.proposedChanges) : {};
        } catch {
            return; // Cannot parse, nothing to propagate
        }

        // Detect cost/price related fields in the proposed changes
        const costKeys = ['cost', 'price', 'unitCost', 'unitPrice', 'unit_cost', 'unit_price'];
        const costFieldLabels = ['Cost', 'Price', 'Unit Cost', 'Unit Price', 'unit cost', 'unit price'];
        let newCost: number | null = null;

        // Format 1: Direct keys — { cost: 100 } or { price: 50 }
        for (const key of costKeys) {
            if (proposedChanges[key] !== undefined && proposedChanges[key] !== null) {
                const val = parseFloat(proposedChanges[key]);
                if (!isNaN(val)) {
                    newCost = val;
                    break;
                }
            }
        }

        // Format 2: Nested fields — { fields: { cost: 100 } }
        if (newCost === null && proposedChanges.fields) {
            for (const key of costKeys) {
                if (proposedChanges.fields[key] !== undefined) {
                    const val = parseFloat(proposedChanges.fields[key]);
                    if (!isNaN(val)) {
                        newCost = val;
                        break;
                    }
                }
            }
        }

        // Format 3: Changes array from frontend — [{ field: 'Cost', oldValue: '100', newValue: '150' }]
        if (newCost === null && Array.isArray(proposedChanges)) {
            for (const change of proposedChanges) {
                const fieldLower = (change.field || '').toLowerCase().replace(/\s+/g, '');
                if (costKeys.includes(fieldLower) || costFieldLabels.map(l => l.toLowerCase().replace(/\s+/g, '')).includes(fieldLower)) {
                    const val = parseFloat(change.newValue || change.value);
                    if (!isNaN(val)) {
                        newCost = val;
                        break;
                    }
                }
            }
        }

        // Format 4: Changes array nested — { changes: [{ field: 'cost', value: 100 }] }
        if (newCost === null && !Array.isArray(proposedChanges) && Array.isArray((proposedChanges as any).changes)) {
            for (const change of (proposedChanges as any).changes) {
                if (costKeys.includes(change.field) && change.value !== undefined) {
                    const val = parseFloat(change.value);
                    if (!isNaN(val)) {
                        newCost = val;
                        break;
                    }
                }
            }
        }

        // Format 5: Seed data format — { 'Unit Cost': { from: 125, to: 185 } }
        if (newCost === null && typeof proposedChanges === 'object' && !Array.isArray(proposedChanges)) {
            for (const key of Object.keys(proposedChanges)) {
                const keyLower = key.toLowerCase().replace(/\s+/g, '');
                if (costKeys.includes(keyLower) || costFieldLabels.map(l => l.toLowerCase().replace(/\s+/g, '')).includes(keyLower)) {
                    const entry = proposedChanges[key];
                    if (entry && typeof entry === 'object') {
                        const val = parseFloat(entry.to ?? entry.newValue ?? entry.value);
                        if (!isNaN(val)) {
                            newCost = val;
                            break;
                        }
                    } else {
                        const val = parseFloat(entry);
                        if (!isNaN(val)) {
                            newCost = val;
                            break;
                        }
                    }
                }
            }
        }

        if (newCost === null) {
            logger.info({ ecoId: eco.id }, 'ECO completed but no cost/price changes detected in proposedChanges');
            return;
        }

        const productId = eco.productId;

        logger.info({ ecoId: eco.id, productId, newCost }, 'Propagating ECO cost changes to product and BOMs');

        // Step 1: Update the product's cost
        await prisma.product.update({
            where: { id: productId },
            data: { cost: newCost },
        });

        logger.info({ productId, newCost }, 'Product cost updated from ECO');

        // Step 2: Find all BOMs where this product is used as a component (active/latest BOMs)
        const affectedComponents = await prisma.bOMComponent.findMany({
            where: {
                productId: productId,
                bom: {
                    OR: [
                        { status: 'Active' },
                        { isLatest: true },
                    ],
                },
            },
            include: {
                bom: {
                    include: {
                        components: {
                            include: {
                                product: { select: { id: true, sku: true, name: true, cost: true } },
                            },
                        },
                        operations: true,
                    },
                },
            },
        });

        // Deduplicate by BOM ID (a product may appear multiple times in different components)
        const processedBomIds = new Set<string>();
        const affectedBoms = affectedComponents
            .map(c => c.bom)
            .filter(bom => {
                if (processedBomIds.has(bom.id)) return false;
                processedBomIds.add(bom.id);
                return true;
            });

        if (affectedBoms.length === 0) {
            logger.info({ productId }, 'No active BOMs reference this product as a component');
            return;
        }

        logger.info(
            { productId, affectedBomCount: affectedBoms.length, bomIds: affectedBoms.map(b => b.id) },
            'Creating new BOM versions with updated costs'
        );

        // Step 3: For each affected BOM, create a new version with updated costs
        for (const bom of affectedBoms) {
            try {
                // Calculate new component costs — update unitCost for the changed product
                const newComponents = bom.components.map(comp => ({
                    productId: comp.productId,
                    quantity: comp.quantity,
                    unitCost: comp.productId === productId ? newCost! : comp.unitCost,
                }));

                // Recalculate total cost: sum of (quantity * unitCost) for components + sum of operation costs
                const componentsTotalCost = newComponents.reduce(
                    (sum, c) => sum + (c.quantity * c.unitCost),
                    0
                );
                const operationsTotalCost = bom.operations.reduce(
                    (sum: number, op: any) => sum + op.cost,
                    0
                );
                const newTotalCost = parseFloat((componentsTotalCost + operationsTotalCost).toFixed(2));

                // Generate new version - simple integer increment (1, 2, 3, ...)
                const currentVersionNum = parseInt(bom.version, 10) || 0;
                let newVersion = String(currentVersionNum + 1);

                // Check if version already exists, keep incrementing if needed
                let versionExists = await prisma.bOM.findFirst({
                    where: { productId: bom.productId, version: newVersion },
                });
                let attempts = 0;
                while (versionExists && attempts < 20) {
                    newVersion = String(parseInt(newVersion, 10) + 1);
                    versionExists = await prisma.bOM.findFirst({
                        where: { productId: bom.productId, version: newVersion },
                    });
                    attempts++;
                }

                // Mark current BOM as not latest
                await prisma.bOM.update({
                    where: { id: bom.id },
                    data: { isLatest: false },
                });

                // Create new BOM version with updated costs
                const newBom = await prisma.bOM.create({
                    data: {
                        name: `${bom.name.replace(/ \(v\d+\)$/, '')} (v${newVersion})`,
                        productId: bom.productId,
                        version: newVersion,
                        status: 'Active',
                        totalCost: newTotalCost,
                        parentId: bom.id,
                        isLatest: true,
                        components: {
                            create: newComponents,
                        },
                        operations: {
                            create: bom.operations.map((op: any) => ({
                                name: op.name,
                                workCenter: op.workCenter,
                                duration: op.duration,
                                cost: op.cost,
                                sequence: op.sequence,
                            })),
                        },
                    },
                });

                logger.info(
                    {
                        originalBomId: bom.id,
                        newBomId: newBom.id,
                        newVersion,
                        oldTotalCost: bom.totalCost,
                        newTotalCost,
                        ecoId: eco.id,
                    },
                    'New BOM version created from ECO cost propagation'
                );
            } catch (error) {
                logger.error(
                    { bomId: bom.id, ecoId: eco.id, error },
                    'Failed to create new BOM version during cost propagation'
                );
            }
        }

        // Step 4: Also update the product on the ECO itself if it's the primary product
        // (in case the ECO's product IS the BOM product, update the BOM for that product too)
        const directBoms = await prisma.bOM.findMany({
            where: {
                productId: productId,
                isLatest: true,
                id: { notIn: Array.from(processedBomIds) },
            },
            include: {
                components: true,
                operations: true,
            },
        });

        for (const bom of directBoms) {
            try {
                // Recalculate total cost with components' current costs
                const componentsTotalCost = bom.components.reduce(
                    (sum: number, c: any) => sum + (c.quantity * c.unitCost),
                    0
                );
                const operationsTotalCost = bom.operations.reduce(
                    (sum: number, op: any) => sum + op.cost,
                    0
                );
                const newTotalCost = parseFloat((componentsTotalCost + operationsTotalCost).toFixed(2));

                // Update totalCost on the BOM for the product whose cost changed
                await prisma.bOM.update({
                    where: { id: bom.id },
                    data: { totalCost: newTotalCost },
                });

                logger.info(
                    { bomId: bom.id, productId, newTotalCost, ecoId: eco.id },
                    'Updated BOM totalCost for ECO product'
                );
            } catch (error) {
                logger.error({ bomId: bom.id, error }, 'Failed to update direct BOM cost');
            }
        }

        logger.info({ ecoId: eco.id, productId, newCost }, 'ECO cost propagation completed');
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
