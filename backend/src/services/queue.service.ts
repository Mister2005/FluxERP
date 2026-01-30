import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

// ============================================
// REDIS CONNECTION FOR BULLMQ
// ============================================

let redisAvailable = false;
let redisChecked = false;

const checkRedisConnection = async (): Promise<boolean> => {
  if (redisChecked) return redisAvailable;
  
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  return new Promise((resolve) => {
    const testConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 3000,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry on failure
    });

    // Handle errors to prevent unhandled exceptions
    testConnection.on('error', () => {
      // Silently ignore Redis connection errors during check
    });

    testConnection.connect()
      .then(() => testConnection.ping())
      .then(() => {
        redisAvailable = true;
        logger.info('Redis connection successful - background jobs enabled');
        testConnection.quit().catch(() => {});
        redisChecked = true;
        resolve(true);
      })
      .catch(() => {
        redisAvailable = false;
        logger.warn('Redis not available - background jobs disabled. App will continue without job queue.');
        testConnection.quit().catch(() => {});
        redisChecked = true;
        resolve(false);
      });
  });
};

export const isRedisAvailable = () => redisAvailable;

const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

// ============================================
// QUEUE DEFINITIONS
// ============================================

export enum QueueName {
  EMAIL = 'email',
  AI_ANALYSIS = 'ai-analysis',
  REPORTS = 'reports',
  NOTIFICATIONS = 'notifications',
}

export interface EmailJobData {
  type: 'eco-created' | 'eco-status-changed' | 'eco-assigned' | 'workorder-created' | 'workorder-status-changed' | 'notification';
  recipients: Array<{ email: string; name?: string }>;
  data: Record<string, any>;
}

export interface AIAnalysisJobData {
  type: 'risk-score' | 'impact-analysis' | 'compliance-check' | 'change-suggestion';
  entityId: string;
  entityType: 'ECO' | 'Product' | 'BOM';
  data: Record<string, any>;
}

export interface ReportJobData {
  type: 'eco-summary' | 'workorder-summary' | 'inventory-report' | 'audit-log';
  userId: string;
  dateRange?: { start: Date; end: Date };
  filters?: Record<string, any>;
}

export interface NotificationJobData {
  type: 'in-app' | 'push';
  userId: string;
  title: string;
  message: string;
  link?: string;
}

// ============================================
// QUEUE FACTORY
// ============================================

const queues: Map<string, Queue> = new Map();
const workers: Map<string, Worker> = new Map();
const queueEvents: Map<string, QueueEvents> = new Map();

export const getQueue = (name: QueueName): Queue | null => {
  if (!redisAvailable) return null;
  
  if (!queues.has(name)) {
    const connection = getRedisConnection();
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
    queues.set(name, queue);
  }
  return queues.get(name)!;
};

export const getQueueEvents = (name: QueueName): QueueEvents | null => {
  if (!redisAvailable) return null;
  
  if (!queueEvents.has(name)) {
    const connection = getRedisConnection();
    const events = new QueueEvents(name, { connection });
    queueEvents.set(name, events);
  }
  return queueEvents.get(name)!;
};

// ============================================
// JOB CREATORS
// ============================================

export const queueEmail = async (data: EmailJobData, priority = 'normal'): Promise<Job | null> => {
  const queue = getQueue(QueueName.EMAIL);
  if (!queue) {
    logger.debug({ type: data.type }, 'Redis unavailable - skipping email queue');
    return null;
  }
  return queue.add(`email:${data.type}`, data, {
    priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5,
  });
};

export const queueAIAnalysis = async (data: AIAnalysisJobData): Promise<Job | null> => {
  const queue = getQueue(QueueName.AI_ANALYSIS);
  if (!queue) {
    logger.debug({ type: data.type }, 'Redis unavailable - skipping AI analysis queue');
    return null;
  }
  return queue.add(`ai:${data.type}`, data, {
    priority: 5,
  });
};

export const queueReport = async (data: ReportJobData): Promise<Job | null> => {
  const queue = getQueue(QueueName.REPORTS);
  if (!queue) {
    logger.debug({ type: data.type }, 'Redis unavailable - skipping report queue');
    return null;
  }
  return queue.add(`report:${data.type}`, data, {
    priority: 10,
  });
};

export const queueNotification = async (data: NotificationJobData): Promise<Job | null> => {
  const queue = getQueue(QueueName.NOTIFICATIONS);
  if (!queue) {
    logger.debug({ type: data.type }, 'Redis unavailable - skipping notification queue');
    return null;
  }
  return queue.add(`notification:${data.type}`, data, {
    priority: 3,
  });
};

// ============================================
// JOB STATUS
// ============================================

export interface JobStatus {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  data: any;
  result?: any;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

export const getJobStatus = async (queueName: QueueName, jobId: string): Promise<JobStatus | null> => {
  const queue = getQueue(queueName);
  if (!queue) return null;
  
  const job = await queue.getJob(jobId);

  if (!job) return null;

  const state = await job.getState();

  return {
    id: job.id!,
    name: job.name,
    status: state as JobStatus['status'],
    progress: job.progress as number,
    data: job.data,
    result: job.returnvalue,
    error: job.failedReason,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
  };
};

export const getQueueStats = async (queueName: QueueName) => {
  const queue = getQueue(queueName);
  if (!queue) {
    return {
      name: queueName,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      redisAvailable: false,
    };
  }
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
    redisAvailable: true,
  };
};

export const getAllQueuesStats = async () => {
  if (!redisAvailable) {
    return Object.values(QueueName).map((name) => ({
      name,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      redisAvailable: false,
    }));
  }
  
  const stats = await Promise.all(
    Object.values(QueueName).map((name) => getQueueStats(name))
  );
  return stats;
};

// ============================================
// CLEANUP
// ============================================

export const closeQueues = async () => {
  const closePromises: Promise<void>[] = [];

  for (const [name, queue] of queues) {
    logger.info(`Closing queue: ${name}`);
    closePromises.push(queue.close());
  }

  for (const [name, worker] of workers) {
    logger.info(`Closing worker: ${name}`);
    closePromises.push(worker.close());
  }

  for (const [name, events] of queueEvents) {
    logger.info(`Closing queue events: ${name}`);
    closePromises.push(events.close());
  }

  await Promise.all(closePromises);
  queues.clear();
  workers.clear();
  queueEvents.clear();
  logger.info('All queues closed');
};

export default {
  checkRedisConnection,
  isRedisAvailable,
  getQueue,
  getQueueEvents,
  queueEmail,
  queueAIAnalysis,
  queueReport,
  queueNotification,
  getJobStatus,
  getQueueStats,
  getAllQueuesStats,
  closeQueues,
};

export { checkRedisConnection };
