import { encrypt } from './app/core/security/encryption';
import prisma from './app/db.server';
import { whatsAppService } from './app/modules/whatsapp/services/whatsapp.service';
import { templateService } from './app/modules/template/services/template.service';

const shop = 'developmentstore-txduifzb.myshopify.com';

const whatsappTokenInput = 'EAAkBz6nfM9EBSLmk3ftiW2jyO9B4YXZCMaZBTJnFGsFUXlbqX45KtiymlMZCPQmX6bxbQ1hpTzZBqdWffBUtaoRf89X3HiES62izZBDFZCNOafxvI3RkDAMb1BgunuATzyVzq6BA4rlmmtwHUHvNGt5ktML18zAMioKBynFxPMvfZAcfoslDK41HIo9h6UPZAQZDZD';
const metaAppSecretInput = '8590664034b24d27b3eab6d368e528a6';
const phoneNumberIdInput = '1301851969672849';
const wabaIdInput = '1543463290811479';

async function main() {
  console.log('--- Updating Database Configuration ---');
  
  // Trim inputs just in case there are extra spaces
  const whatsappToken = whatsappTokenInput.trim();
  const metaAppSecret = metaAppSecretInput.trim();
  const phoneNumberId = phoneNumberIdInput.trim();
  const wabaId = wabaIdInput.trim();

  const encryptedToken = encrypt(whatsappToken);
  const encryptedAppSecret = encrypt(metaAppSecret);

  // Update shop config in database
  const config = await prisma.shopConfig.upsert({
    where: { shop },
    update: {
      whatsappToken: encryptedToken,
      metaAppSecret: encryptedAppSecret,
      phoneNumberId,
      wabaId,
    },
    create: {
      shop,
      whatsappToken: encryptedToken,
      metaAppSecret: encryptedAppSecret,
      phoneNumberId,
      wabaId,
      metaVerifyToken: 'wh_d236149b3119a9e52bab9727e1769bc3', // reuse or fallback
    },
  });

  console.log('Updated configuration in DB:', {
    shop: config.shop,
    phoneNumberId: config.phoneNumberId,
    wabaId: config.wabaId,
    metaVerifyToken: config.metaVerifyToken,
  });

  console.log('\n--- Testing Meta WhatsApp API Templates Fetch ---');
  try {
    const response: any = await whatsAppService.fetchMetaTemplates(wabaId, whatsappToken);
    console.log('Successfully fetched templates from Meta!');
    console.log(`Number of templates retrieved: ${response?.data?.length ?? 0}`);
    if (response?.data && response.data.length > 0) {
      console.log('First 3 templates preview:');
      console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
    }
  } catch (err: any) {
    console.error('Failed to fetch templates from Meta API:', err.message || err);
  }

  console.log('\n--- Testing Template Sync to DB ---');
  try {
    await templateService.syncTemplates(shop);
    console.log('Template sync completed!');
    const dbTemplates = await prisma.template.findMany({
      where: { shop },
    });
    console.log(`Number of templates in database now: ${dbTemplates.length}`);
    if (dbTemplates.length > 0) {
      console.log('Database templates stored:');
      console.log(dbTemplates.map(t => `${t.name} (${t.language}) - ${t.status}`).join('\n'));
    }
  } catch (err: any) {
    console.error('Failed to sync templates to database:', err.message || err);
  }
}

main()
  .catch((err) => {
    console.error('Fatal execution error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
