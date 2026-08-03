import { whatsAppWebhookService } from '../../whatsapp/services/whatsapp-webhook.service';
import { analyticsService } from '../services/analytics.service';
import prisma from '../../../db.server';
import { encrypt } from '../../../core/security/encryption';

async function runSandbox() {
  const shop = 'analytics-test-shop.myshopify.com';
  console.log('--- Starting Analytics Sandbox Test ---');

  // 1. Setup mock ShopConfig
  const encryptedToken = encrypt('mock-waba-token-666');
  await prisma.shopConfig.upsert({
    where: { shop },
    update: {
      whatsappToken: encryptedToken,
      phoneNumberId: 'mock-phone-id-666',
      wabaId: 'mock-waba-id-666',
    },
    create: {
      shop,
      whatsappToken: encryptedToken,
      phoneNumberId: 'mock-phone-id-666',
      wabaId: 'mock-waba-id-666',
    },
  });

  // Clean up any old logs/customers
  await prisma.messageLog.deleteMany({ where: { shop } });
  await prisma.customer.deleteMany({ where: { shop } });

  // 2. Setup mock customer
  await prisma.customer.create({
    data: {
      id: 'gid://shopify/Customer/666',
      shop,
      phone: '+14155556666',
      firstName: 'Alice',
      lastName: 'Wonderland',
      optedIn: true,
    },
  });

  // 3. Create mock outbound message logs (1 sent, 1 failed)
  const messageId1 = 'wamid.analytics-sandbox-msg-1';
  const messageId2 = 'wamid.analytics-sandbox-msg-2';

  await prisma.messageLog.create({
    data: {
      id: messageId1,
      shop,
      phone: '+14155556666',
      direction: 'OUTBOUND',
      status: 'SENT',
      body: 'Campaign Outbound Msg 1',
    },
  });

  await prisma.messageLog.create({
    data: {
      id: messageId2,
      shop,
      phone: '+14155556666',
      direction: 'OUTBOUND',
      status: 'FAILED',
      body: 'Campaign Outbound Msg 2 Failed',
    },
  });

  // 4. Fetch metrics and verify initial state
  console.log('[AnalyticsSandbox] Verifying initial metrics...');
  let data = await analyticsService.getDashboardMetrics(shop);
  console.log('Initial metrics:', data.metrics);

  if (
    data.metrics.totalOutbound !== 2 ||
    data.metrics.failedCount !== 1 ||
    data.metrics.deliveryRate !== 0 ||
    data.metrics.readRate !== 0
  ) {
    console.error('❌ Initial metrics verification failed!');
    process.exit(1);
  }

  // 5. Simulate Status Webhook Payload: DELIVERED for message 1
  console.log('[AnalyticsSandbox] Simulating Meta Status Webhook: DELIVERED...');
  const webhookPayloadDelivered = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock-waba-id-666',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '12345',
                phone_number_id: 'mock-phone-id-666',
              },
              statuses: [
                {
                  id: messageId1,
                  status: 'delivered',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: '14155556666',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await whatsAppWebhookService.handleWebhookPayload(webhookPayloadDelivered);

  data = await analyticsService.getDashboardMetrics(shop);
  console.log('After Delivered metrics:', data.metrics);

  if (
    data.metrics.deliveryCount !== 1 ||
    data.metrics.deliveryRate !== 50 ||
    data.metrics.readRate !== 0
  ) {
    console.error('❌ Delivered status webhook processing failed!');
    process.exit(1);
  }

  // 6. Simulate Status Webhook Payload: READ for message 1
  console.log('[AnalyticsSandbox] Simulating Meta Status Webhook: READ...');
  const webhookPayloadRead = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock-waba-id-666',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '12345',
                phone_number_id: 'mock-phone-id-666',
              },
              statuses: [
                {
                  id: messageId1,
                  status: 'read',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: '14155556666',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await whatsAppWebhookService.handleWebhookPayload(webhookPayloadRead);

  data = await analyticsService.getDashboardMetrics(shop);
  console.log('After Read metrics:', data.metrics);

  if (
    data.metrics.readCount !== 1 ||
    data.metrics.readRate !== 100
  ) {
    console.error('❌ Read status webhook processing failed!');
    process.exit(1);
  }

  // 7. Simulate Inbound Message Reply from Customer
  console.log('[AnalyticsSandbox] Simulating inbound reply message webhook...');
  const inboundMessagePayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock-waba-id-666',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '12345',
                phone_number_id: 'mock-phone-id-666',
              },
              messages: [
                {
                  from: '14155556666',
                  id: 'wamid.analytics-sandbox-inbound-msg-1',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: {
                    body: 'Interested! Let me know details.',
                  },
                  type: 'text',
                },
              ],
            },
          },
        ],
      },
    ],
  };

  await whatsAppWebhookService.handleWebhookPayload(inboundMessagePayload);

  data = await analyticsService.getDashboardMetrics(shop);
  console.log('After Inbound metrics:', data.metrics);

  if (data.metrics.inboundCount !== 1 || data.recentLogs.length !== 3) {
    console.error('❌ Inbound reply message webhook processing failed!');
    process.exit(1);
  }

  // 8. Clean up
  console.log('[AnalyticsSandbox] Cleaning up database records...');
  await prisma.messageLog.deleteMany({ where: { shop } });
  await prisma.customer.deleteMany({ where: { shop } });
  await prisma.shopConfig.deleteMany({ where: { shop } });
  await prisma.$disconnect();

  console.log('✅ Analytics Sandbox Test PASSED!');
  process.exit(0);
}

runSandbox().catch((err) => {
  console.error('[AnalyticsSandbox] Unexpected error:', err);
  process.exit(1);
});
