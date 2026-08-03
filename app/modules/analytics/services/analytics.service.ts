import { analyticsRepository, AnalyticsRepository } from '../repositories/analytics.repository';

export class AnalyticsService {
  private repository: AnalyticsRepository;

  constructor(repository: AnalyticsRepository = analyticsRepository) {
    this.repository = repository;
  }

  async getDashboardMetrics(shop: string) {
    const statusCounts = await this.repository.getStatusCounts(shop);
    const inboundCount = await this.repository.getInboundCount(shop);
    const recentLogs = await this.repository.getRecentLogs(shop, 10);
    const campaignStats = await this.repository.getCampaignStats(shop);

    const totalSent = statusCounts.SENT + statusCounts.DELIVERED + statusCounts.READ;
    const totalOutbound = totalSent + statusCounts.FAILED;

    const deliveryCount = statusCounts.DELIVERED + statusCounts.READ;
    const readCount = statusCounts.READ;
    const failedCount = statusCounts.FAILED;

    const deliveryRate = totalOutbound > 0 ? Math.round((deliveryCount / totalOutbound) * 100) : 0;
    const readRate = deliveryCount > 0 ? Math.round((readCount / deliveryCount) * 100) : 0;
    const failedRate = totalOutbound > 0 ? Math.round((failedCount / totalOutbound) * 100) : 0;

    return {
      metrics: {
        totalOutbound,
        totalSent,
        deliveryCount,
        readCount,
        failedCount,
        inboundCount,
        deliveryRate,
        readRate,
        failedRate,
      },
      recentLogs,
      campaignStats,
    };
  }
}

export const analyticsService = new AnalyticsService();
