import prisma from '../../../db.server';
import { productService } from '../../product/services/product.service';
import { customerService } from '../../customer/services/customer.service';
import { orderService } from '../../order/services/order.service';
import { checkoutService } from '../../order/services/checkout.service';
import { templateService } from '../../template/services/template.service';
import { automationService } from '../../automation/services/automation.service';
import { JobType } from '../types/queue.types';

const POLL_INTERVAL = 2000; // Poll database every 2 seconds
let isPolling = false;
let isShuttingDown = false;

async function processJob(job: any) {
  const type = job.type as JobType;
  const data = job.payload;

  console.log(`[QueueWorker] Processing job ${job.id} of type ${type} for shop ${data.shop}`);

  switch (type) {
    case 'SYNC_PRODUCT':
      await productService.syncProduct(data.shop, data.payload);
      break;
    case 'DELETE_PRODUCT':
      await productService.deleteProduct(data.shop, data.id);
      break;
    case 'SYNC_CUSTOMER':
      await customerService.syncCustomer(data.shop, data.payload);
      break;
    case 'DELETE_CUSTOMER':
      await customerService.deleteCustomer(data.shop, data.id);
      break;
    case 'SYNC_ORDER':
      await orderService.syncOrder(data.shop, data.payload);
      break;
    case 'SYNC_CHECKOUT':
      await checkoutService.syncCheckout(data.shop, data.payload);
      break;
    case 'SYNC_TEMPLATES':
      await templateService.syncTemplates(data.shop);
      break;
    case 'PROCESS_AUTOMATION':
      if (data.triggerType === 'ABANDONED_CHECKOUT') {
        await automationService.processAbandonedCheckout(
          data.shop,
          data.checkoutId,
          data.checkoutUpdatedAt
        );
      }
      break;
    default:
      console.warn(`[QueueWorker] Unknown job type: ${type}`);
  }
}

async function pollAndProcessJobs() {
  if (isPolling || isShuttingDown) return;
  isPolling = true;

  try {
    // Find next pending job that is scheduled to run
    const job = await prisma.backgroundJob.findFirst({
      where: {
        status: 'PENDING',
        runAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (job) {
      // Optimistically lock the job by setting status to PROCESSING
      // to prevent multiple workers from picking up the same job.
      const affected = await prisma.backgroundJob.updateMany({
        where: {
          id: job.id,
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
          updatedAt: new Date(),
        },
      });

      // If updateMany affected 1 row, it means we successfully locked it!
      if (affected.count > 0) {
        try {
          await processJob(job);
          await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: 'COMPLETED' },
          });
        } catch (error: any) {
          console.error(`[QueueWorker] Job ${job.id} failed:`, error);
          const nextAttempts = job.attempts + 1;
          if (nextAttempts < job.maxAttempts) {
            // Schedule retry with exponential backoff
            const backoffSec = Math.pow(2, nextAttempts) * 5;
            const runAt = new Date(Date.now() + backoffSec * 1000);
            await prisma.backgroundJob.update({
              where: { id: job.id },
              data: {
                status: 'PENDING',
                attempts: nextAttempts,
                errorMessage: error.message || String(error),
                runAt,
              },
            });
            console.log(`[QueueWorker] Job ${job.id} scheduled for retry in ${backoffSec} seconds`);
          } else {
            await prisma.backgroundJob.update({
              where: { id: job.id },
              data: {
                status: 'FAILED',
                attempts: nextAttempts,
                errorMessage: error.message || String(error),
              },
            });
          }
        }
      }
      
      // Immediately poll again if we processed a job to drain the queue faster
      isPolling = false;
      setImmediate(pollAndProcessJobs);
      return;
    }
  } catch (error) {
    console.error('[QueueWorker] Error in poll loop:', error);
  }

  isPolling = false;
}

// Start polling
const intervalId = setInterval(pollAndProcessJobs, POLL_INTERVAL);
console.log(`[QueueWorker] Worker started, polling database every ${POLL_INTERVAL}ms...`);

// Clean-up handler for testing shutdowns
export async function stopWorker() {
  isShuttingDown = true;
  clearInterval(intervalId);
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log('[QueueWorker] Shutting down worker...');
  await stopWorker();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
