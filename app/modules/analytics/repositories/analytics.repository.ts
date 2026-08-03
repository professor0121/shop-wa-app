import prisma from '../../../db.server';

export class AnalyticsRepository {
  async getStatusCounts(shop: string) {
    const outboundLogs = await prisma.messageLog.findMany({
      where: { shop, direction: 'OUTBOUND' },
      select: { status: true },
    });

    const counts = {
      SENT: 0,
      DELIVERED: 0,
      READ: 0,
      FAILED: 0,
    };

    for (const log of outboundLogs) {
      if (log.status in counts) {
        counts[log.status as keyof typeof counts]++;
      }
    }

    return counts;
  }

  async getInboundCount(shop: string): Promise<number> {
    return prisma.messageLog.count({
      where: { shop, direction: 'INBOUND' },
    });
  }

  async getRecentLogs(shop: string, limit = 10) {
    return prisma.messageLog.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getCampaignStats(shop: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { shop },
      select: {
        id: true,
        name: true,
        status: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return campaigns;
  }
}

export const analyticsRepository = new AnalyticsRepository();
