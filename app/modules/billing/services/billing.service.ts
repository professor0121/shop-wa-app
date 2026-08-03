import { authenticate } from '../../../shopify.server';
import { MONTHLY_PLAN } from '../../../constants';

export class BillingService {
  /**
   * Checks if the shop associated with the request has an active payment plan.
   */
  async checkBillingStatus(request: Request) {
    if (process.env.BYPASS_BILLING === 'true' || (process.env.NODE_ENV === 'development' && process.env.BYPASS_BILLING !== 'false')) {
      return {
        hasActivePayment: true,
        appSubscriptions: [
          {
            name: MONTHLY_PLAN,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          }
        ],
      };
    }
    const { billing } = await authenticate.admin(request);
    return await billing.check({
      plans: [MONTHLY_PLAN],
      isTest: true,
    });
  }

  /**
   * Redirects the user to the Shopify confirmation flow to request an upgrade to the monthly plan.
   */
  async requestUpgrade(request: Request): Promise<any> {
    const { billing } = await authenticate.admin(request);
    return await billing.request({
      plan: MONTHLY_PLAN,
      isTest: true,
    });
  }
}

export const billingService = new BillingService();
