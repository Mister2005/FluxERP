import { Router } from 'express';
import prisma from '../lib/db.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { successResponse } from '../utils/helpers.js';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// ============================================================================
// Dashboard & Reports Routes
// ============================================================================

/**
 * GET /api/reports/dashboard
 * Get dashboard overview statistics
 */
router.get('/dashboard',
    requirePermission('reports.read'),
    catchAsync(async (req, res) => {
        // Gather all stats in parallel
        const [
            productCount,
            ecoStats,
            bomCount,
            workOrderStats,
            supplierCount,
            recentECOs,
            recentWorkOrders
        ] = await Promise.all([
            // Product count
            prisma.product.count(),
            
            // ECO stats
            prisma.eCO.groupBy({
                by: ['status'],
                where: { isLatest: true },
                _count: true,
            }),
            
            // BOM count (Active status)
            prisma.bOM.count({ where: { status: 'Active' } }),
            
            // Work order stats
            prisma.workOrder.groupBy({
                by: ['status'],
                _count: true,
            }),
            
            // Supplier count (no status field in actual schema)
            prisma.supplier.count(),
            
            // Recent ECOs
            prisma.eCO.findMany({
                where: { isLatest: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    createdAt: true,
                    product: {
                        select: { sku: true, name: true },
                    },
                },
            }),
            
            // Recent work orders
            prisma.workOrder.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    status: true,
                    priority: true,
                    scheduledStart: true,
                    product: {
                        select: { sku: true, name: true },
                    },
                },
            }),
        ]);

        // Process ECO stats
        const ecoByStatus: Record<string, number> = {};
        ecoStats.forEach(s => { ecoByStatus[s.status] = s._count; });
        const activeECOs = (ecoByStatus['submitted'] || 0) + 
                          (ecoByStatus['under_review'] || 0) + 
                          (ecoByStatus['approved'] || 0) + 
                          (ecoByStatus['implementing'] || 0);

        // Process work order stats
        const woByStatus: Record<string, number> = {};
        workOrderStats.forEach(s => { woByStatus[s.status] = s._count; });
        const activeWorkOrders = (woByStatus['scheduled'] || 0) + 
                                 (woByStatus['in-progress'] || 0);

        const dashboard = {
            summary: {
                totalProducts: productCount,
                activeBOMs: bomCount,
                activeECOs,
                activeWorkOrders,
                activeSuppliers: supplierCount,
            },
            ecosByStatus: ecoByStatus,
            workOrdersByStatus: woByStatus,
            recentActivity: {
                ecos: recentECOs,
                workOrders: recentWorkOrders,
            },
        };

        res.json(successResponse(dashboard));
    })
);

/**
 * GET /api/reports/eco-summary
 * Get ECO summary report
 */
router.get('/eco-summary',
    requirePermission('reports.read'),
    catchAsync(async (req, res) => {
        const { from, to } = req.query;
        
        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from as string);
        if (to) dateFilter.lte = new Date(to as string);

        const where = Object.keys(dateFilter).length > 0 
            ? { createdAt: dateFilter, isLatest: true }
            : { isLatest: true };

        const [
            byStatus,
            byPriority,
            byType,
            avgProcessingTime,
            total
        ] = await Promise.all([
            prisma.eCO.groupBy({
                by: ['status'],
                where,
                _count: true,
            }),
            prisma.eCO.groupBy({
                by: ['priority'],
                where,
                _count: true,
            }),
            // ECO uses 'type' not 'changeType' in schema
            prisma.eCO.groupBy({
                by: ['type'],
                where,
                _count: true,
            }),
            // Get completed ECOs to calculate avg processing time
            prisma.eCO.findMany({
                where: { ...where, status: 'completed' },
                select: { createdAt: true, updatedAt: true },
            }),
            prisma.eCO.count({ where }),
        ]);

        // Calculate average processing time
        let avgDays = 0;
        if (avgProcessingTime.length > 0) {
            const totalDays = avgProcessingTime.reduce((sum, eco) => {
                const days = Math.ceil(
                    (new Date(eco.updatedAt).getTime() - new Date(eco.createdAt).getTime()) 
                    / (1000 * 60 * 60 * 24)
                );
                return sum + days;
            }, 0);
            avgDays = Math.round(totalDays / avgProcessingTime.length);
        }

        res.json(successResponse({
            total,
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
            byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
            byType: byType.map(t => ({ type: t.type, count: t._count })),
            averageProcessingDays: avgDays,
        }));
    })
);

/**
 * GET /api/reports/production
 * Get production/work order report
 */
router.get('/production',
    requirePermission('reports.read'),
    catchAsync(async (req, res) => {
        const [
            byStatus,
            byPriority,
            completed,
            upcoming
        ] = await Promise.all([
            prisma.workOrder.groupBy({
                by: ['status'],
                _count: true,
            }),
            prisma.workOrder.groupBy({
                by: ['priority'],
                _count: true,
            }),
            // WorkOrder doesn't have completedQuantity/scrapQuantity - use progress/scrapCount/reworkCount
            prisma.workOrder.findMany({
                where: { status: 'completed' },
                select: {
                    scheduledEnd: true,
                    actualEnd: true,
                    quantity: true,
                    progress: true,
                    scrapCount: true,
                    reworkCount: true,
                },
            }),
            // Upcoming work orders
            prisma.workOrder.count({
                where: {
                    status: { in: ['planned', 'scheduled'] },
                    scheduledStart: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);

        // Calculate efficiency metrics
        let onTimeCount = 0;
        let totalQuantity = 0;
        let totalScrap = 0;
        let totalRework = 0;

        completed.forEach(wo => {
            if (wo.scheduledEnd && wo.actualEnd && wo.actualEnd <= wo.scheduledEnd) {
                onTimeCount++;
            }
            totalQuantity += wo.quantity;
            totalScrap += wo.scrapCount;
            totalRework += wo.reworkCount;
        });

        const onTimeRate = completed.length > 0 
            ? ((onTimeCount / completed.length) * 100).toFixed(1) 
            : '0';
        const scrapRate = totalQuantity > 0 
            ? ((totalScrap / totalQuantity) * 100).toFixed(1) 
            : '0';
        const reworkRate = totalQuantity > 0 
            ? ((totalRework / totalQuantity) * 100).toFixed(1) 
            : '0';

        res.json(successResponse({
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
            byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
            metrics: {
                onTimeCompletionRate: `${onTimeRate}%`,
                scrapRate: `${scrapRate}%`,
                reworkRate: `${reworkRate}%`,
                upcomingOrders: upcoming,
            },
        }));
    })
);

/**
 * GET /api/reports/supplier-quality
 * Get supplier quality report
 */
router.get('/supplier-quality',
    requirePermission('reports.read'),
    catchAsync(async (req, res) => {
        const [
            suppliers,
            defectsBySupplier,
            defectsBySeverity
        ] = await Promise.all([
            // Get suppliers (no rating/code/status in actual schema)
            prisma.supplier.findMany({
                select: {
                    id: true,
                    name: true,
                    leadTimeDays: true,
                    defectRate: true,
                    onTimeDeliveryRate: true,
                },
                orderBy: { defectRate: 'asc' }, // Lower defect = better
            }),
            // Use Defect model, not supplierDefect
            prisma.defect.groupBy({
                by: ['supplierId'],
                where: { supplierId: { not: null } },
                _count: true,
            }),
            // Defects by severity
            prisma.defect.groupBy({
                by: ['severity'],
                _count: true,
            }),
        ]);

        // Map defect counts to suppliers
        const defectMap = Object.fromEntries(
            defectsBySupplier.map(d => [d.supplierId, d._count])
        );

        const supplierQuality = suppliers.map(s => ({
            ...s,
            defectCount: defectMap[s.id] || 0,
        }));

        // Calculate average on-time delivery rate
        const avgOnTimeRate = suppliers.length > 0
            ? (suppliers.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / suppliers.length).toFixed(1)
            : '0';

        res.json(successResponse({
            suppliers: supplierQuality,
            defectsBySeverity: defectsBySeverity.map(d => ({
                severity: d.severity,
                count: d._count,
            })),
            averageOnTimeDeliveryRate: `${avgOnTimeRate}%`,
        }));
    })
);

export default router;
