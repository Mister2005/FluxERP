import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';
import { QueueName, EmailJobData, AIAnalysisJobData, ReportJobData, NotificationJobData, checkRedisConnection, isRedisAvailable } from './queue.service.js';
import {
  sendECOCreatedEmail,
  sendECOStatusChangedEmail,
  sendECOAssignedEmail,
  sendWorkOrderCreatedEmail,
  sendWorkOrderStatusChangedEmail,
  sendNotificationEmail,
} from './email.service.js';

// ============================================
// REDIS CONNECTION FOR WORKERS
// ============================================

const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

// ============================================
// EMAIL WORKER
// ============================================

const processEmailJob = async (job: Job<EmailJobData>) => {
  const { type, recipients, data } = job.data;

  logger.info({ jobId: job.id, type, recipients: recipients.length }, 'Processing email job');

  try {
    switch (type) {
      case 'eco-created':
        await sendECOCreatedEmail(recipients, data as any);
        break;
      case 'eco-status-changed':
        await sendECOStatusChangedEmail(recipients, data as any);
        break;
      case 'eco-assigned':
        await sendECOAssignedEmail(recipients[0], data as any);
        break;
      case 'workorder-created':
        await sendWorkOrderCreatedEmail(recipients, data as any);
        break;
      case 'workorder-status-changed':
        await sendWorkOrderStatusChangedEmail(recipients, data as any);
        break;
      case 'notification':
        await sendNotificationEmail(recipients, data as any);
        break;
      default:
        throw new Error(`Unknown email job type: ${type}`);
    }

    logger.info({ jobId: job.id, type }, 'Email job completed');
    return { success: true, sentTo: recipients.length };
  } catch (error) {
    logger.error({ jobId: job.id, type, error }, 'Email job failed');
    throw error;
  }
};

// ============================================
// AI ANALYSIS WORKER
// ============================================

const processAIAnalysisJob = async (job: Job<AIAnalysisJobData>) => {
  const { type, entityId, entityType, data } = job.data;

  logger.info({ jobId: job.id, type, entityId }, 'Processing AI analysis job');

  // Update job progress
  await job.updateProgress(10);

  try {
    // Simulate AI analysis (in production, this would call the Gemini API)
    await job.updateProgress(50);

    // The actual AI service would be called here
    // For now, we return a placeholder
    const result = {
      type,
      entityId,
      entityType,
      analysis: `AI analysis for ${type} on ${entityType} ${entityId}`,
      timestamp: new Date().toISOString(),
    };

    await job.updateProgress(100);

    logger.info({ jobId: job.id, type }, 'AI analysis job completed');
    return result;
  } catch (error) {
    logger.error({ jobId: job.id, type, error }, 'AI analysis job failed');
    throw error;
  }
};

// ============================================
// REPORT WORKER
// ============================================

const processReportJob = async (job: Job<ReportJobData>) => {
  const { type, userId, dateRange, filters } = job.data;

  logger.info({ jobId: job.id, type, userId }, 'Processing report job');

  await job.updateProgress(10);

  try {
    // Simulate report generation
    await job.updateProgress(50);

    const result = {
      type,
      userId,
      dateRange,
      filters,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/reports/download/${job.id}`,
    };

    await job.updateProgress(100);

    logger.info({ jobId: job.id, type }, 'Report job completed');
    return result;
  } catch (error) {
    logger.error({ jobId: job.id, type, error }, 'Report job failed');
    throw error;
  }
};

// ============================================
// NOTIFICATION WORKER
// ============================================

const processNotificationJob = async (job: Job<NotificationJobData>) => {
  const { type, userId, title, message, link } = job.data;

  logger.info({ jobId: job.id, type, userId }, 'Processing notification job');

  try {
    // In a real implementation, this would:
    // - Store the notification in the database
    // - Send push notification if type is 'push'
    // - Emit WebSocket event for real-time updates

    const result = {
      type,
      userId,
      title,
      notifiedAt: new Date().toISOString(),
    };

    logger.info({ jobId: job.id, type }, 'Notification job completed');
    return result;
  } catch (error) {
    logger.error({ jobId: job.id, type, error }, 'Notification job failed');
    throw error;
  }
};

// ============================================
// WORKER INSTANCES
// ============================================

const workers: Worker[] = [];

export const startWorkers = async () => {
  // First check if Redis is available
  const redisOk = await checkRedisConnection();
  
  if (!redisOk) {
    logger.warn('Redis not available - background workers will not start');
    return;
  }

  const connection = getRedisConnection();

  // Email Worker
  const emailWorker = new Worker(QueueName.EMAIL, processEmailJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  emailWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, queue: QueueName.EMAIL }, 'Job completed');
  });

  emailWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, queue: QueueName.EMAIL, error: error.message }, 'Job failed');
  });

  workers.push(emailWorker);

  // AI Analysis Worker
  const aiWorker = new Worker(QueueName.AI_ANALYSIS, processAIAnalysisJob, {
    connection: getRedisConnection(),
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000, // Limit AI calls to 5 per minute
    },
  });

  aiWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, queue: QueueName.AI_ANALYSIS }, 'Job completed');
  });

  aiWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, queue: QueueName.AI_ANALYSIS, error: error.message }, 'Job failed');
  });

  workers.push(aiWorker);

  // Report Worker
  const reportWorker = new Worker(QueueName.REPORTS, processReportJob, {
    connection: getRedisConnection(),
    concurrency: 2,
  });

  reportWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, queue: QueueName.REPORTS }, 'Job completed');
  });

  reportWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, queue: QueueName.REPORTS, error: error.message }, 'Job failed');
  });

  workers.push(reportWorker);

  // Notification Worker
  const notificationWorker = new Worker(QueueName.NOTIFICATIONS, processNotificationJob, {
    connection: getRedisConnection(),
    concurrency: 10,
  });

  notificationWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id, queue: QueueName.NOTIFICATIONS }, 'Job completed');
  });

  notificationWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, queue: QueueName.NOTIFICATIONS, error: error.message }, 'Job failed');
  });

  workers.push(notificationWorker);

  logger.info({ workerCount: workers.length }, 'All workers started');
};

export const stopWorkers = async () => {
  logger.info('Stopping all workers...');
  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
  logger.info('All workers stopped');
};

export default {
  startWorkers,
  stopWorkers,
};
