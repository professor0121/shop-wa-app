import { useEffect, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Form, useActionData, useLoaderData, useFetcher, redirect } from 'react-router';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { billingService } from '../modules/billing/services/billing.service';
import type { Template, Automation } from '@prisma/client';
import prisma from '../db.server';
import { decrypt, encrypt } from '../core/security/encryption';
import { analyticsService } from '../modules/analytics/services/analytics.service';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const billingCheck = await billingService.checkBillingStatus(request);

  if (!billingCheck.hasActivePayment) {
    throw redirect('/app/billing');
  }

  const [shopConfig, templates, campaigns, automations, customerCount, optedInCount, analytics] = await Promise.all([
    prisma.shopConfig.findUnique({ where: { shop } }),
    prisma.template.findMany({ where: { shop }, orderBy: { updatedAt: 'desc' } }),
    prisma.campaign.findMany({ where: { shop }, orderBy: { createdAt: 'desc' } }),
    prisma.automation.findMany({ where: { shop } }),
    prisma.customer.count({ where: { shop } }),
    prisma.customer.count({ where: { shop, optedIn: true } }),
    analyticsService.getDashboardMetrics(shop),
  ]);

  let decryptedToken = '';
  if (shopConfig && shopConfig.whatsappToken) {
    try {
      decryptedToken = decrypt(shopConfig.whatsappToken);
    } catch (e) {
      console.error('Failed to decrypt token:', e);
    }
  }

  return {
    shopConfig: shopConfig ? { ...shopConfig, whatsappToken: decryptedToken } : null,
    templates,
    campaigns,
    automations,
    customerCount,
    optedInCount,
    analytics,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const actionType = formData.get('actionType');

  if (actionType === 'updateSettings') {
    const whatsappToken = formData.get('whatsappToken') as string;
    const phoneNumberId = formData.get('phoneNumberId') as string;
    const wabaId = formData.get('wabaId') as string;
    const optOutKeywords = (formData.get('optOutKeywords') as string) || 'STOP,UNSUBSCRIBE';

    if (!whatsappToken || !phoneNumberId || !wabaId) {
      return Response.json({ error: 'WhatsApp API Token, Phone Number ID, and WABA ID are all required.' }, { status: 400 });
    }

    try {
      const encryptedToken = encrypt(whatsappToken);

      const config = await prisma.shopConfig.upsert({
        where: { shop },
        update: {
          whatsappToken: encryptedToken,
          phoneNumberId,
          wabaId,
          optOutKeywords,
        },
        create: {
          shop,
          whatsappToken: encryptedToken,
          phoneNumberId,
          wabaId,
          optOutKeywords,
        },
      });

      return Response.json({ success: true, config });
    } catch (error: any) {
      console.error('[ActionDashboard] Settings save failed:', error);
      return Response.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
    }
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

export default function Index() {
  const {
    shopConfig,
    templates: rawTemplates,
    campaigns: initialCampaigns,
    automations: rawAutomations,
    customerCount,
    optedInCount,
    analytics,
  } = useLoaderData<typeof loader>();

  const templates = rawTemplates as Template[];
  const automations = rawAutomations as Automation[];
  const actionData = useActionData() as any;
  const shopify = useAppBridge();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'automations' | 'templates' | 'settings'>('overview');

  // Fetchers for background tasks
  const templatesFetcher = useFetcher() as any;
  const campaignsFetcher = useFetcher() as any;
  const automationsFetcher = useFetcher() as any;

  // Settings form state
  const [token, setToken] = useState(shopConfig?.whatsappToken || '');
  const [phoneId, setPhoneId] = useState(shopConfig?.phoneNumberId || '');
  const [wabaIdVal, setWabaIdVal] = useState(shopConfig?.wabaId || '');
  const [optOutWords, setOptOutWords] = useState(shopConfig?.optOutKeywords || 'STOP,UNSUBSCRIBE');

  // Campaign form state
  const [campaignName, setCampaignName] = useState('');
  const [campaignTemplate, setCampaignTemplate] = useState('');
  const [campaignLanguage, setCampaignLanguage] = useState('en_US');
  const [scheduledAt, setScheduledAt] = useState('');

  // Automation form state
  const checkoutAutomation = automations.find((a: any) => a.triggerType === 'ABANDONED_CHECKOUT');
  const [autoActive, setAutoActive] = useState(checkoutAutomation ? checkoutAutomation.active : false);
  const [autoTemplate, setAutoTemplate] = useState(checkoutAutomation ? checkoutAutomation.templateName : '');
  const [autoLanguage, setAutoLanguage] = useState(checkoutAutomation ? checkoutAutomation.templateLanguage : 'en_US');
  const [autoDelay, setAutoDelay] = useState(checkoutAutomation ? String(checkoutAutomation.delayHours) : '1');

  // Filter templates list to only approved ones
  const approvedTemplates = templates.filter((t) => t.status === 'APPROVED');

  // Effect to handle Settings Save Notification
  useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success) {
      shopify.toast.show('Settings saved successfully');
    } else if (actionData && 'error' in actionData && actionData.error) {
      shopify.toast.show(`Error: ${actionData.error}`);
    }
  }, [actionData, shopify]);

  // Effect to handle Template Sync Notification
  useEffect(() => {
    if (templatesFetcher.data?.success) {
      shopify.toast.show('WhatsApp templates synced successfully');
    } else if (templatesFetcher.data?.error) {
      shopify.toast.show(`Template sync failed: ${templatesFetcher.data.error}`);
    }
  }, [templatesFetcher.data, shopify]);

  // Effect to handle Campaign Creation Notification
  useEffect(() => {
    if (campaignsFetcher.data?.success) {
      shopify.toast.show('Campaign scheduled successfully');
      setCampaignName('');
      setCampaignTemplate('');
      setCampaignLanguage('en_US');
      setScheduledAt('');
    } else if (campaignsFetcher.data?.error) {
      shopify.toast.show(`Campaign failed: ${campaignsFetcher.data.error}`);
    }
  }, [campaignsFetcher.data, shopify]);

  // Effect to handle Automation Saved Notification
  useEffect(() => {
    if (automationsFetcher.data?.success) {
      shopify.toast.show('Automation settings saved');
    } else if (automationsFetcher.data?.error) {
      shopify.toast.show(`Automation failed: ${automationsFetcher.data.error}`);
    }
  }, [automationsFetcher.data, shopify]);

  const handleSyncTemplates = () => {
    templatesFetcher.submit({}, { method: 'POST', action: '/api/templates' });
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !campaignTemplate || !campaignLanguage) {
      shopify.toast.show('Please fill in all campaign fields');
      return;
    }
    campaignsFetcher.submit(
      {
        name: campaignName,
        templateName: campaignTemplate,
        templateLanguage: campaignLanguage,
        scheduledAt: scheduledAt || undefined,
      },
      { method: 'POST', action: '/api/campaigns' }
    );
  };

  const handleSaveAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoTemplate || !autoLanguage || autoDelay === '') {
      shopify.toast.show('Please complete all automation config fields');
      return;
    }
    automationsFetcher.submit(
      {
        triggerType: 'ABANDONED_CHECKOUT',
        templateName: autoTemplate,
        templateLanguage: autoLanguage,
        delayHours: autoDelay,
        active: String(autoActive),
      },
      { method: 'POST', action: '/api/automations' }
    );
  };

  const getBodyText = (components: any) => {
    if (!components || !Array.isArray(components)) return '';
    const bodyComponent = components.find((c: any) => c.type === 'BODY');
    return bodyComponent?.text || '';
  };

  const getBadgeTone = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
      case 'SCHEDULED':
        return 'warning';
      case 'FAILED':
        return 'critical';
      default:
        return undefined;
    }
  };

  return (
    <s-page heading="Shopify WhatsApp Manager">
      {/* Configuration Status Warning */}
      {(!shopConfig?.whatsappToken || !shopConfig?.phoneNumberId || !shopConfig?.wabaId) && (
        <s-banner tone="critical" heading="WhatsApp Credentials Required">
          <s-paragraph>
            Please set up your Meta WhatsApp API credentials in the <strong>Settings</strong> tab below to enable automated reminders and bulk template campaigns.
          </s-paragraph>
        </s-banner>
      )}

      {/* Tabs Layout Button Stack */}
      <div style={{ marginBottom: '1.5rem' }}>
        <s-box padding="base" background="subdued" borderWidth="base" borderRadius="base">
          <s-stack direction="inline" gap="base">
            <s-button onClick={() => setActiveTab('overview')} variant={activeTab === 'overview' ? 'primary' : 'tertiary'}>
              Overview
            </s-button>
            <s-button onClick={() => setActiveTab('campaigns')} variant={activeTab === 'campaigns' ? 'primary' : 'tertiary'}>
              Campaigns
            </s-button>
            <s-button onClick={() => setActiveTab('automations')} variant={activeTab === 'automations' ? 'primary' : 'tertiary'}>
              Automations
            </s-button>
            <s-button onClick={() => setActiveTab('templates')} variant={activeTab === 'templates' ? 'primary' : 'tertiary'}>
              WhatsApp Templates
            </s-button>
            <s-button onClick={() => setActiveTab('settings')} variant={activeTab === 'settings' ? 'primary' : 'tertiary'}>
              Settings
            </s-button>
          </s-stack>
        </s-box>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <s-stack direction="block" gap="base">
          {/* KPI Dashboard Cards - Row 1: General Stats */}
          <div style={{ width: '100%' }}>
            <s-stack direction="inline" gap="base">
              <div style={{ flex: 1, minWidth: '200px' }}>
                <s-box padding="base" borderWidth="base" borderRadius="base">
                  <s-heading>Total Customers</s-heading>
                  <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{customerCount}</h2>
                </s-box>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <s-box padding="base" borderWidth="base" borderRadius="base">
                  <s-heading>Opted-In Contacts</s-heading>
                  <h2 style={{ fontSize: '2rem', color: '#108548', margin: '0.5rem 0 0 0' }}>
                    {optedInCount}{' '}
                    <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#6d7175' }}>
                      ({customerCount > 0 ? Math.round((optedInCount / customerCount) * 100) : 0}%)
                    </span>
                  </h2>
                </s-box>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <s-box padding="base" borderWidth="base" borderRadius="base">
                  <s-heading>Broadcast Campaigns</s-heading>
                  <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{initialCampaigns.length}</h2>
                </s-box>
              </div>
            </s-stack>
          </div>

          {/* KPI Dashboard Cards - Row 2: WhatsApp Analytics */}
          <div style={{ width: '100%' }}>
            <s-stack direction="inline" gap="base">
              <div style={{ flex: 1, minWidth: '200px' }}>
                <s-box padding="base" borderWidth="base" borderRadius="base">
                  <s-heading>Delivery Rate</s-heading>
                  <h2 style={{ fontSize: '2rem', color: '#108548', margin: '0.5rem 0 0 0' }}>
                    {analytics.metrics.deliveryRate}%
                    <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#6d7175', marginLeft: '6px' }}>
                      ({analytics.metrics.deliveryCount} / {analytics.metrics.totalOutbound})
                    </span>
                  </h2>
                </s-box>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <s-box padding="base" borderWidth="base" borderRadius="base">
                  <s-heading>Read Rate (Open Rate)</s-heading>
                  <h2 style={{ fontSize: '2rem', color: '#005ea2', margin: '0.5rem 0 0 0' }}>
                    {analytics.metrics.readRate}%
                    <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#6d7175', marginLeft: '6px' }}>
                      ({analytics.metrics.readCount} read)
                    </span>
                  </h2>
                </s-box>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <s-box padding="base" borderWidth="base" borderRadius="base">
                  <s-heading>Inbound Replies</s-heading>
                  <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>
                    {analytics.metrics.inboundCount}
                  </h2>
                </s-box>
              </div>
            </s-stack>
          </div>

          <s-section heading="System Integration Status">
            <s-paragraph>
              This app automatically syncs Shopify customer data and schedules Meta template reminders based on events (like cart abandonment). You can manage active template files, review metrics, and execute bulk marketing campaigns directly.
            </s-paragraph>
            <div style={{ marginTop: '1rem' }}>
              <s-stack direction="inline" gap="base">
                <s-button onClick={() => setActiveTab('campaigns')}>Create Campaign</s-button>
                <s-button onClick={handleSyncTemplates} {...(templatesFetcher.state === 'submitting' ? { loading: true } : {})}>
                  Sync Templates
                </s-button>
              </s-stack>
            </div>
          </s-section>

          {/* Recent WhatsApp Dispatch Activity Log */}
          <s-section heading="Recent WhatsApp Dispatch Activity">
            {analytics.recentLogs.length === 0 ? (
              <s-paragraph>No recent message activity logged.</s-paragraph>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e1e3e5' }}>
                      <th style={{ padding: '8px' }}>Phone</th>
                      <th style={{ padding: '8px' }}>Direction</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Content</th>
                      <th style={{ padding: '8px' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentLogs.map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #e1e3e5' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{log.phone}</td>
                        <td style={{ padding: '8px' }}>
                          <s-badge tone={log.direction === 'INBOUND' ? 'neutral' : 'info'}>
                            {log.direction}
                          </s-badge>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <s-badge tone={getBadgeTone(log.status)}>{log.status}</s-badge>
                        </td>
                        <td style={{ padding: '8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.body || ''}
                        </td>
                        <td style={{ padding: '8px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </s-section>
        </s-stack>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <s-stack direction="block" gap="base">
          <s-section heading="Schedule Bulk Campaign">
            {approvedTemplates.length === 0 ? (
              <s-banner tone="warning" heading="No Synced Templates">
                <s-paragraph>
                  You must sync approved WhatsApp templates before creating a campaign. Go to the <strong>Templates</strong> tab and click sync.
                </s-paragraph>
              </s-banner>
            ) : (
              <form onSubmit={handleCreateCampaign}>
                <s-stack direction="block" gap="base">
                  <s-text-field
                    label="Campaign Name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.currentTarget.value)}
                    required
                  ></s-text-field>

                  <s-select
                    label="WhatsApp Template"
                    value={campaignTemplate}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      setCampaignTemplate(val);
                      const t = approvedTemplates.find((x: any) => x.name === val);
                      if (t) setCampaignLanguage(t.language);
                    }}
                    required
                  >
                    <s-option value="">Select template...</s-option>
                    {approvedTemplates.map((t) => (
                      <s-option key={t.id} value={t.name}>
                        {t.name} ({t.language})
                      </s-option>
                    ))}
                  </s-select>

                  <s-text-field
                    label="Language Code"
                    value={campaignLanguage}
                    onChange={(e) => setCampaignLanguage(e.currentTarget.value)}
                    required
                    readOnly
                  ></s-text-field>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Schedule Time (Optional)</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #c9cccf',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <span style={{ color: '#6d7175', fontSize: '0.875rem' }}>Leave blank to send immediately.</span>
                  </div>

                  <s-button type="submit" {...(campaignsFetcher.state === 'submitting' ? { loading: true } : {})}>
                    Dispatch Campaign
                  </s-button>
                </s-stack>
              </form>
            )}
          </s-section>

          <s-section heading="Campaign History">
            {initialCampaigns.length === 0 ? (
              <s-paragraph>No broadcast campaigns found.</s-paragraph>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e1e3e5' }}>
                      <th style={{ padding: '8px' }}>Name</th>
                      <th style={{ padding: '8px' }}>Template</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Sent</th>
                      <th style={{ padding: '8px' }}>Failed</th>
                      <th style={{ padding: '8px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialCampaigns.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #e1e3e5' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.name}</td>
                        <td style={{ padding: '8px' }}>{c.templateName} ({c.templateLanguage})</td>
                        <td style={{ padding: '8px' }}>
                          <s-badge tone={getBadgeTone(c.status)}>{c.status}</s-badge>
                        </td>
                        <td style={{ padding: '8px', color: '#108548' }}>{c.sentCount}</td>
                        <td style={{ padding: '8px', color: '#bf0711' }}>{c.failedCount}</td>
                        <td style={{ padding: '8px' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </s-section>
        </s-stack>
      )}

      {/* Automations Tab */}
      {activeTab === 'automations' && (
        <s-stack direction="block" gap="base">
          <s-section heading="Abandoned Checkout Reminder">
            <div style={{ marginBottom: '1rem' }}>
              <s-paragraph>
                Automatically triggers and schedules a WhatsApp template message when a checkout is abandoned by a customer.
              </s-paragraph>
            </div>
            <form onSubmit={handleSaveAutomation}>
              <s-stack direction="block" gap="base">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="autoActive"
                    checked={autoActive}
                    onChange={(e) => setAutoActive(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="autoActive" style={{ fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
                    Enable Abandoned Checkout Reminders
                  </label>
                </div>

                {approvedTemplates.length === 0 ? (
                  <s-banner tone="warning" heading="No Synced Templates">
                    <s-paragraph>
                      Configure and sync WhatsApp templates to select a reminder template.
                    </s-paragraph>
                  </s-banner>
                ) : (
                  <>
                    <s-select
                      label="WhatsApp Template"
                      value={autoTemplate}
                      onChange={(e) => {
                        const val = e.currentTarget.value;
                        setAutoTemplate(val);
                        const t = approvedTemplates.find((x) => x.name === val);
                        if (t) setAutoLanguage(t.language);
                      }}
                      required
                    >
                      <s-option value="">Select template...</s-option>
                      {approvedTemplates.map((t) => (
                        <s-option key={t.id} value={t.name}>
                          {t.name} ({t.language})
                        </s-option>
                      ))}
                    </s-select>

                    <s-text-field
                      label="Language Code"
                      value={autoLanguage}
                      onChange={(e) => setAutoLanguage(e.currentTarget.value)}
                      required
                      readOnly
                    ></s-text-field>
                  </>
                )}

                <s-text-field
                  label="Delay Hours"
                  value={autoDelay}
                  onChange={(e) => setAutoDelay(e.currentTarget.value)}
                  required
                ></s-text-field>

                <s-button type="submit" {...(automationsFetcher.state === 'submitting' ? { loading: true } : {})}>
                  Save Automation
                </s-button>
              </s-stack>
            </form>
          </s-section>
        </s-stack>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <s-stack direction="block" gap="base">
          <s-section heading="Meta WhatsApp Templates">
            <div style={{ marginBottom: '1rem' }}>
              <s-paragraph>
                These templates are imported from Meta and must be approved before you can send them to customers.
              </s-paragraph>
            </div>
            <s-button onClick={handleSyncTemplates} {...(templatesFetcher.state === 'submitting' ? { loading: true } : {})}>
              Sync Templates
            </s-button>
          </s-section>

          <s-section heading="Template Files">
            {templates.length === 0 ? (
              <s-paragraph>No templates found. Click "Sync Templates" to load templates from Meta.</s-paragraph>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {templates.map((t) => (
                  <s-box key={t.id} padding="base" borderWidth="base" borderRadius="base">
                    <s-stack direction="block" gap="base">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ wordBreak: 'break-all' }}>
                          <s-heading>{t.name}</s-heading>
                        </div>
                        <s-badge tone={t.status === 'APPROVED' ? 'success' : 'warning'}>{t.status}</s-badge>
                      </div>
                      <span style={{ color: '#6d7175', fontSize: '0.875rem' }}>
                        Category: {t.category} | Language: {t.language}
                      </span>
                      <s-box padding="base" background="subdued" borderRadius="base">
                        <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                          {getBodyText(t.components)}
                        </pre>
                      </s-box>
                    </s-stack>
                  </s-box>
                ))}
              </div>
            )}
          </s-section>
        </s-stack>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <s-stack direction="block" gap="base">
          <s-section heading="WhatsApp Settings Configuration">
            <Form method="post">
              <input type="hidden" name="actionType" value="updateSettings" />
              <s-stack direction="block" gap="base">
                <s-password-field
                  label="WhatsApp API Access Token"
                  name="whatsappToken"
                  value={token}
                  onChange={(e) => setToken(e.currentTarget.value)}
                  required
                ></s-password-field>

                <s-text-field
                  label="WhatsApp Phone Number ID"
                  name="phoneNumberId"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.currentTarget.value)}
                  required
                ></s-text-field>

                <s-text-field
                  label="WhatsApp Business Account (WABA) ID"
                  name="wabaId"
                  value={wabaIdVal}
                  onChange={(e) => setWabaIdVal(e.currentTarget.value)}
                  required
                ></s-text-field>

                <s-text-field
                  label="Opt-Out Keywords (Comma Separated)"
                  name="optOutKeywords"
                  value={optOutWords}
                  onChange={(e) => setOptOutWords(e.currentTarget.value)}
                  required
                ></s-text-field>

                <s-button type="submit">Save Settings</s-button>
              </s-stack>
            </Form>
          </s-section>
        </s-stack>
      )}
    </s-page>
  );
}
