import type { LoaderFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { analyticsService } from '../modules/analytics/services/analytics.service';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const data = await analyticsService.getDashboardMetrics(shop);
    return Response.json(data);
  } catch (error: any) {
    console.error(`[ApiAnalyticsDashboardRoute] Failed to fetch analytics for shop ${shop}:`, error);
    return Response.json({ error: 'Failed to fetch analytics metrics' }, { status: 500 });
  }
};
