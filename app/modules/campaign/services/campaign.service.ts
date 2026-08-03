import { campaignRepository, CampaignRepository } from '../repositories/campaign.repository';
import { whatsAppService, WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { queueService } from '../../queue/services/queue.service';
import { decrypt } from '../../../core/security/encryption';
import prisma from '../../../db.server';

export class CampaignService {
  private repository: CampaignRepository;
  private whatsapp: WhatsAppService;

  constructor(
    repository: CampaignRepository = campaignRepository,
    whatsapp: WhatsAppService = whatsAppService
  ) {
    this.repository = repository;
    this.whatsapp = whatsapp;
  }

  async createAndScheduleCampaign(
    shop: string,
    data: {
      name: string;
      templateName: string;
      templateLanguage: string;
      scheduledAt?: Date | null;
    }
  ) {
    const isScheduled = data.scheduledAt && data.scheduledAt.getTime() > Date.now();
    const status = isScheduled ? 'SCHEDULED' : 'PENDING';

    const campaign = await this.repository.createCampaign(shop, {
      name: data.name,
      templateName: data.templateName,
      templateLanguage: data.templateLanguage,
      status,
      scheduledAt: data.scheduledAt,
    });

    const delay = isScheduled ? data.scheduledAt!.getTime() - Date.now() : 0;

    await queueService.enqueueJob(
      'PROCESS_CAMPAIGN',
      {
        shop,
        campaignId: campaign.id,
      },
      {
        delay,
      }
    );

    return campaign;
  }

  async processCampaign(shop: string, campaignId: string): Promise<void> {
    console.log(`[CampaignService] Processing campaign ${campaignId} for shop ${shop}`);

    const campaign = await this.repository.findById(campaignId);
    if (!campaign) {
      console.error(`[CampaignService] Campaign ${campaignId} not found.`);
      return;
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'PROCESSING') {
      console.log(`[CampaignService] Campaign ${campaignId} has status ${campaign.status}. Skipping.`);
      return;
    }

    // Update campaign status to PROCESSING
    await this.repository.updateCampaign(campaignId, { status: 'PROCESSING' });

    // 1. Get all opted-in customers for this shop
    const customers = await prisma.customer.findMany({
      where: {
        shop,
        optedIn: true,
      },
    });

    if (customers.length === 0) {
      console.log(`[CampaignService] No opted-in customers for shop ${shop}. Completing campaign.`);
      await this.repository.updateCampaign(campaignId, {
        status: 'COMPLETED',
        sentCount: 0,
        failedCount: 0,
      });
      return;
    }

    // 2. Fetch Shop WABA config
    const config = await prisma.shopConfig.findUnique({
      where: { shop },
    });

    if (!config || !config.phoneNumberId || !config.whatsappToken) {
      console.error(`[CampaignService] Incomplete WhatsApp config for shop: ${shop}. Failing campaign.`);
      await this.repository.updateCampaign(campaignId, {
        status: 'FAILED',
      });
      return;
    }

    const decryptedToken = decrypt(config.whatsappToken);
    let sent = 0;
    let failed = 0;

    // 3. Process each customer
    for (const customer of customers) {
      if (!customer.phone) {
        failed++;
        continue;
      }

      try {
        console.log(`[CampaignService] Dispatching campaign template "${campaign.templateName}" to ${customer.phone}`);
        const result = await this.whatsapp.sendTemplateMessage(
          config.phoneNumberId,
          decryptedToken,
          customer.phone,
          campaign.templateName,
          campaign.templateLanguage
        );

        // Log successful send
        await prisma.messageLog.create({
          data: {
            id: result.messageId,
            shop,
            phone: customer.phone,
            direction: 'OUTBOUND',
            status: 'SENT',
            campaignId: campaign.id,
            body: `Campaign: ${campaign.name} | Template: ${campaign.templateName} (${campaign.templateLanguage})`,
          },
        });

        sent++;
      } catch (error: any) {
        console.error(`[CampaignService] Failed to send campaign message to ${customer.phone}:`, error);

        // Log failed send
        await prisma.messageLog.create({
          data: {
            id: `failed-campaign-${campaign.id}-${customer.id}-${Date.now()}`,
            shop,
            phone: customer.phone,
            direction: 'OUTBOUND',
            status: 'FAILED',
            campaignId: campaign.id,
            errorMessage: error.message || String(error),
            body: `Campaign: ${campaign.name} | Template: ${campaign.templateName} (${campaign.templateLanguage})`,
          },
        });

        failed++;
      }
    }

    // 4. Update campaign stats to COMPLETED
    await this.repository.updateCampaign(campaignId, {
      status: 'COMPLETED',
      sentCount: sent,
      failedCount: failed,
    });

    console.log(`[CampaignService] Completed campaign ${campaignId}. Sent: ${sent}, Failed: ${failed}`);
  }
}

export const campaignService = new CampaignService();
