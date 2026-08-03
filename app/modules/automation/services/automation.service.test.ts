import { describe, it, expect, vi } from 'vitest';
import { AutomationService } from './automation.service';
import type { Checkout } from '@prisma/client';

// 1. Mock db.server
vi.mock('../../../db.server', () => {
  return {
    default: {
      checkout: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      shopConfig: {
        findUnique: vi.fn(),
      },
      messageLog: {
        create: vi.fn(),
      },
    },
  };
});

// 2. Mock external services
vi.mock('../../queue/services/queue.service', () => {
  return {
    queueService: {
      enqueueJob: vi.fn(),
    },
  };
});

vi.mock('../../notification/services/notification.service', () => {
  return {
    notificationService: {
      createNotification: vi.fn(),
    },
  };
});

describe('AutomationService Unit Tests', () => {
  const mockRepository = {
    getAutomation: vi.fn(),
  } as any;

  const mockWhatsapp = {
    sendTemplateMessage: vi.fn(),
  } as any;

  const service = new AutomationService(mockRepository, mockWhatsapp);

  describe('scheduleAbandonedCheckout', () => {
    it('should schedule checkout job when automation config is active', async () => {
      mockRepository.getAutomation.mockResolvedValue({
        active: true,
        delayHours: 2,
      });

      const checkout = {
        id: 'checkout-123',
        updatedAt: new Date('2026-08-03T10:00:00Z'),
      } as Checkout;

      const { queueService } = await import('../../queue/services/queue.service');

      await service.scheduleAbandonedCheckout('test-shop.myshopify.com', checkout);

      expect(mockRepository.getAutomation).toHaveBeenCalledWith('test-shop.myshopify.com', 'ABANDONED_CHECKOUT');
      expect(queueService.enqueueJob).toHaveBeenCalledWith(
        'PROCESS_AUTOMATION',
        {
          shop: 'test-shop.myshopify.com',
          checkoutId: 'checkout-123',
          triggerType: 'ABANDONED_CHECKOUT',
          checkoutUpdatedAt: checkout.updatedAt.toISOString(),
        },
        {
          delay: 2 * 60 * 60 * 1000,
        }
      );
    });

    it('should not schedule job when automation config is inactive', async () => {
      mockRepository.getAutomation.mockResolvedValue({
        active: false,
        delayHours: 2,
      });

      const checkout = {
        id: 'checkout-123',
        updatedAt: new Date(),
      } as Checkout;

      const { queueService } = await import('../../queue/services/queue.service');

      await service.scheduleAbandonedCheckout('test-shop.myshopify.com', checkout);

      expect(queueService.enqueueJob).not.toHaveBeenCalled();
    });
  });

  describe('processAbandonedCheckout', () => {
    const shop = 'test-shop.myshopify.com';
    const checkoutId = 'checkout-123';
    const updatedAtIso = '2026-08-03T10:00:00.000Z';

    it('should skip if checkout is not found', async () => {
      const db = (await import('../../../db.server')).default;
      (db.checkout.findUnique as any).mockResolvedValue(null);

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(db.checkout.findUnique).toHaveBeenCalledWith({ where: { id: checkoutId } });
      expect(mockRepository.getAutomation).not.toHaveBeenCalled();
    });

    it('should skip if checkout is completed', async () => {
      const db = (await import('../../../db.server')).default;
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: true,
        updatedAt: new Date(updatedAtIso),
      });

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(mockRepository.getAutomation).not.toHaveBeenCalled();
    });

    it('should skip if checkout has been updated since enqueued', async () => {
      const db = (await import('../../../db.server')).default;
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: false,
        updatedAt: new Date('2026-08-03T11:00:00.000Z'), // newer
      });

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(mockRepository.getAutomation).not.toHaveBeenCalled();
    });

    it('should skip if abandoned reminder was already sent', async () => {
      const db = (await import('../../../db.server')).default;
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: false,
        updatedAt: new Date(updatedAtIso),
        abandonedEmailSent: true,
      });

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(mockRepository.getAutomation).not.toHaveBeenCalled();
    });

    it('should skip if automation settings is inactive', async () => {
      const db = (await import('../../../db.server')).default;
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: false,
        updatedAt: new Date(updatedAtIso),
        abandonedEmailSent: false,
      });
      mockRepository.getAutomation.mockResolvedValue(null);

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(mockRepository.getAutomation).toHaveBeenCalledWith(shop, 'ABANDONED_CHECKOUT');
      expect(db.shopConfig.findUnique).not.toHaveBeenCalled();
    });

    it('should trigger notification and skip if shop config is incomplete', async () => {
      const db = (await import('../../../db.server')).default;
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: false,
        updatedAt: new Date(updatedAtIso),
        abandonedEmailSent: false,
        phone: '+1234567890',
      });
      mockRepository.getAutomation.mockResolvedValue({
        active: true,
        templateName: 'abandoned_cart',
        templateLanguage: 'en_US',
      });
      (db.shopConfig.findUnique as any).mockResolvedValue(null);

      const { notificationService } = await import('../../notification/services/notification.service');

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        shop,
        'Automation Skipped',
        expect.any(String),
        'WARNING'
      );
    });

    it('should send WhatsApp message and update database on success', async () => {
      const db = (await import('../../../db.server')).default;
      const { encrypt } = await import('../../../core/security/encryption');
      
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: false,
        updatedAt: new Date(updatedAtIso),
        abandonedEmailSent: false,
        phone: '+1234567890',
      });
      mockRepository.getAutomation.mockResolvedValue({
        active: true,
        templateName: 'abandoned_cart',
        templateLanguage: 'en_US',
      });
      (db.shopConfig.findUnique as any).mockResolvedValue({
        phoneNumberId: 'phone-id-123',
        whatsappToken: encrypt('secret-token'),
      });
      mockWhatsapp.sendTemplateMessage.mockResolvedValue({
        messageId: 'wamid-123456',
      });

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(mockWhatsapp.sendTemplateMessage).toHaveBeenCalledWith(
        'phone-id-123',
        'secret-token',
        '+1234567890',
        'abandoned_cart',
        'en_US'
      );
      expect(db.messageLog.create).toHaveBeenCalledWith({
        data: {
          id: 'wamid-123456',
          shop,
          phone: '+1234567890',
          direction: 'OUTBOUND',
          status: 'SENT',
          body: 'Template: abandoned_cart (en_US)',
        },
      });
      expect(db.checkout.update).toHaveBeenCalledWith({
        where: { id: checkoutId },
        data: { abandonedEmailSent: true },
      });
    });

    it('should log message as failed and create system notification on API failure', async () => {
      const db = (await import('../../../db.server')).default;
      const { encrypt } = await import('../../../core/security/encryption');
      const { notificationService } = await import('../../notification/services/notification.service');
      
      (db.checkout.findUnique as any).mockResolvedValue({
        id: checkoutId,
        completed: false,
        updatedAt: new Date(updatedAtIso),
        abandonedEmailSent: false,
        phone: '+1234567890',
      });
      mockRepository.getAutomation.mockResolvedValue({
        active: true,
        templateName: 'abandoned_cart',
        templateLanguage: 'en_US',
      });
      (db.shopConfig.findUnique as any).mockResolvedValue({
        phoneNumberId: 'phone-id-123',
        whatsappToken: encrypt('secret-token'),
      });
      mockWhatsapp.sendTemplateMessage.mockRejectedValue(new Error('Meta API error'));

      await service.processAbandonedCheckout(shop, checkoutId, updatedAtIso);

      expect(db.messageLog.create).toHaveBeenCalledWith({
        data: {
          id: expect.stringContaining('failed-automation-'),
          shop,
          phone: '+1234567890',
          direction: 'OUTBOUND',
          status: 'FAILED',
          errorMessage: 'Meta API error',
          body: 'Template: abandoned_cart (en_US)',
        },
      });
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        shop,
        'Automation Message Failed',
        expect.stringContaining('Meta API error'),
        'ERROR'
      );
      expect(db.checkout.update).not.toHaveBeenCalled();
    });
  });
});
