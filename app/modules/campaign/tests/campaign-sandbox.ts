import { whatsAppService } from '../../whatsapp/services/whatsapp.service';
import { campaignService } from '../services/campaign.service';
import { stopWorker } from '../../queue/workers/queue.worker';
import prisma from '../../../db.server';
import { encrypt } from '../../../core/security/encryption';

async function runSandbox() {
  const shop = 'campaign-test-shop.myshopify.com';
  console.log('--- Starting Campaigns Sandbox Test ---');

  // 1. Mock WhatsApp Template message delivery API
  let sentPhones: string[] = [];
  whatsAppService.sendTemplateMessage = async (
    phoneNumberId: string,
    decryptedToken: string,
    to: string,
    templateName: string,
    languageCode: string
  ) => {
    console.log(`[WhatsAppSandboxMock] Intercepted sendTemplateMessage request to: ${to}`);
    sentPhones.push(to);
    return { messageId: `wamid.campaign-sandbox-${Date.now()}-${to.replace('+', '')}` };
  };

  // 2. Setup mock ShopConfig in database
  const encryptedToken = encrypt('mock-waba-token-999');
  await prisma.shopConfig.upsert({
    where: { shop },
    update: {
      whatsappToken: encryptedToken,
      phoneNumberId: 'mock-phone-id-999',
      wabaId: 'mock-waba-id-999',
    },
    create: {
      shop,
      whatsappToken: encryptedToken,
      phoneNumberId: 'mock-phone-id-999',
      wabaId: 'mock-waba-id-999',
    },
  });

  // 3. Create mock customers in database
  console.log('[CampaignSandbox] Upserting mock customers...');
  const customer1 = await prisma.customer.upsert({
    where: { shop_phone: { shop, phone: '+14155551111' } },
    update: { optedIn: true },
    create: {
      id: 'gid://shopify/Customer/1111',
      shop,
      phone: '+14155551111',
      firstName: 'Alice',
      lastName: 'Smith',
      optedIn: true,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { shop_phone: { shop, phone: '+14155552222' } },
    update: { optedIn: true },
    create: {
      id: 'gid://shopify/Customer/2222',
      shop,
      phone: '+14155552222',
      firstName: 'Bob',
      lastName: 'Jones',
      optedIn: true,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { shop_phone: { shop, phone: '+14155553333' } },
    update: { optedIn: false },
    create: {
      id: 'gid://shopify/Customer/3333',
      shop,
      phone: '+14155553333',
      firstName: 'Charlie',
      lastName: 'Brown',
      optedIn: false,
    },
  });

  // 4. Create and trigger campaign
  console.log('[CampaignSandbox] Creating and triggering campaign...');
  const campaign = await campaignService.createAndScheduleCampaign(shop, {
    name: 'Sandbox Bulk Promo',
    templateName: 'holiday_special_sale',
    templateLanguage: 'en_US',
  });

  console.log(`[CampaignSandbox] Campaign created: ${campaign.id}. Waiting for worker processing...`);

  // 5. Poll database to wait for campaign completion
  let success = false;
  let finalCampaign: any = null;

  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    finalCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
    });

    if (finalCampaign && finalCampaign.status === 'COMPLETED') {
      console.log(`[CampaignSandbox] Success! Campaign completed.`);
      success = true;
      break;
    }
  }

  // 6. Verification
  if (success && finalCampaign) {
    const logs = await prisma.messageLog.findMany({
      where: { campaignId: campaign.id },
    });

    console.log(`[CampaignSandbox] Metrics:`);
    console.log(` - Sent Count: ${finalCampaign.sentCount} (Expected: 2)`);
    console.log(` - Failed Count: ${finalCampaign.failedCount} (Expected: 0)`);
    console.log(` - Intercepted Sends: ${sentPhones.join(', ')}`);
    console.log(` - Message Logs created: ${logs.length} (Expected: 2)`);

    if (
      finalCampaign.sentCount === 2 &&
      finalCampaign.failedCount === 0 &&
      sentPhones.length === 2 &&
      sentPhones.includes('+14155551111') &&
      sentPhones.includes('+14155552222') &&
      !sentPhones.includes('+14155553333') &&
      logs.length === 2
    ) {
      console.log('✅ Campaigns Sandbox Test PASSED!');
    } else {
      console.error('❌ Campaigns Sandbox Test FAILED: Metrics or targets mismatch.');
      success = false;
    }
  } else {
    console.error('❌ Campaigns Sandbox Test FAILED: Campaign did not complete in time.');
  }

  // 7. Clean up
  console.log('[CampaignSandbox] Cleaning up database records...');
  await prisma.messageLog.deleteMany({
    where: { campaignId: campaign.id },
  });
  await prisma.campaign.deleteMany({
    where: { shop },
  });
  await prisma.customer.deleteMany({
    where: { shop },
  });
  await prisma.shopConfig.deleteMany({
    where: { shop },
  });

  await stopWorker();
  await prisma.$disconnect();

  if (success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSandbox().catch((err) => {
  console.error('[CampaignSandbox] Unexpected error running sandbox:', err);
  process.exit(1);
});
