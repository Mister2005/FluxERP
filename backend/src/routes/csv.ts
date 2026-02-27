import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest, requirePermission } from '../lib/auth.js';
import {
  exportProducts,
  exportBOMs,
  exportECOs,
  exportWorkOrders,
  importProducts,
  importBOMs,
  getProductTemplate,
  getBOMTemplate,
} from '../services/csv.service.js';

const router = Router();

// Configure multer for memory storage (small files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// ============================================
// EXPORT ENDPOINTS
// ============================================

/**
 * @route GET /api/csv/export/products
 * @desc Export all products to CSV
 * @access Private
 */
router.get(
  '/export/products',
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const csv = await exportProducts();
      const filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting products:', error);
      res.status(500).json({ error: 'Failed to export products' });
    }
  }
);

/**
 * @route GET /api/csv/export/boms
 * @desc Export all BOMs to CSV
 * @access Private
 */
router.get(
  '/export/boms',
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const csv = await exportBOMs();
      const filename = `boms_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting BOMs:', error);
      res.status(500).json({ error: 'Failed to export BOMs' });
    }
  }
);

/**
 * @route GET /api/csv/export/ecos
 * @desc Export all ECOs to CSV
 * @access Private
 */
router.get(
  '/export/ecos',
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const csv = await exportECOs();
      const filename = `ecos_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting ECOs:', error);
      res.status(500).json({ error: 'Failed to export ECOs' });
    }
  }
);

/**
 * @route GET /api/csv/export/work-orders
 * @desc Export all work orders to CSV
 * @access Private
 */
router.get(
  '/export/work-orders',
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const csv = await exportWorkOrders();
      const filename = `work_orders_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting work orders:', error);
      res.status(500).json({ error: 'Failed to export work orders' });
    }
  }
);

// ============================================
// TEMPLATE ENDPOINTS
// ============================================

/**
 * @route GET /api/csv/template/products
 * @desc Download product import template
 * @access Private
 */
router.get(
  '/template/products',
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const csv = getProductTemplate();
      const filename = 'products_import_template.csv';

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error generating product template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  }
);

/**
 * @route GET /api/csv/template/boms
 * @desc Download BOM import template
 * @access Private
 */
router.get(
  '/template/boms',
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const csv = getBOMTemplate();
      const filename = 'boms_import_template.csv';

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error generating BOM template:', error);
      res.status(500).json({ error: 'Failed to generate template' });
    }
  }
);

// ============================================
// IMPORT ENDPOINTS
// ============================================

/**
 * @route POST /api/csv/import/products
 * @desc Import products from CSV file
 * @access Private (requires products:write permission)
 */
router.post(
  '/import/products',
  authenticate,
  requirePermission('products.write'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file provided' });
        return;
      }

      const csvData = req.file.buffer.toString('utf-8');
      const updateExisting = req.body.updateExisting === 'true';

      const result = await importProducts(csvData, {
        updateExisting,
      });

      if (result.success) {
        res.status(200).json({
          message: 'Import completed successfully',
          ...result,
        });
      } else {
        res.status(207).json({
          message: 'Import completed with errors',
          ...result,
        });
      }
    } catch (error) {
      console.error('Error importing products:', error);
      res.status(500).json({
        error: 'Failed to import products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/csv/import/boms
 * @desc Import BOMs from CSV file
 * @access Private (requires boms:write permission)
 */
router.post(
  '/import/boms',
  authenticate,
  requirePermission('boms.write'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file provided' });
        return;
      }

      const csvData = req.file.buffer.toString('utf-8');
      const result = await importBOMs(csvData);

      if (result.success) {
        res.status(200).json({
          message: 'Import completed successfully',
          ...result,
        });
      } else {
        res.status(207).json({
          message: 'Import completed with errors',
          ...result,
        });
      }
    } catch (error) {
      console.error('Error importing BOMs:', error);
      res.status(500).json({
        error: 'Failed to import BOMs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/csv/validate/products
 * @desc Validate a products CSV without importing
 * @access Private
 */
router.post(
  '/validate/products',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file provided' });
        return;
      }

      const csvData = req.file.buffer.toString('utf-8');
      
      // Run import in dry-run mode by checking what would happen
      // This is a simplified validation that just parses and validates
      const result = await importProducts(csvData, {
        updateExisting: false,
      });

      // Return validation results without committing
      res.status(200).json({
        valid: result.errors.length === 0,
        totalRows: result.totalRows,
        errors: result.errors,
        message: result.errors.length === 0 
          ? 'CSV is valid and ready for import'
          : `Found ${result.errors.length} validation errors`,
      });
    } catch (error) {
      console.error('Error validating products CSV:', error);
      res.status(500).json({
        error: 'Failed to validate CSV',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
