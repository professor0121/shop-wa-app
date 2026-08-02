import { whatsAppService } from '../../whatsapp/services/whatsapp.service';
import { queueService } from '../services/queue.service';
import { worker } from '../workers/queue.worker';
import prisma from '../../../db.server';
import { encrypt } from '../../../core/security/encryption';

async function runSandbox() {
  const shop = 'queue-test-shop.myshopify.com';
  console.log('--- Starting Queue Sandbox Test ---');

  // 1. Mock Meta WhatsApp API fetch to return dummy templates
  whatsAppService.fetchMetaTemplates = async (wabaId: string, decryptedToken: string) => {
    console.log(`[QueueSandboxMock] Intercepted fetchMetaTemplates for waba: ${wabaId}`);
    return {
      data: [
        {
          id: 'mock-template-id-777',
          name: 'queue_sandbox_verification',
          language: 'en_US',
          category: 'UTILITY',
          status: 'APPROVED',
          components: [
            { type: 'BODY', text: 'Queue system is working!' }
          ],
        },
      ],
    };
  };

  // 2. Setup mock ShopConfig in the database
  const encryptedToken = encrypt('mock-waba-token-777');
  await prisma.shopConfig.upsert({
    where: { shop },
    update: {
      whatsappToken: encryptedToken,
      wabaId: 'mock-waba-id-777',
    },
    create: {
      shop,
      whatsappToken: encryptedToken,
      wabaId: 'mock-waba-id-777',
    },
  });

  // Clean up any pre-existing templates for this test
  await prisma.template.deleteMany({
    where: { shop },
  });

  // 3. Enqueue the templates sync job
  const job = await queueService.enqueueJob('SYNC_TEMPLATES', { shop });
  console.log(`[QueueSandbox] Enqueued job: ${job.id}`);

  // 4. Wait for the worker to process the job
  console.log('[QueueSandbox] Waiting for job completion...');
  
  // We will wait for up to 10 seconds for the template to appear in the database
  let success = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const templates = await prisma.template.findMany({
      where: { shop, name: 'queue_sandbox_verification' },
    });
    if (templates.length > 0) {
      console.log(`[QueueSandbox] Verification Template found in DB: ${templates[0].name}`);
      success = true;
      break;
    }
  }

  // 5. Shutdown and clean up
  console.log('[QueueSandbox] Cleaning up...');
  await prisma.template.deleteMany({
    where: { shop },
  });
  await prisma.shopConfig.deleteMany({
    where: { shop },
  });

  await queueService.close();
  await worker.close();
  // We need to disconnect the prisma client if needed, or close connections
  await prisma.$disconnect();

  if (success) {
    console.log('✅ Queue Sandbox Test PASSED!');
    process.exit(0);
  } else {
    console.error('❌ Queue Sandbox Test FAILED: Job was not processed within time.');
    process.exit(1);
  }
}

runSandbox().catch((err) => {
  console.error('[QueueSandbox] Unexpected error running sandbox:', err);
  process.exit(1);
});
