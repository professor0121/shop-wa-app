import { Queue } from 'bullmq';
import { config } from '../../../core/config/config';
import { JobType, JobPayloads } from '../types/queue.types';

// Use global to persist Queue across hot-reloads in development
declare global {
  var __whatsappQueue: Queue | undefined;
}

const QUEUE_NAME = 'whatsapp-jobs';

class QueueService {
  private queue: Queue;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      this.queue = new Queue(QUEUE_NAME, {
        connection: {
          url: config.REDIS_URL,
        },
      });
    } else {
      if (!globalThis.__whatsappQueue) {
        globalThis.__whatsappQueue = new Queue(QUEUE_NAME, {
          connection: {
            url: config.REDIS_URL,
          },
        });
      }
      this.queue = globalThis.__whatsappQueue;
    }
  }

  async enqueueJob<T extends JobType>(
    type: T,
    payload: JobPayloads[T],
    options?: { delay?: number; priority?: number }
  ) {
    console.log(`[QueueService] Enqueuing job: ${type} for shop: ${payload.shop}`);
    return this.queue.add(type, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      ...options,
    });
  }

  async close() {
    await this.queue.close();
  }
}

export const queueService = new QueueService();
