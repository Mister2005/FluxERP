import { Router, Response } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../lib/auth.js';
import {
  QueueName,
  getQueue,
  getJobStatus,
  getQueueStats,
  getAllQueuesStats,
  queueEmail,
  queueAIAnalysis,
  queueReport,
  queueNotification,
} from '../services/queue.service.js';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// ============================================
// QUEUE STATS
// ============================================

/**
 * @swagger
 * /api/jobs/stats:
 *   get:
 *     tags: [Jobs]
 *     summary: Get statistics for all queues
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics
 */
router.get('/stats', requirePermission('settings.view'), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getAllQueuesStats();
    res.json(stats);
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

/**
 * @swagger
 * /api/jobs/stats/{queue}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get statistics for a specific queue
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queue
 *         required: true
 *         schema:
 *           type: string
 *           enum: [email, ai-analysis, reports, notifications]
 *     responses:
 *       200:
 *         description: Queue statistics
 */
router.get('/stats/:queue', requirePermission('settings.view'), async (req: AuthRequest, res: Response) => {
  try {
    const queueName = req.params.queue as QueueName;

    if (!Object.values(QueueName).includes(queueName)) {
      return res.status(400).json({ error: 'Invalid queue name' });
    }

    const stats = await getQueueStats(queueName);
    res.json(stats);
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// ============================================
// JOB STATUS
// ============================================

/**
 * @swagger
 * /api/jobs/{queue}/{jobId}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get status of a specific job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queue
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 *       404:
 *         description: Job not found
 */
router.get('/:queue/:jobId', requirePermission('settings.view'), async (req: AuthRequest, res: Response) => {
  try {
    const queueName = req.params.queue as QueueName;
    const jobId = String(req.params.jobId);

    if (!Object.values(QueueName).includes(queueName)) {
      return res.status(400).json({ error: 'Invalid queue name' });
    }

    const status = await getJobStatus(queueName, jobId);

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// ============================================
// JOB MANAGEMENT
// ============================================

/**
 * @swagger
 * /api/jobs/{queue}/jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: Get list of jobs in a queue
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queue
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, active, completed, failed, delayed]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get('/:queue/jobs', requirePermission('settings.view'), async (req: AuthRequest, res: Response) => {
  try {
    const queueName = req.params.queue as QueueName;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!Object.values(QueueName).includes(queueName)) {
      return res.status(400).json({ error: 'Invalid queue name' });
    }

    const queue = getQueue(queueName);
    if (!queue) {
      return res.status(503).json({ error: 'Redis not available - job queue is disabled' });
    }

    let jobs;
    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(0, limit - 1);
        break;
      case 'active':
        jobs = await queue.getActive(0, limit - 1);
        break;
      case 'completed':
        jobs = await queue.getCompleted(0, limit - 1);
        break;
      case 'failed':
        jobs = await queue.getFailed(0, limit - 1);
        break;
      case 'delayed':
        jobs = await queue.getDelayed(0, limit - 1);
        break;
      default:
        // Get all recent jobs
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(0, Math.floor(limit / 4)),
          queue.getActive(0, Math.floor(limit / 4)),
          queue.getCompleted(0, Math.floor(limit / 4)),
          queue.getFailed(0, Math.floor(limit / 4)),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
    }

    const jobList = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        status: await job.getState(),
        progress: job.progress,
        data: job.data,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason,
      }))
    );

    res.json(jobList);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

/**
 * @swagger
 * /api/jobs/{queue}/retry/{jobId}:
 *   post:
 *     tags: [Jobs]
 *     summary: Retry a failed job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queue
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retried successfully
 */
router.post('/:queue/retry/:jobId', requirePermission('settings.edit'), async (req: AuthRequest, res: Response) => {
  try {
    const queueName = req.params.queue as QueueName;
    const jobId = String(req.params.jobId);

    if (!Object.values(QueueName).includes(queueName)) {
      return res.status(400).json({ error: 'Invalid queue name' });
    }

    const queue = getQueue(queueName);
    if (!queue) {
      return res.status(503).json({ error: 'Redis not available - job queue is disabled' });
    }
    
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await job.retry();
    res.json({ message: 'Job retried successfully', jobId });
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

/**
 * @swagger
 * /api/jobs/{queue}/clean:
 *   post:
 *     tags: [Jobs]
 *     summary: Clean completed/failed jobs from queue
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: queue
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grace:
 *                 type: integer
 *                 description: Jobs older than grace milliseconds will be removed
 *               status:
 *                 type: string
 *                 enum: [completed, failed]
 *     responses:
 *       200:
 *         description: Jobs cleaned successfully
 */
router.post('/:queue/clean', requirePermission('settings.edit'), async (req: AuthRequest, res: Response) => {
  try {
    const queueName = req.params.queue as QueueName;
    const { grace = 3600000, status = 'completed' } = req.body;

    if (!Object.values(QueueName).includes(queueName)) {
      return res.status(400).json({ error: 'Invalid queue name' });
    }

    const queue = getQueue(queueName);
    if (!queue) {
      return res.status(503).json({ error: 'Redis not available - job queue is disabled' });
    }
    
    const removed = await queue.clean(grace, 100, status);

    res.json({ message: 'Jobs cleaned successfully', removed: removed.length });
  } catch (error) {
    console.error('Clean jobs error:', error);
    res.status(500).json({ error: 'Failed to clean jobs' });
  }
});

export default router;
