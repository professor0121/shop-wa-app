import { whatsAppService } from '../../whatsapp/services/whatsapp.service';
import { automationRepository } from '../repositories/automation.repository';
import { checkoutService } from '../../order/services/checkout.service';
import { queueService } from '../../queue/services/queue.service';
import { stopWorker } from '../../queue/workers/queue.worker';
import prisma from '../../../db.server';
import { encrypt } from '../../../core/security/encryption';

async function runSandbox() {
  const shop = 'automation-test-shop.myshopify.com';
  const checkoutToken = `checkout-token-${Date.now()}`;
  console.log('--- Starting Automations Sandbox Test ---');

  // 1. Mock WhatsApp Template message delivery API
  let sendPayload: any = null;
  whatsAppService.sendTemplateMessage = async (
    phoneNumberId: string,
    decryptedToken: string,
    to: string,
    templateName: string,
    languageCode: string
  ) => {
    console.log(`[WhatsAppSandboxMock] Intercepted sendTemplateMessage request to: ${to}`);
    sendPayload = { phoneNumberId, decryptedToken, to, templateName, languageCode };
    return { messageId: `wamid.sandbox-${Date.now()}` };
  };

  // 2. Setup mock ShopConfig in database
  const encryptedToken = encrypt('mock-waba-token-888');
  await prisma.shopConfig.upsert({
    where: { shop },
    update: {
      whatsappToken: encryptedToken,
      phoneNumberId: 'mock-phone-id-888',
      wabaId: 'mock-waba-id-888',
    },
    create: {
      shop,
      whatsappToken: encryptedToken,
      phoneNumberId: 'mock-phone-id-888',
      wabaId: 'mock-waba-id-888',
    },
  });

  // 3. Create active Abandoned Checkout Automation configuration with 0 delay (immediate execution)
  await automationRepository.upsertAutomation(shop, 'ABANDONED_CHECKOUT', {
    templateName: 'abandoned_cart_reminder_test',
    templateLanguage: 'en_US',
    delayHours: 0,
    active: true,
  });

  // 4. Simulate syncing an abandoned checkout (which will trigger scheduling the automation)
  console.log('[AutomationSandbox] Simulating checkout webhook ingest...');
  const checkoutWebhookPayload = {
    token: checkoutToken,
    phone: '+14155552671',
    email: 'buyer@example.com',
    total_price: '89.99',
    currency: 'USD',
    customer: {
      phone: '+14155552671',
    },
  };

  const checkout = await checkoutService.syncCheckout(shop, checkoutWebhookPayload);
  if (!checkout) {
    throw new Error('Failed to sync checkout in test setup');
  }
  console.log(`[AutomationSandbox] Checkout synced in database: ${checkout.id}`);

  // 5. Poll the MessageLog table to wait for the worker to process the immediate job
  console.log('[AutomationSandbox] Waiting for worker to process enqueued job...');
  let success = false;
  
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Check if message log is created for this checkout's phone
    const log = await prisma.messageLog.findFirst({
      where: { shop, phone: '+14155552671', status: 'SENT' },
    });

    const updatedCheckout = await prisma.checkout.findUnique({
      where: { id: checkoutToken },
    });

    if (log && updatedCheckout?.abandonedEmailSent) {
      console.log(`[AutomationSandbox] Success! Outbound Message Log found: ${log.id}`);
      console.log(`[AutomationSandbox] Checkout abandonedEmailSent set to: ${updatedCheckout.abandonedEmailSent}`);
      success = true;
      break;
    }
  }

  // 6. Shutdown and clean up
  console.log('[AutomationSandbox] Cleaning up test records...');
  await prisma.messageLog.deleteMany({
    where: { shop },
  });
  await prisma.checkout.deleteMany({
    where: { shop },
  });
  await prisma.automation.deleteMany({
    where: { shop },
  });
  await prisma.shopConfig.deleteMany({
    where: { shop },
  });

  await queueService.close();
  await stopWorker();
  await prisma.$disconnect();

  if (success && sendPayload) {
    console.log(`[AutomationSandbox] Sent payload details:`);
    console.log(` - Template Name: ${sendPayload.templateName}`);
    console.log(` - Language Code: ${sendPayload.languageCode}`);
    console.log(` - Phone: ${sendPayload.to}`);
    console.log('✅ Automations Sandbox Test PASSED!');
    process.exit(0);
  } else {
    console.error('❌ Automations Sandbox Test FAILED: Job was not processed successfully.');
    process.exit(1);
  }
}

runSandbox().catch((err) => {
  console.error('[AutomationSandbox] Unexpected error running sandbox:', err);
  process.exit(1);
});
