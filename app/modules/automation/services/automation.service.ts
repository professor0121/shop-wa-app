import { automationRepository, AutomationRepository } from '../repositories/automation.repository';
import { whatsAppService, WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { queueService } from '../../queue/services/queue.service';
import { decrypt } from '../../../core/security/encryption';
import prisma from '../../../db.server';
import type { Checkout } from '@prisma/client';
import { notificationService } from '../../notification/services/notification.service';

export class AutomationService {
  private repository: AutomationRepository;
  private whatsapp: WhatsAppService;

  constructor(
    repository: AutomationRepository = automationRepository,
    whatsapp: WhatsAppService = whatsAppService
  ) {
    this.repository = repository;
    this.whatsapp = whatsapp;
  }

  async scheduleAbandonedCheckout(shop: string, checkout: Checkout): Promise<void> {
    const automation = await this.repository.getAutomation(shop, 'ABANDONED_CHECKOUT');
    if (!automation || !automation.active) {
      console.log(`[AutomationService] No active ABANDONED_CHECKOUT automation for shop: ${shop}`);
      return;
    }

    const delayMs = automation.delayHours * 60 * 60 * 1000;
    console.log(
      `[AutomationService] Scheduling abandoned checkout job for shop: ${shop}, checkout: ${checkout.id} with delay: ${automation.delayHours} hour(s) (${delayMs} ms)`
    );

    // Enqueue delayed job to process automation
    await queueService.enqueueJob(
      'PROCESS_AUTOMATION',
      {
        shop,
        checkoutId: checkout.id,
        triggerType: 'ABANDONED_CHECKOUT',
        checkoutUpdatedAt: checkout.updatedAt.toISOString(),
      },
      {
        delay: delayMs,
      }
    );
  }

  async processAbandonedCheckout(
    shop: string,
    checkoutId: string,
    checkoutUpdatedAt: string
  ): Promise<void> {
    console.log(`[AutomationService] Processing check for abandoned checkout ${checkoutId}`);

    // 1. Fetch current checkout details
    const checkout = await prisma.checkout.findUnique({
      where: { id: checkoutId },
    });

    if (!checkout) {
      console.log(`[AutomationService] Checkout ${checkoutId} not found. Skipping.`);
      return;
    }

    // 2. Check if already completed
    if (checkout.completed) {
      console.log(`[AutomationService] Checkout ${checkoutId} is already completed. Skipping.`);
      return;
    }

    // 3. Verify that the checkout hasn't been updated since this job was enqueued
    if (checkout.updatedAt.toISOString() !== checkoutUpdatedAt) {
      console.log(
        `[AutomationService] Checkout ${checkoutId} has been updated since this job was scheduled. Skipping (a newer job is scheduled).`
      );
      return;
    }

    // 4. Check if message has already been sent (prevent duplicate sends)
    if (checkout.abandonedEmailSent) {
      console.log(`[AutomationService] Abandoned message already sent for checkout ${checkoutId}. Skipping.`);
      return;
    }

    // 5. Fetch automation config
    const automation = await this.repository.getAutomation(shop, 'ABANDONED_CHECKOUT');
    if (!automation || !automation.active) {
      console.log(`[AutomationService] Automation is no longer active for shop ${shop}. Skipping.`);
      return;
    }

    // 6. Fetch Shop WABA config
    const config = await prisma.shopConfig.findUnique({
      where: { shop },
    });

    if (!config || !config.phoneNumberId || !config.whatsappToken) {
      console.warn(`[AutomationService] Incomplete WhatsApp configuration for shop: ${shop}. Skipping.`);
      await notificationService.createNotification(
        shop,
        'Automation Skipped',
        'Abandoned Checkout automation was skipped because your WhatsApp configuration is incomplete.',
        'WARNING'
      );
      return;
    }

    const decryptedToken = decrypt(config.whatsappToken);

    try {
      // 7. Send the template message
      console.log(
        `[AutomationService] Sending WhatsApp template "${automation.templateName}" to ${checkout.phone} for shop ${shop}`
      );

      const result = await this.whatsapp.sendTemplateMessage(
        config.phoneNumberId,
        decryptedToken,
        checkout.phone,
        automation.templateName,
        automation.templateLanguage
      );

      // 8. Log the message delivery success
      await prisma.messageLog.create({
        data: {
          id: result.messageId,
          shop,
          phone: checkout.phone,
          direction: 'OUTBOUND',
          status: 'SENT',
          body: `Template: ${automation.templateName} (${automation.templateLanguage})`,
        },
      });

      // 9. Update checkout to prevent future sends
      await prisma.checkout.update({
        where: { id: checkoutId },
        data: { abandonedEmailSent: true },
      });

      console.log(`[AutomationService] Abandoned checkout message sent successfully: ${result.messageId}`);
    } catch (error: any) {
      console.error(`[AutomationService] Failed to send abandoned checkout message:`, error);

      // Log failure in MessageLog
      await prisma.messageLog.create({
        data: {
          id: `failed-automation-${checkoutId}-${Date.now()}`,
          shop,
          phone: checkout.phone,
          direction: 'OUTBOUND',
          status: 'FAILED',
          errorMessage: error.message || 'Unknown error',
          body: `Template: ${automation.templateName} (${automation.templateLanguage})`,
        },
      });

      await notificationService.createNotification(
        shop,
        'Automation Message Failed',
        `Failed to send Abandoned Checkout reminder to ${checkout.phone}: ${error.message || 'Unknown error'}.`,
        'ERROR'
      );
    }
  }
}

export const automationService = new AutomationService();
