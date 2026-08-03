import prisma from '../../../db.server';
import { JobType, JobPayloads } from '../types/queue.types';

class QueueService {
  async enqueueJob<T extends JobType>(
    type: T,
    payload: JobPayloads[T],
    options?: { delay?: number; maxAttempts?: number }
  ) {
    console.log(`[QueueService] Enqueuing job: ${type} for shop: ${payload.shop}`);
    
    const runAt = options?.delay ? new Date(Date.now() + options.delay) : new Date();
    
    return prisma.backgroundJob.create({
      data: {
        type,
        payload: payload as any,
        status: 'PENDING',
        attempts: 0,
        maxAttempts: options?.maxAttempts ?? 3,
        runAt,
      },
    });
  }

  async close() {
    // No-op for database-backed queue
  }
}

export const queueService = new QueueService();
