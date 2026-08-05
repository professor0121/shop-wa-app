import { decrypt } from './app/core/security/encryption';
import prisma from './app/db.server';
import { whatsAppService } from './app/modules/whatsapp/services/whatsapp.service';

const shop = 'developmentstore-txduifzb.myshopify.com';

async function main() {
  const args = process.argv.slice(2);
  const recipient = args[0];

  if (!recipient) {
    console.error('Usage: npx tsx send-test-message.ts <recipient_phone_number>');
    console.error('Example: npx tsx send-test-message.ts +1234567890');
    process.exit(1);
  }

  console.log('Fetching configuration for shop:', shop);
  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  if (!config || !config.whatsappToken || !config.phoneNumberId) {
    console.error('Error: Incomplete WhatsApp configuration in database. Run update-and-test.ts first.');
    process.exit(1);
  }

  const decryptedToken = decrypt(config.whatsappToken);
  console.log(`Sending hello_world (en_US) template to ${recipient}...`);

  try {
    const result = await whatsAppService.sendTemplateMessage(
      config.phoneNumberId,
      decryptedToken,
      recipient,
      'hello_world',
      'en_US'
    );
    console.log('Successfully sent message! Meta Message ID:', result.messageId);
  } catch (err: any) {
    console.error('Failed to send message:', err.message || err);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
