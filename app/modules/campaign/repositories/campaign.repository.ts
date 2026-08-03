import prisma from '../../../db.server';
import type { Campaign, Prisma } from '@prisma/client';

export class CampaignRepository {
  async findById(id: string): Promise<Campaign | null> {
    return prisma.campaign.findUnique({
      where: { id },
    });
  }

  async listCampaigns(shop: string): Promise<Campaign[]> {
    return prisma.campaign.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(
    shop: string,
    data: {
      name: string;
      templateName: string;
      templateLanguage: string;
      status: string;
      scheduledAt?: Date | null;
    }
  ): Promise<Campaign> {
    return prisma.campaign.create({
      data: {
        shop,
        name: data.name,
        templateName: data.templateName,
        templateLanguage: data.templateLanguage,
        status: data.status,
        scheduledAt: data.scheduledAt,
      },
    });
  }

  async updateCampaign(
    id: string,
    data: Prisma.CampaignUpdateInput
  ): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data,
    });
  }
}

export const campaignRepository = new CampaignRepository();
