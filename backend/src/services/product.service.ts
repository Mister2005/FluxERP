import prisma from '../lib/db.js';
import { NotFoundError, ConflictError, ValidationError } from '../types/errors.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

// ============================================================================
// Types (aligned with Prisma schema - uses sku instead of partNumber)
// ============================================================================

export interface CreateProductInput {
    sku: string;
    name: string;
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

export interface UpdateProductInput {
    name?: string;
    description?: string;
    category?: string;
    status?: string;
    version?: string;
    unitOfMeasure?: string;
    cost?: number;
    quantity?: number;
    supplier?: string;
    attributes?: Record<string, any>;
}

export interface ProductQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Product Service
// ============================================================================

export class ProductService {
    /**
     * Create a new product
     */
    async create(data: CreateProductInput, userId: string) {
        // Check for duplicate SKU
        const existing = await prisma.product.findUnique({
            where: { sku: data.sku },
        });

        if (existing) {
            throw new ConflictError(`Product with SKU ${data.sku} already exists`);
        }

        const product = await prisma.product.create({
            data: {
                sku: data.sku,
                name: data.name,
                description: data.description,
                category: data.category,
                status: data.status || 'Active',
                version: data.version,
                unitOfMeasure: data.unitOfMeasure || 'EA',
                cost: data.cost,
                quantity: data.quantity || 0,
                supplier: data.supplier,
                attributes: data.attributes ? JSON.stringify(data.attributes) : null,
            },
        });

        logger.info({ productId: product.id, sku: product.sku }, 'Product created');
        return product;
    }

    /**
     * Get all products with pagination and filtering
     */
    async findAll(options: ProductQueryOptions = {}) {
        const {
            page = 1,
            limit = 20,
            search,
            category,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = options;

        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {};

        if (search) {
            where.OR = [
                { sku: { contains: search } },
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }

        if (category) {
            where.category = category;
        }

        if (status) {
            where.status = status;
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.product.count({ where }),
        ]);

        return {
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get a single product by ID
     */
    async findById(id: string) {
        const product = await prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundError(`Product with ID ${id} not found`);
        }

        return product;
    }

    /**
     * Get a product by SKU
     */
    async findBySku(sku: string) {
        const product = await prisma.product.findUnique({
            where: { sku },
        });

        if (!product) {
            throw new NotFoundError(`Product with SKU ${sku} not found`);
        }

        return product;
    }

    /**
     * Update a product
     */
    async update(id: string, data: UpdateProductInput, userId: string) {
        const existing = await prisma.product.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError(`Product with ID ${id} not found`);
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...data,
                attributes: data.attributes ? JSON.stringify(data.attributes) : undefined,
            },
        });

        logger.info({ productId: id, updatedBy: userId }, 'Product updated');
        return product;
    }

    /**
     * Delete a product
     */
    async delete(id: string, userId: string) {
        const existing = await prisma.product.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundError(`Product with ID ${id} not found`);
        }

        // Check for dependencies (BOMs, ECOs)
        const bomCount = await prisma.bOM.count({
            where: { productId: id },
        });

        if (bomCount > 0) {
            throw new ValidationError(`Cannot delete product: ${bomCount} BOMs reference this product`);
        }

        await prisma.product.delete({
            where: { id },
        });

        logger.info({ productId: id, deletedBy: userId }, 'Product deleted');
    }

    /**
     * Get product categories for filtering
     */
    async getCategories(): Promise<string[]> {
        const results = await prisma.product.findMany({
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' },
        });

        return results.map(r => r.category);
    }

    /**
     * Get product statistics
     */
    async getStats() {
        const [total, byStatus, byCategory] = await Promise.all([
            prisma.product.count(),
            prisma.product.groupBy({
                by: ['status'],
                _count: true,
            }),
            prisma.product.groupBy({
                by: ['category'],
                _count: true,
            }),
        ]);

        return {
            total,
            byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
            byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
        };
    }

    /**
     * Check if SKU exists
     */
    async skuExists(sku: string, excludeId?: string): Promise<boolean> {
        const where: Prisma.ProductWhereInput = { sku };
        if (excludeId) {
            where.id = { not: excludeId };
        }
        const count = await prisma.product.count({ where });
        return count > 0;
    }
}

// Export singleton instance
export const productService = new ProductService();
