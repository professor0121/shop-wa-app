import { templateRepository, TemplateRepository } from '../repositories/template.repository';
import { whatsAppService, WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { decrypt } from '../../../core/security/encryption';
import prisma from '../../../db.server';

export class TemplateService {
  private repository: TemplateRepository;
  private whatsapp: WhatsAppService;

  constructor(
    repository: TemplateRepository = templateRepository,
    whatsapp: WhatsAppService = whatsAppService
  ) {
    this.repository = repository;
    this.whatsapp = whatsapp;
  }

  async syncTemplates(shop: string): Promise<void> {
    const config = await prisma.shopConfig.findUnique({
      where: { shop },
    });

    if (!config || !config.wabaId || !config.whatsappToken) {
      console.warn(`[TemplateService] Skipping sync for shop ${shop}: config is incomplete`);
      return;
    }

    const decryptedToken = decrypt(config.whatsappToken);
    const response = (await this.whatsapp.fetchMetaTemplates(
      config.wabaId,
      decryptedToken
    )) as { data: { id: string; name: string; language: string; status: string; category: string; components?: unknown }[] };

    if (!response || !Array.isArray(response.data)) {
      throw new Error('[TemplateService] Invalid templates response from Meta');
    }

    const templates = response.data;
    const activeTemplatesList: { name: string; language: string }[] = [];

    for (const t of templates) {
      if (!t.id || !t.name || !t.language || !t.status || !t.category) {
        continue;
      }

      await this.repository.upsertTemplate({
        id: t.id,
        shop,
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        components: t.components ?? {},
      });

      activeTemplatesList.push({ name: t.name, language: t.language });
    }

    await this.repository.deleteOrphanedTemplates(shop, activeTemplatesList);
  }
}

export const templateService = new TemplateService();
