import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data in correct order (child records first)
    console.log('🗑️  Clearing existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.defect.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.bOMOperation.deleteMany();
    await prisma.bOMComponent.deleteMany();
    await prisma.eCOComment.deleteMany(); // Delete ECO comments first
    await prisma.eCO.deleteMany(); // Delete ECOs after comments and work orders
    await prisma.bOM.deleteMany();
    await prisma.product.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.user.deleteMany(); // Delete users after ECOs (which reference users)
    await prisma.iAMRole.deleteMany();

    // Hash password for demo users
    const hashedPassword = await bcrypt.hash('demo123', 10);

    // Create IAM Roles
    const adminRole = await prisma.iAMRole.create({
        data: {
            id: 'role-admin',
            name: 'Administrator',
            description: 'Full system access',
            isSystem: true,
            permissions: JSON.stringify([
                'products.view', 'products.create', 'products.edit', 'products.delete', 'products.export',
                'boms.view', 'boms.create', 'boms.edit', 'boms.delete', 'boms.canvas',
                'ecos.view', 'ecos.create', 'ecos.edit', 'ecos.delete', 'ecos.submit', 'ecos.review', 'ecos.approve', 'ecos.reject', 'ecos.apply',
                'reports.view', 'reports.export',
                'settings.view', 'settings.edit', 'settings.iam',
                'users.view', 'users.create', 'users.edit', 'users.delete', 'users.roles'
            ]),
        },
    });

    const engineeringRole = await prisma.iAMRole.create({
        data: {
            id: 'role-engineering',
            name: 'Engineering',
            description: 'Engineering team access',
            isSystem: true,
            permissions: JSON.stringify([
                'products.view', 'products.create', 'products.edit',
                'boms.view', 'boms.create', 'boms.edit', 'boms.canvas',
                'ecos.view', 'ecos.create', 'ecos.edit',
                'reports.view'
            ]),
        },
    });

    const approverRole = await prisma.iAMRole.create({
        data: {
            id: 'role-approver',
            name: 'Approver',
            description: 'ECO approval authority',
            isSystem: true,
            permissions: JSON.stringify([
                'products.view',
                'boms.view',
                'ecos.view', 'ecos.review', 'ecos.approve', 'ecos.reject',
                'reports.view'
            ]),
        },
    });

    const operationsRole = await prisma.iAMRole.create({
        data: {
            id: 'role-operations',
            name: 'Operations',
            description: 'Operations team access',
            isSystem: true,
            permissions: JSON.stringify([
                'products.view',
                'boms.view',
                'ecos.view', 'ecos.submit',
                'reports.view'
            ]),
        },
    });

    console.log('✅ Created IAM Roles');

    // Create Users
    const adminUser = await prisma.user.create({
        data: {
            id: 'user-admin-001',
            email: 'priya.sharma@adani.com',
            password: hashedPassword,
            name: 'Priya Sharma',
            roleId: adminRole.id,
            isActive: true,
        },
    });

    const engineerUser = await prisma.user.create({
        data: {
            id: 'user-eng-001',
            email: 'rajesh.kumar@adani.com',
            password: hashedPassword,
            name: 'Rajesh Kumar',
            roleId: approverRole.id,
            isActive: true,
        },
    });

    const approverUser = await prisma.user.create({
        data: {
            id: 'user-appr-001',
            email: 'amit.patel@adani.com',
            password: hashedPassword,
            name: 'Amit Patel',
            roleId: approverRole.id,
            isActive: true,
        },
    });

    const opsUser = await prisma.user.create({
        data: {
            id: 'user-ops-001',
            email: 'sneha.desai@adani.com',
            password: hashedPassword,
            name: 'Sneha Desai',
            roleId: operationsRole.id,
            isActive: true,
        },
    });

    console.log('✅ Created Users (password: demo123)');

    // Create Products
    const products = await Promise.all([
        prisma.product.create({
            data: {
                id: 'prod-001',
                name: 'Electric Motor Assembly A1',
                sku: 'EMA-A1-001',
                description: 'High-efficiency electric motor assembly',
                category: 'Assemblies',
                status: 'active',
                version: '2',
                unitOfMeasure: 'unit',
                cost: 450,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-002',
                name: 'Control Panel CP-200',
                sku: 'CP-200-002',
                description: 'Digital control panel with touchscreen',
                category: 'Electronics',
                status: 'active',
                version: '2',
                unitOfMeasure: 'unit',
                cost: 900,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-003',
                name: 'Stainless Steel Shaft SS-50',
                sku: 'SS-50-003',
                description: 'Precision-machined stainless steel shaft',
                category: 'Components',
                status: 'active',
                version: '1',
                unitOfMeasure: 'unit',
                cost: 75.5,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-004',
                name: 'Bearing Set BS-100',
                sku: 'BS-100-004',
                description: 'Industrial-grade bearing set',
                category: 'Components',
                status: 'active',
                version: '3',
                unitOfMeasure: 'set',
                cost: 150,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-005',
                name: 'Power Supply Unit PSU-500',
                sku: 'PSU-500-005',
                description: '500W industrial power supply',
                category: 'Electronics',
                status: 'active',
                version: '2',
                unitOfMeasure: 'unit',
                cost: 320,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-006',
                name: 'Aluminum Housing AH-300',
                sku: 'AH-300-006',
                description: 'Die-cast aluminum housing IP65',
                category: 'Components',
                status: 'active',
                version: '1',
                unitOfMeasure: 'unit',
                cost: 180,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-007',
                name: 'Cooling Fan Assembly CFA-150',
                sku: 'CFA-150-007',
                description: 'High-flow cooling fan assembly',
                category: 'Assemblies',
                status: 'draft',
                version: '2',
                unitOfMeasure: 'unit',
                cost: 95,
            },
        }),
        prisma.product.create({
            data: {
                id: 'prod-008',
                name: 'Copper Wire Bundle CWB-10',
                sku: 'CWB-10-008',
                description: 'Premium copper wire for motor winding',
                category: 'Raw Materials',
                status: 'active',
                version: '1',
                unitOfMeasure: 'kg',
                cost: 45,
            },
        }),
    ]);

    console.log('✅ Created Products');

    // Create BOMs
    const bom001 = await prisma.bOM.create({
        data: {
            id: 'bom-001',
            name: 'Motor Assembly BoM v5',
            productId: 'prod-001',
            version: '5',
            status: 'active',
            totalCost: 1600.25,
            components: {
                create: [
                    { productId: 'prod-003', quantity: 1, unitCost: 75.5 },
                    { productId: 'prod-004', quantity: 2, unitCost: 125 },
                    { productId: 'prod-006', quantity: 1, unitCost: 180 },
                    { productId: 'prod-008', quantity: 3.5, unitCost: 38.5 },
                ],
            },
            operations: {
                create: [
                    { name: 'Shaft Preparation', workCenter: 'Machining Center A', duration: 30, cost: 45, sequence: 1 },
                    { name: 'Winding Installation', workCenter: 'Assembly Line 1', duration: 45, cost: 67.5, sequence: 2 },
                    { name: 'Bearing Press-Fit', workCenter: 'Press Station B', duration: 15, cost: 22.5, sequence: 3 },
                    { name: 'Final Assembly', workCenter: 'Assembly Line 1', duration: 25, cost: 37.5, sequence: 4 },
                    { name: 'Quality Testing', workCenter: 'QC Station', duration: 20, cost: 30, sequence: 5 },
                ],
            },
        },
    });

    const bom002 = await prisma.bOM.create({
        data: {
            id: 'bom-002',
            name: 'Control Panel BoM v3',
            productId: 'prod-002',
            version: '3',
            status: 'active',
            totalCost: 830,
            components: {
                create: [
                    { productId: 'prod-005', quantity: 1, unitCost: 320 },
                    { productId: 'prod-006', quantity: 1, unitCost: 180 },
                ],
            },
            operations: {
                create: [
                    { name: 'PCB Assembly', workCenter: 'SMT Line 1', duration: 60, cost: 90, sequence: 1 },
                    { name: 'Wiring Installation', workCenter: 'Wiring Station', duration: 40, cost: 60, sequence: 2 },
                    { name: 'Panel Integration', workCenter: 'Assembly Line 2', duration: 35, cost: 52.5, sequence: 3 },
                    { name: 'Programming', workCenter: 'Programming Station', duration: 25, cost: 75, sequence: 4 },
                    { name: 'Functional Testing', workCenter: 'QC Station', duration: 30, cost: 45, sequence: 5 },
                ],
            },
        },
    });

    console.log('✅ Created BOMs');

    // Create ECOs
    await prisma.eCO.create({
        data: {
            id: 'eco-001',
            title: 'Upgrade Motor Bearings to Ceramic Type',
            description: 'Replace steel bearings with ceramic bearings for improved performance and longevity',
            type: 'bom-update',
            status: 'done',
            priority: 'high',
            productId: 'prod-001',
            bomId: 'bom-001',
            requestedById: adminUser.id,
            requestedByName: adminUser.name,
            effectiveDate: new Date('2026-02-07'),
            approvalDate: new Date('2026-01-25'),
            proposedChanges: JSON.stringify({
                'Bearing Type': { from: 'Steel Bearings BS-100', to: 'Ceramic Bearings CB-100' },
                'Unit Cost': { from: 125, to: 185 },
            }),
            impactAnalysis: JSON.stringify({
                affectedProducts: ['prod-001'],
                affectedBoms: ['bom-001'],
                costImpact: { currentValue: 688.25, projectedValue: 748.25 },
            }),
            complianceChecks: JSON.stringify([
                { rule: 'Cost Impact Threshold', status: 'pass', message: 'Cost increase within limit' },
            ]),
            aiRiskScore: 35.5,
            aiPredictedDelay: 5,
            aiKeyRisks: JSON.stringify(['Supplier lead time', 'Cost increase', 'Testing requirements']),
        },
    });

    await prisma.eCO.create({
        data: {
            id: 'eco-002',
            title: 'Control Panel Software Update v2',
            description: 'Update control panel firmware to latest version with bug fixes',
            type: 'bom-update',
            status: 'approved',
            priority: 'normal',
            productId: 'prod-002',
            bomId: 'bom-002',
            requestedById: approverUser.id,
            requestedByName: approverUser.name,
            proposedChanges: JSON.stringify({
                'Firmware Version': { from: 'v1', to: 'v2' },
            }),
            impactAnalysis: JSON.stringify({
                affectedProducts: ['prod-002'],
                affectedBoms: ['bom-002'],
                costImpact: { currentValue: 822.5, projectedValue: 830 },
            }),
            complianceChecks: JSON.stringify([
                { rule: 'Software Validation', status: 'pass', message: 'Passed all tests' },
            ]),
            aiRiskScore: 15.2,
            aiPredictedDelay: 2,
            aiKeyRisks: JSON.stringify(['Testing time', 'Compatibility check']),
        },
    });

    await prisma.eCO.create({
        data: {
            id: 'eco-003',
            title: 'New Cooling Fan Design Introduction',
            description: 'Introduce new cooling fan design with improved airflow',
            type: 'new-product',
            status: 'in-review',
            priority: 'normal',
            productId: 'prod-007',
            requestedById: engineerUser.id,
            requestedByName: engineerUser.name,
            proposedChanges: JSON.stringify({
                'Fan Blade Design': { from: 'Standard 5-blade', to: 'Optimized 7-blade' },
            }),
            impactAnalysis: JSON.stringify({
                affectedProducts: ['prod-007'],
                affectedBoms: [],
                costImpact: { currentValue: 95, projectedValue: 110 },
            }),
            complianceChecks: JSON.stringify([]),
            aiRiskScore: 42.8,
            aiPredictedDelay: 7,
            aiKeyRisks: JSON.stringify(['New tooling required', 'Prototype testing', 'Certification needed']),
        },
    });

    await prisma.eCO.create({
        data: {
            id: 'eco-004',
            title: 'Cost Optimization for Power Supply',
            description: 'Source alternative supplier for power supply components',
            type: 'product-update',
            status: 'draft',
            priority: 'low',
            productId: 'prod-005',
            requestedById: opsUser.id,
            requestedByName: opsUser.name,
            proposedChanges: JSON.stringify({
                'Supplier': { from: 'Current Supplier A', to: 'New Supplier B' },
                'Unit Cost': { from: 320, to: 285 },
            }),
            impactAnalysis: JSON.stringify({
                affectedProducts: ['prod-005'],
                affectedBoms: ['bom-002'],
                costImpact: { currentValue: 320, projectedValue: 285 },
            }),
            complianceChecks: JSON.stringify([]),
            aiRiskScore: 28.3,
            aiPredictedDelay: 3,
            aiKeyRisks: JSON.stringify(['Supplier qualification', 'Quality validation']),
        },
    });

    console.log('✅ Created ECOs');

    // Create Suppliers
    await prisma.supplier.createMany({
        data: [
            {
                id: 'sup-001',
                name: 'Precision Components Ltd',
                leadTimeDays: 14,
                defectRate: 0.02,
                onTimeDeliveryRate: 0.95,
            },
            {
                id: 'sup-002',
                name: 'Electronics Supply Co',
                leadTimeDays: 21,
                defectRate: 0.01,
                onTimeDeliveryRate: 0.98,
            },
            {
                id: 'sup-003',
                name: 'Metal Works Inc',
                leadTimeDays: 10,
                defectRate: 0.03,
                onTimeDeliveryRate: 0.92,
            },
        ],
    });

    console.log('✅ Created Suppliers');

    // Create Work Orders
    await prisma.workOrder.createMany({
        data: [
            {
                id: 'wo-001',
                productId: 'prod-001',
                bomId: 'bom-001',
                name: 'Motor Assembly Batch A',
                quantity: 50,
                priority: 'high',
                scheduledStart: new Date('2026-02-01'),
                scheduledEnd: new Date('2026-02-15'),
                plannedStart: new Date('2026-02-01'),
                plannedEnd: new Date('2026-02-15'),
                actualStart: new Date('2026-02-01'),
                status: 'in-progress',
                progress: 45,
                scrapCount: 2,
                reworkCount: 1,
            },
            {
                id: 'wo-002',
                productId: 'prod-002',
                bomId: 'bom-002',
                name: 'Control Panel Production',
                quantity: 30,
                priority: 'medium',
                scheduledStart: new Date('2026-02-05'),
                scheduledEnd: new Date('2026-02-20'),
                plannedStart: new Date('2026-02-05'),
                plannedEnd: new Date('2026-02-20'),
                status: 'planned',
                progress: 0,
                scrapCount: 0,
                reworkCount: 0,
            },
            {
                id: 'wo-003',
                productId: 'prod-001',
                bomId: 'bom-001',
                name: 'Motor Assembly Batch B',
                quantity: 25,
                priority: 'low',
                scheduledStart: new Date('2026-01-15'),
                scheduledEnd: new Date('2026-01-25'),
                plannedStart: new Date('2026-01-15'),
                plannedEnd: new Date('2026-01-25'),
                actualStart: new Date('2026-01-15'),
                actualEnd: new Date('2026-01-24'),
                status: 'completed',
                progress: 100,
                scrapCount: 1,
                reworkCount: 0,
            },
        ],
    });

    console.log('✅ Created Work Orders');

    // Create Defects
    await prisma.defect.createMany({
        data: [
            {
                id: 'def-001',
                productId: 'prod-003',
                supplierId: 'sup-003',
                workOrderId: 'wo-001',
                type: 'dimensional',
                severity: 'medium',
                description: 'Shaft diameter out of tolerance',
                discoveredAt: new Date('2026-02-03'),
            },
            {
                id: 'def-002',
                productId: 'prod-005',
                supplierId: 'sup-002',
                type: 'functional',
                severity: 'low',
                description: 'Minor voltage fluctuation',
                discoveredAt: new Date('2026-01-20'),
            },
        ],
    });

    console.log('✅ Created Defects');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📝 Demo Login Credentials:');
    console.log('   Email: priya.sharma@adani.com');
    console.log('   Password: demo123');
    console.log('   Role: Administrator\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
