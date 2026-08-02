import { Worker, Job } from 'bullmq';
import { config } from '../../../core/config/config';
import { productService } from '../../product/services/product.service';
import { customerService } from '../../customer/services/customer.service';
import { orderService } from '../../order/services/order.service';
import { checkoutService } from '../../order/services/checkout.service';
import { templateService } from '../../template/services/template.service';
import { automationService } from '../../automation/services/automation.service';
import { JobType } from '../types/queue.types';

const QUEUE_NAME = 'whatsapp-jobs';

export const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const type = job.name as JobType;
    const data = job.data;

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
  },
  {
    connection: {
      url: config.REDIS_URL,
    },
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  console.log(`[QueueWorker] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[QueueWorker] Job ${job?.id} failed with error:`, err);
});

console.log('[QueueWorker] Worker started and listening for jobs...');

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`[QueueWorker] ${signal} received. Closing worker...`);
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
