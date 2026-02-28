import { Router, Response } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, AuthRequest, requirePermission } from '../lib/auth.js';
import { verifyEmailConnection, sendEmail } from '../services/email.service.js';
import { sanitizeInput } from '../utils/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// ============================================
// EMAIL SETTINGS
// ============================================

interface EmailSettings {
  smtpHost?: string;
  smtpPort?: string;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

/**
 * @swagger
 * /api/settings/email:
 *   get:
 *     tags: [Settings]
 *     summary: Get email settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current email settings (password excluded)
 */
router.get('/email', requirePermission('settings.view'), (req: AuthRequest, res: Response) => {
  // Return current email settings from environment (password excluded)
  res.json({
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpFrom: process.env.SMTP_FROM || 'FluxERP <noreply@fluxerp.com>',
    isConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
  });
});

/**
 * @swagger
 * /api/settings/email:
 *   put:
 *     tags: [Settings]
 *     summary: Update email settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               smtpHost:
 *                 type: string
 *               smtpPort:
 *                 type: string
 *               smtpSecure:
 *                 type: boolean
 *               smtpUser:
 *                 type: string
 *               smtpPass:
 *                 type: string
 *               smtpFrom:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/email', requirePermission('settings.edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom } = req.body;

    // Validate SMTP host — only allow valid hostnames (prevent SSRF)
    if (smtpHost !== undefined) {
      const hostPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
      if (!hostPattern.test(smtpHost) || smtpHost.length > 253) {
        return res.status(400).json({ error: 'Invalid SMTP host format' });
      }
      process.env.SMTP_HOST = sanitizeInput(smtpHost, 253);
    }

    // Validate SMTP port — only allow valid port numbers
    if (smtpPort !== undefined) {
      const port = parseInt(String(smtpPort), 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({ error: 'Invalid SMTP port (must be 1-65535)' });
      }
      process.env.SMTP_PORT = String(port);
    }

    if (smtpSecure !== undefined) process.env.SMTP_SECURE = smtpSecure ? 'true' : 'false';

    // Validate email format for SMTP user
    if (smtpUser !== undefined) {
      if (smtpUser.length > 254 || (smtpUser && !smtpUser.includes('@'))) {
        return res.status(400).json({ error: 'Invalid SMTP username (expected email format)' });
      }
      process.env.SMTP_USER = sanitizeInput(smtpUser, 254);
    }

    if (smtpPass !== undefined && smtpPass !== '') {
      if (smtpPass.length > 256) {
        return res.status(400).json({ error: 'SMTP password too long' });
      }
      process.env.SMTP_PASS = smtpPass;
    }

    if (smtpFrom !== undefined) {
      if (smtpFrom.length > 254) {
        return res.status(400).json({ error: 'SMTP From address too long' });
      }
      process.env.SMTP_FROM = sanitizeInput(smtpFrom, 254);
    }

    // Note: This only updates runtime settings. For persistence, these should be stored in a database
    // or written to a .env file (not recommended for production)

    res.json({
      message: 'Email settings updated successfully',
      note: 'Settings are updated in memory. Restart required for persistence from .env file.',
    });
  } catch (error) {
    console.error('Update email settings error:', error);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

/**
 * @swagger
 * /api/settings/email/test:
 *   post:
 *     tags: [Settings]
 *     summary: Test email connection and send test email
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               smtpHost:
 *                 type: string
 *               smtpPort:
 *                 type: string
 *               smtpSecure:
 *                 type: boolean
 *               smtpUser:
 *                 type: string
 *               smtpPass:
 *                 type: string
 *               smtpFrom:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test successful
 *       400:
 *         description: Test failed
 */
router.post('/email/test', requirePermission('settings.edit'), async (req: AuthRequest, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom } = req.body;

    // Temporarily set environment variables for testing
    const originalEnv = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
    };

    if (smtpHost) process.env.SMTP_HOST = smtpHost;
    if (smtpPort) process.env.SMTP_PORT = smtpPort;
    if (smtpSecure !== undefined) process.env.SMTP_SECURE = smtpSecure ? 'true' : 'false';
    if (smtpUser) process.env.SMTP_USER = smtpUser;
    if (smtpPass) process.env.SMTP_PASS = smtpPass;
    if (smtpFrom) process.env.SMTP_FROM = smtpFrom;

    try {
      // Try to verify connection
      const isValid = await verifyEmailConnection();

      if (!isValid) {
        // Restore original settings
        Object.entries(originalEnv).forEach(([key, value]) => {
          if (value !== undefined) process.env[key] = value;
        });
        return res.status(400).json({ error: 'Failed to connect to SMTP server' });
      }

      // Send test email to current user
      const testResult = await sendEmail({
        to: { email: req.user!.email },
        subject: '[FluxERP] Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8D6E63;">Email Configuration Test</h2>
            <p>This is a test email from FluxERP to verify your email settings are working correctly.</p>
            <p style="color: #666;">If you're receiving this email, your SMTP configuration is correct!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
      });

      if (testResult) {
        res.json({ message: 'Test email sent successfully', email: req.user!.email });
      } else {
        res.status(400).json({ error: 'Failed to send test email' });
      }
    } finally {
      // Restore original settings if test was temporary
      // Only restore if the user didn't explicitly want to save
      // For now, keep the new settings if test was successful
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to test email connection' });
  }
});

export default router;
