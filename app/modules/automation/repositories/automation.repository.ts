import prisma from '../../../db.server';
import type { Automation } from '@prisma/client';

export class AutomationRepository {
  async getAutomation(shop: string, triggerType: string): Promise<Automation | null> {
    return prisma.automation.findUnique({
      where: {
        shop_triggerType: {
          shop,
          triggerType,
        },
      },
    });
  }

  async listAutomations(shop: string): Promise<Automation[]> {
    return prisma.automation.findMany({
      where: { shop },
    });
  }

  async upsertAutomation(
    shop: string,
    triggerType: string,
    data: {
      templateName: string;
      templateLanguage: string;
      delayHours: number;
      active?: boolean;
    }
  ): Promise<Automation> {
    return prisma.automation.upsert({
      where: {
        shop_triggerType: {
          shop,
          triggerType,
        },
      },
      update: {
        templateName: data.templateName,
        templateLanguage: data.templateLanguage,
        delayHours: data.delayHours,
        active: data.active ?? true,
      },
      create: {
        shop,
        triggerType,
        templateName: data.templateName,
        templateLanguage: data.templateLanguage,
        delayHours: data.delayHours,
        active: data.active ?? true,
      },
    });
  }
}

export const automationRepository = new AutomationRepository();
