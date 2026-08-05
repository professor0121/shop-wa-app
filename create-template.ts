import { decrypt } from './app/core/security/encryption';
import prisma from './app/db.server';
import { templateService } from './app/modules/template/services/template.service';

const shop = 'developmentstore-txduifzb.myshopify.com';

async function createTemplate() {
  console.log('Fetching configuration for shop:', shop);
  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  if (!config || !config.whatsappToken || !config.wabaId) {
    console.error('Error: Incomplete WhatsApp configuration in database. Please run update-and-test.ts first.');
    process.exit(1);
  }

  const decryptedToken = decrypt(config.whatsappToken);

  // Define new template details
  const templatePayload = {
    name: 'discount_alert_code', // must be lowercase, numbers, underscores only
    language: 'en_US',
    category: 'MARKETING',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Special Offer Just For You!',
      },
      {
        type: 'BODY',
        text: 'Hello! Use code SHOP20 to get 20% off on your next order. Valid for the next 48 hours.',
      },
      {
        type: 'FOOTER',
        text: 'Terms & conditions apply.',
      },
    ],
  };

  const url = `https://graph.facebook.com/v20.0/${config.wabaId}/message_templates`;
  console.log(`Sending template creation request to Meta API for WABA ID ${config.wabaId}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    console.log('\n✅ Template Created Successfully!');
    console.log('Created Template Details:', data);

    console.log('\n--- Syncing new templates to local database ---');
    await templateService.syncTemplates(shop);
    console.log('Database synced! Check data.txt or database to see it.');

  } catch (err: any) {
    console.error('\n❌ Failed to create template:', err.message || err);
  }
}

createTemplate().finally(async () => {
  await prisma.$disconnect();
});
