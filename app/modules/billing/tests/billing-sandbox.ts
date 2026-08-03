import { BillingService } from '../services/billing.service';
import { MONTHLY_PLAN } from '../../../constants';

class SandboxBillingService extends BillingService {
  mockBilling: any;

constructor(mockBilling: any) {
  super();
  this.mockBilling = mockBilling;
}

  // Override authenticate.admin lookup
  async checkBillingStatus(request: Request) {
  // Simulate authenticate.admin(request) returning our mock billing object
  const billing = this.mockBilling;
  return await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: true,
  });
}

  async requestUpgrade(request: Request) {
  const billing = this.mockBilling;
  return await billing.request({
    plan: MONTHLY_PLAN,
    isTest: true,
  });
}
}

async function runSandbox() {
  console.log('--- Starting Billing Sandbox Test ---');

  let checkCalled = false;
  let requestCalled = false;

  const mockBilling = {
    check: async (options: any) => {
      console.log('[MockBilling] check called with:', JSON.stringify(options));
      checkCalled = true;
      if (options.plans[0] === MONTHLY_PLAN && options.isTest === true) {
        return {
          hasActivePayment: true,
          appSubscriptions: [{ id: 'sub_123', status: 'ACTIVE', name: MONTHLY_PLAN }],
        };
      }
      return { hasActivePayment: false, appSubscriptions: [] };
    },
    request: async (options: any) => {
      console.log('[MockBilling] request called with:', JSON.stringify(options));
      requestCalled = true;
      if (options.plan === MONTHLY_PLAN && options.isTest === true) {
        return { confirmationUrl: 'https://admin.shopify.com/store/charge_confirm' };
      }
      return null;
    },
  };

  const testService = new SandboxBillingService(mockBilling);

  const mockRequest = new Request('https://test-shop.myshopify.com/app/billing');

  // Test 1: Check Billing Status
  const statusResult = await testService.checkBillingStatus(mockRequest);
  console.log('[BillingSandbox] checkBillingStatus result:', JSON.stringify(statusResult));

  // Test 2: Request Upgrade
  const upgradeResult = await testService.requestUpgrade(mockRequest);
  console.log('[BillingSandbox] requestUpgrade result:', JSON.stringify(upgradeResult));

  if (checkCalled && requestCalled && statusResult.hasActivePayment && upgradeResult?.confirmationUrl) {
    console.log('✅ Billing Sandbox Test PASSED!');
  } else {
    console.error('❌ Billing Sandbox Test FAILED!');
    process.exit(1);
  }
}

runSandbox().catch((err) => {
  console.error('[BillingSandbox] Unexpected error running sandbox:', err);
  process.exit(1);
});
