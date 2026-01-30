import Papa from 'papaparse';
import prisma from '../lib/db.js';
import { z } from 'zod';

// ============================================
// EXPORT SCHEMAS AND TYPES
// ============================================

export interface ProductExport {
  sku: string;
  name: string;
  description: string;
  category: string;
  status: string;
  cost: number;
  quantity: number;
  unitOfMeasure: string;
  supplier: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface BOMExport {
  bomName: string;
  productSku: string;
  productName: string;
  version: string;
  status: string;
  componentSku: string;
  componentName: string;
  componentQuantity: number;
  componentUnitCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// IMPORT SCHEMAS WITH VALIDATION
// ============================================

const ProductImportSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  category: z.string().optional().default('General'),
  status: z.string().optional().default('Active'),
  cost: z.preprocess(
    (val) => (val === '' || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'Cost must be non-negative')
  ),
  quantity: z.preprocess(
    (val) => (val === '' || val === undefined ? 0 : Number(val)),
    z.number().int().min(0, 'Quantity must be non-negative integer')
  ),
  unitOfMeasure: z.string().optional().default('pcs'),
  supplier: z.string().optional().default(''),
  version: z.string().optional().default('1.0'),
});

const BOMItemImportSchema = z.object({
  productSku: z.string().min(1, 'Product SKU is required'),
  bomName: z.string().optional().default(''),
  version: z.string().optional().default('1.0'),
  componentSku: z.string().min(1, 'Component SKU is required'),
  componentQuantity: z.preprocess(
    (val) => (val === '' || val === undefined ? 1 : Number(val)),
    z.number().positive('Component quantity must be positive')
  ),
  componentUnitCost: z.preprocess(
    (val) => (val === '' || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'Unit cost must be non-negative')
  ),
});

// ============================================
// IMPORT RESULTS
// ============================================

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, unknown>;
  }>;
  createdIds: string[];
  updatedIds: string[];
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export all products to CSV format
 */
export async function exportProducts(): Promise<string> {
  const products = await prisma.product.findMany({
    orderBy: { sku: 'asc' },
  });

  const exportData: ProductExport[] = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    description: p.description || '',
    category: p.category || 'General',
    status: p.status || 'Active',
    cost: p.cost,
    quantity: p.quantity,
    unitOfMeasure: p.unitOfMeasure || 'pcs',
    supplier: p.supplier || '',
    version: p.version || '1.0',
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return Papa.unparse(exportData, {
    header: true,
    quotes: true,
  });
}

/**
 * Export all BOMs with components to CSV format
 */
export async function exportBOMs(): Promise<string> {
  const boms = await prisma.bOM.findMany({
    include: {
      product: true,
      components: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const exportData: BOMExport[] = [];

  for (const bom of boms) {
    if (bom.components.length === 0) {
      // Export BOM even without components
      exportData.push({
        bomName: bom.name,
        productSku: bom.product.sku,
        productName: bom.product.name,
        version: bom.version,
        status: bom.status,
        componentSku: '',
        componentName: '',
        componentQuantity: 0,
        componentUnitCost: 0,
        totalCost: bom.totalCost,
        createdAt: bom.createdAt.toISOString(),
        updatedAt: bom.updatedAt.toISOString(),
      });
    } else {
      for (const comp of bom.components) {
        exportData.push({
          bomName: bom.name,
          productSku: bom.product.sku,
          productName: bom.product.name,
          version: bom.version,
          status: bom.status,
          componentSku: comp.product.sku,
          componentName: comp.product.name,
          componentQuantity: comp.quantity,
          componentUnitCost: comp.unitCost,
          totalCost: bom.totalCost,
          createdAt: bom.createdAt.toISOString(),
          updatedAt: bom.updatedAt.toISOString(),
        });
      }
    }
  }

  return Papa.unparse(exportData, {
    header: true,
    quotes: true,
  });
}

/**
 * Export ECOs to CSV format
 */
export async function exportECOs(): Promise<string> {
  const ecos = await prisma.eCO.findMany({
    include: {
      product: true,
      requestedBy: {
        select: { name: true, email: true },
      },
      approvedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const exportData = ecos.map((eco) => ({
    id: eco.id,
    title: eco.title,
    description: eco.description || '',
    reason: eco.reason || '',
    type: eco.type,
    status: eco.status,
    priority: eco.priority,
    version: eco.version,
    productSku: eco.product?.sku || '',
    productName: eco.product?.name || '',
    requestedBy: eco.requestedBy?.name || eco.requestedByName || '',
    requestedByEmail: eco.requestedBy?.email || '',
    approvedBy: eco.approvedBy?.name || '',
    approvedByEmail: eco.approvedBy?.email || '',
    effectiveDate: eco.effectiveDate?.toISOString() || '',
    approvalDate: eco.approvalDate?.toISOString() || '',
    proposedChanges: eco.proposedChanges || '',
    impactAnalysis: eco.impactAnalysis || '',
    aiRiskScore: eco.aiRiskScore || '',
    createdAt: eco.createdAt.toISOString(),
    updatedAt: eco.updatedAt.toISOString(),
  }));

  return Papa.unparse(exportData, {
    header: true,
    quotes: true,
  });
}

/**
 * Export work orders to CSV format
 */
export async function exportWorkOrders(): Promise<string> {
  const workOrders = await prisma.workOrder.findMany({
    include: {
      product: true,
      bom: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const exportData = workOrders.map((wo) => ({
    id: wo.id,
    name: wo.name || '',
    productSku: wo.product.sku,
    productName: wo.product.name,
    bomId: wo.bomId || '',
    bomVersion: wo.bom?.version || '',
    quantity: wo.quantity,
    status: wo.status,
    priority: wo.priority,
    progress: wo.progress,
    scheduledStart: wo.scheduledStart?.toISOString() || '',
    scheduledEnd: wo.scheduledEnd?.toISOString() || '',
    actualStart: wo.actualStart?.toISOString() || '',
    actualEnd: wo.actualEnd?.toISOString() || '',
    scrapCount: wo.scrapCount,
    reworkCount: wo.reworkCount,
    createdAt: wo.createdAt.toISOString(),
    updatedAt: wo.updatedAt.toISOString(),
  }));

  return Papa.unparse(exportData, {
    header: true,
    quotes: true,
  });
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Import products from CSV data
 * @param csvData - Raw CSV string
 * @param options - Import options
 */
export async function importProducts(
  csvData: string,
  options: { updateExisting?: boolean } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    successfulRows: 0,
    failedRows: 0,
    errors: [],
    createdIds: [],
    updatedIds: [],
  };

  // Parse CSV
  const parsed = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    result.errors.push(
      ...parsed.errors.map((e) => ({
        row: e.row || 0,
        message: e.message,
      }))
    );
    return result;
  }

  result.totalRows = parsed.data.length;

  // Process each row
  for (let i = 0; i < parsed.data.length; i++) {
    const rowNum = i + 2; // Account for header row
    const row = parsed.data[i];

    try {
      // Validate row
      const validated = ProductImportSchema.parse(row);

      // Check if product exists
      const existing = await prisma.product.findUnique({
        where: { sku: validated.sku },
      });

      if (existing) {
        if (options.updateExisting) {
          // Update existing product
          const updated = await prisma.product.update({
            where: { sku: validated.sku },
            data: {
              name: validated.name,
              description: validated.description,
              category: validated.category,
              status: validated.status,
              cost: validated.cost,
              quantity: validated.quantity,
              unitOfMeasure: validated.unitOfMeasure,
              supplier: validated.supplier,
              version: validated.version,
            },
          });
          result.updatedIds.push(updated.id);
          result.successfulRows++;
        } else {
          result.errors.push({
            row: rowNum,
            field: 'sku',
            message: `Product with SKU "${validated.sku}" already exists`,
            data: row,
          });
          result.failedRows++;
        }
      } else {
        // Create new product
        const created = await prisma.product.create({
          data: {
            sku: validated.sku,
            name: validated.name,
            description: validated.description,
            category: validated.category,
            status: validated.status,
            cost: validated.cost,
            quantity: validated.quantity,
            unitOfMeasure: validated.unitOfMeasure,
            supplier: validated.supplier,
            version: validated.version,
          },
        });
        result.createdIds.push(created.id);
        result.successfulRows++;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors.push(
          ...error.errors.map((e) => ({
            row: rowNum,
            field: e.path.join('.'),
            message: e.message,
            data: row,
          }))
        );
      } else {
        result.errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
      }
      result.failedRows++;
    }
  }

  result.success = result.failedRows === 0;
  return result;
}

/**
 * Import BOMs from CSV data
 * Each row represents a BOM item (product-component relationship)
 * @param csvData - Raw CSV string
 */
export async function importBOMs(csvData: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    successfulRows: 0,
    failedRows: 0,
    errors: [],
    createdIds: [],
    updatedIds: [],
  };

  // Parse CSV
  const parsed = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    result.errors.push(
      ...parsed.errors.map((e) => ({
        row: e.row || 0,
        message: e.message,
      }))
    );
    return result;
  }

  result.totalRows = parsed.data.length;

  // Group items by productSku+version to create/update BOMs
  const bomGroups = new Map<string, Array<{ row: number; data: Record<string, string> }>>();

  for (let i = 0; i < parsed.data.length; i++) {
    const rowNum = i + 2;
    const row = parsed.data[i];
    const key = `${row.productSku || ''}_${row.version || '1.0'}`;

    if (!bomGroups.has(key)) {
      bomGroups.set(key, []);
    }
    bomGroups.get(key)!.push({ row: rowNum, data: row });
  }

  // Process each BOM group
  for (const [key, items] of bomGroups) {
    const [productSku, version] = key.split('_');

    try {
      // Find the product
      const product = await prisma.product.findUnique({
        where: { sku: productSku },
      });

      if (!product) {
        for (const item of items) {
          result.errors.push({
            row: item.row,
            field: 'productSku',
            message: `Product with SKU "${productSku}" not found`,
            data: item.data,
          });
          result.failedRows++;
        }
        continue;
      }

      // Check if BOM exists for this product+version
      let bom = await prisma.bOM.findFirst({
        where: {
          productId: product.id,
          version: version,
        },
      });

      const bomComponents: Array<{ componentId: string; quantity: number; unitCost: number }> = [];

      // Validate and collect all BOM items
      let hasErrors = false;
      for (const item of items) {
        try {
          const validated = BOMItemImportSchema.parse(item.data);

          // Skip empty component rows
          if (!validated.componentSku) {
            result.successfulRows++;
            continue;
          }

          // Find the component
          const component = await prisma.product.findUnique({
            where: { sku: validated.componentSku },
          });

          if (!component) {
            result.errors.push({
              row: item.row,
              field: 'componentSku',
              message: `Component with SKU "${validated.componentSku}" not found`,
              data: item.data,
            });
            result.failedRows++;
            hasErrors = true;
            continue;
          }

          bomComponents.push({
            componentId: component.id,
            quantity: validated.componentQuantity,
            unitCost: validated.componentUnitCost || component.cost,
          });
          result.successfulRows++;
        } catch (error) {
          if (error instanceof z.ZodError) {
            result.errors.push(
              ...error.errors.map((e) => ({
                row: item.row,
                field: e.path.join('.'),
                message: e.message,
                data: item.data,
              }))
            );
          } else {
            result.errors.push({
              row: item.row,
              message: error instanceof Error ? error.message : 'Unknown error',
              data: item.data,
            });
          }
          result.failedRows++;
          hasErrors = true;
        }
      }

      if (hasErrors && bomComponents.length === 0) {
        continue;
      }

      // Calculate total cost
      let totalCost = 0;
      for (const comp of bomComponents) {
        totalCost += comp.unitCost * comp.quantity;
      }

      // Get BOM name from first item or generate one
      const bomName = items[0]?.data.bomName || `BOM-${product.sku}-${version}`;

      if (bom) {
        // Update existing BOM - clear old components and add new
        await prisma.bOMComponent.deleteMany({
          where: { bomId: bom.id },
        });

        await prisma.bOM.update({
          where: { id: bom.id },
          data: {
            name: bomName,
            totalCost,
            components: {
              create: bomComponents.map((comp) => ({
                productId: comp.componentId,
                quantity: comp.quantity,
                unitCost: comp.unitCost,
              })),
            },
          },
        });
        result.updatedIds.push(bom.id);
      } else {
        // Create new BOM
        bom = await prisma.bOM.create({
          data: {
            name: bomName,
            productId: product.id,
            version,
            status: 'Draft',
            totalCost,
            components: {
              create: bomComponents.map((comp) => ({
                productId: comp.componentId,
                quantity: comp.quantity,
                unitCost: comp.unitCost,
              })),
            },
          },
        });
        result.createdIds.push(bom.id);
      }
    } catch (error) {
      for (const item of items) {
        result.errors.push({
          row: item.row,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: item.data,
        });
        result.failedRows++;
      }
    }
  }

  result.success = result.failedRows === 0;
  return result;
}

/**
 * Generate a sample CSV template for product import
 */
export function getProductTemplate(): string {
  const sampleData = [
    {
      sku: 'SAMPLE-001',
      name: 'Sample Product 1',
      description: 'This is a sample product description',
      category: 'Electronics',
      status: 'Active',
      cost: 29.99,
      quantity: 100,
      unitOfMeasure: 'pcs',
      supplier: 'Acme Corp',
      version: '1.0',
    },
    {
      sku: 'SAMPLE-002',
      name: 'Sample Product 2',
      description: 'Another sample product',
      category: 'Mechanical',
      status: 'Active',
      cost: 49.99,
      quantity: 50,
      unitOfMeasure: 'pcs',
      supplier: '',
      version: '1.0',
    },
  ];

  return Papa.unparse(sampleData, {
    header: true,
    quotes: true,
  });
}

/**
 * Generate a sample CSV template for BOM import
 */
export function getBOMTemplate(): string {
  const sampleData = [
    {
      productSku: 'PROD-001',
      bomName: 'Main Assembly BOM',
      version: '1.0',
      componentSku: 'COMP-001',
      componentQuantity: 2,
      componentUnitCost: 10.50,
    },
    {
      productSku: 'PROD-001',
      bomName: 'Main Assembly BOM',
      version: '1.0',
      componentSku: 'COMP-002',
      componentQuantity: 4,
      componentUnitCost: 5.25,
    },
    {
      productSku: 'PROD-002',
      bomName: 'Secondary Assembly',
      version: '1.0',
      componentSku: 'COMP-003',
      componentQuantity: 1,
      componentUnitCost: 25.00,
    },
  ];

  return Papa.unparse(sampleData, {
    header: true,
    quotes: true,
  });
}
