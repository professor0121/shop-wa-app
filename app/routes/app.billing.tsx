import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useEffect } from 'react';
import { billingService } from '../modules/billing/services/billing.service';
import { MONTHLY_PLAN } from '../constants';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const billingCheck = await billingService.checkBillingStatus(request);

    return Response.json({
      hasActivePayment: billingCheck.hasActivePayment,
      appSubscriptions: billingCheck.appSubscriptions,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[BillingRoute] Failed to check billing status:', error);
    return Response.json({ hasActivePayment: false, appSubscriptions: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get('action');

  if (actionType === 'upgrade') {
    return await billingService.requestUpgrade(request);
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
};

export default function BillingPage() {
  const { hasActivePayment, appSubscriptions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.data?.error) {
      shopify.toast.show(`Billing Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify]);

  const activeSub = (appSubscriptions as any)?.find((sub: any) => sub.status === 'ACTIVE');

  return (
    <s-page heading="App Subscription Plans">
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>{MONTHLY_PLAN}</s-heading>

            <div style={{ margin: '1.5rem 0' }}>
              <h2 style={{ fontSize: '3rem', margin: '0' }}>
                $9.99
                <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#6d7175' }}> / month</span>
              </h2>
              <s-paragraph>Enjoy a 7-day free trial. Cancel anytime.</s-paragraph>
            </div>

            <s-section heading="Included Features">
              <s-unordered-list>
                <s-list-item>Unlimited customer contacts sync</s-list-item>
                <s-list-item>Abandoned checkout WhatsApp reminders</s-list-item>
                <s-list-item>Bulk marketing template campaigns</s-list-item>
                <s-list-item>Real-time delivery status & open-rate analytics</s-list-item>
              </s-unordered-list>
            </s-section>

            <div style={{ borderTop: '1px solid #e1e3e5', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              {hasActivePayment && activeSub ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <s-paragraph>
                      Status: <strong>Active Subscription</strong>
                    </s-paragraph>
                    {activeSub.createdAt && (
                      <s-paragraph>
                        Subscribed since: {new Date(activeSub.createdAt).toLocaleDateString()}
                      </s-paragraph>
                    )}
                  </div>
                  <s-badge tone="success">Active</s-badge>
                </div>
              ) : (
                <fetcher.Form method="POST">
                  <input type="hidden" name="action" value="upgrade" />
                  <s-button type="submit" variant="primary" {...(isSubmitting ? { loading: true } : {})}>
                    Upgrade to Premium ($9.99/mo)
                  </s-button>
                </fetcher.Form>
              )}
            </div>
          </s-stack>
        </s-box>
      </div>
    </s-page>
  );
}
