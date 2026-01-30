import { Request } from 'express';

// ============================================================================
// JWT & Authentication Types
// ============================================================================

export interface JWTPayload {
    userId: string;
    email: string;
    roleId?: string;
    role?: string; // Role name for easier access
}

export interface AuthRequest extends Request {
    user?: JWTPayload;
    requestId?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    message?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Entity Types (matching Prisma models)
// ============================================================================

export interface User {
    id: string;
    email: string;
    name: string;
    roleId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    role?: IAMRole;
}

export interface IAMRole {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions: string; // JSON array
    createdAt: Date;
    updatedAt: Date;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    description: string;
    category: string;
    status: string;
    version?: string | null;
    unitOfMeasure?: string | null;
    cost: number;
    quantity: number;
    supplier?: string | null;
    attributes?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface BOM {
    id: string;
    name: string;
    productId: string;
    version: string;
    parentId?: string | null;
    isLatest: boolean;
    status: string;
    totalCost: number;
    createdAt: Date;
    updatedAt: Date;
    product?: Product;
    components?: BOMComponent[];
    operations?: BOMOperation[];
}

export interface BOMComponent {
    id: string;
    bomId: string;
    productId: string;
    quantity: number;
    unitCost: number;
    createdAt: Date;
    product?: Product;
}

export interface BOMOperation {
    id: string;
    bomId: string;
    name: string;
    workCenter: string;
    duration: number;
    cost: number;
    sequence: number;
    createdAt: Date;
}

export interface ECO {
    id: string;
    title: string;
    description: string;
    reason?: string | null;
    type: string;
    status: ECOStatus;
    priority: Priority;
    version: number;
    parentId?: string | null;
    isLatest: boolean;
    productId?: string | null;
    bomId?: string | null;
    requestedById: string;
    requestedByName: string;
    approvedById?: string | null;
    executedById?: string | null;
    executedAt?: Date | null;
    effectiveDate?: Date | null;
    approvalDate?: Date | null;
    proposedChanges: string;
    impactAnalysis: string;
    complianceChecks: string;
    aiRiskScore?: number | null;
    aiPredictedDelay?: number | null;
    aiKeyRisks?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ECOComment {
    id: string;
    content: string;
    userId: string;
    ecoId: string;
    createdAt: Date;
    user?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface WorkOrder {
    id: string;
    productId: string;
    bomId?: string | null;
    name?: string | null;
    quantity: number;
    priority: string;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
    actualStart?: Date | null;
    actualEnd?: Date | null;
    status: string;
    progress: number;
    scrapCount: number;
    reworkCount: number;
    createdAt: Date;
    updatedAt: Date;
    product?: Product;
    bom?: BOM;
}

export interface Supplier {
    id: string;
    name: string;
    leadTimeDays: number;
    defectRate: number;
    onTimeDeliveryRate: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Defect {
    id: string;
    productId?: string | null;
    supplierId?: string | null;
    workOrderId?: string | null;
    type: string;
    severity: string;
    description: string;
    discoveredAt: Date;
    createdAt: Date;
}

export interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: string | null;
    timestamp: Date;
    user?: Pick<User, 'name' | 'email'>;
}

// ============================================================================
// Enums
// ============================================================================

export type ECOStatus = 'draft' | 'in-review' | 'approved' | 'rejected' | 'implemented';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type ProductStatus = 'active' | 'inactive' | 'discontinued' | 'draft';

// ============================================================================
// Service Layer Types
// ============================================================================

export interface CreateECOInput {
    title: string;
    description: string;
    reason?: string;
    type: string;
    priority: Priority;
    productId?: string;
    bomId?: string;
    proposedChanges?: Array<{ field: string; oldValue: string; newValue: string }>;
    impactAnalysis?: {
        riskScore?: number;
        predictedDelay?: number;
        riskFactors?: string[];
    };
}

export interface UpdateECOInput extends Partial<CreateECOInput> {
    status?: ECOStatus;
}

export interface CreateProductInput {
    name: string;
    sku: string;
    description: string;
    category: string;
    status?: string;
    version?: string;
    unitOfMeasure?: string;
    cost: number;
    quantity?: number;
    supplier?: string;
    attributes?: Record<string, any>;
}

export interface CreateBOMInput {
    name: string;
    productId: string;
    version?: string;
    status?: string;
    components: Array<{
        productId: string;
        quantity: number;
        unitCost: number;
    }>;
    operations?: Array<{
        name: string;
        workCenter: string;
        duration: number;
        cost: number;
        sequence: number;
    }>;
}

export interface CreateWorkOrderInput {
    productId: string;
    bomId?: string;
    name?: string;
    quantity: number;
    priority?: Priority;
    scheduledStart?: Date;
    scheduledEnd?: Date;
}

export interface CreateSupplierInput {
    name: string;
    leadTimeDays: number;
    defectRate: number;
    onTimeDeliveryRate: number;
}

// ============================================================================
// AI Types
// ============================================================================

export interface RiskAnalysisResult {
    riskScore: number;
    predictedDelay: number;
    riskFactors: string[];
}

export interface AIAnalysisInput {
    title: string;
    description: string;
    reason?: string;
    priority: string;
    changes?: Array<{ field: string; oldValue: string; newValue: string }>;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string;
}

export type CacheKey = 
    | `products:list`
    | `products:${string}`
    | `boms:list`
    | `boms:${string}`
    | `ecos:list`
    | `ecos:${string}`
    | `suppliers:list`
    | `suppliers:${string}`
    | `roles:list`
    | `roles:${string}`
    | `user:permissions:${string}`;
