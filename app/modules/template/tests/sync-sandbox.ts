import { TemplateService } from '../services/template.service';
import type { TemplateRepository } from '../repositories/template.repository';
import type { WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { encrypt } from '../../../core/security/encryption';
import prisma from '../../../db.server';

class MockWhatsAppService implements Partial<WhatsAppService> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchMetaTemplates(wabaId: string, _decryptedToken: string): Promise<unknown> {
    console.log(`[MockWhatsAppService] Fetching templates for wabaId: ${wabaId}`);
    return {
      data: [
        {
          id: '111222333',
          name: 'welcome_message',
          language: 'en_US',
          category: 'UTILITY',
          status: 'APPROVED',
          components: [
            { type: 'BODY', text: 'Welcome to our store! Here is your discount code.' },
          ],
        },
        {
          id: '444555666',
          name: 'abandoned_cart_reminder',
          language: 'en_US',
          category: 'MARKETING',
          status: 'APPROVED',
          components: [
            { type: 'BODY', text: 'You left items in your cart!' },
          ],
        },
      ],
    };
  }
}

class MockTemplateRepository implements Partial<TemplateRepository> {
  upserted: unknown[] = [];
  deletedOrphaned: string[] = [];

  async upsertTemplate(data: any): Promise<any> {
    const templateData = data as { name: string; language: string };
    console.log(`[MockTemplateRepository] Upserting template: ${templateData.name} (${templateData.language})`);
    this.upserted.push(data);
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteOrphanedTemplates(shop: string, _activeList: unknown[]): Promise<void> {
    console.log(`[MockTemplateRepository] Cleaning up orphaned templates for shop: ${shop}`);
    this.deletedOrphaned.push(shop);
  }
}

export async function runSandbox() {
  const shop = 'developmentstore-txduifzb.myshopify.com';

  console.log('--- Starting Template Sync Sandbox Test ---');

  // Setup test ShopConfig in database
  const encryptedToken = encrypt('mock-meta-whatsapp-access-token-123456');
  await prisma.shopConfig.upsert({
    where: { shop },
    update: {
      whatsappToken: encryptedToken,
      wabaId: 'mock-waba-id-999',
    },
    create: {
      shop,
      whatsappToken: encryptedToken,
      wabaId: 'mock-waba-id-999',
    },
  });

  const mockRepo = new MockTemplateRepository() as unknown as TemplateRepository;
  const mockWhatsapp = new MockWhatsAppService() as unknown as WhatsAppService;
  const service = new TemplateService(mockRepo, mockWhatsapp);

  await service.syncTemplates(shop);

  const castedRepo = mockRepo as unknown as MockTemplateRepository;
  console.log(`Upserted count: ${castedRepo.upserted.length}`);
  console.log('Test completed successfully!');
  console.log('-------------------------------------------');
}
