export default function AdditionalPage() {
  return (
    <s-page heading="Shopify WhatsApp App Setup & Onboarding Guide">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 600px', minWidth: '0' }}>
          {/* Introduction Card */}
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack gap="base">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                Welcome to your Shopify WhatsApp Manager!
              </h2>
              <s-paragraph>
                This app connects your Shopify store with the Meta WhatsApp Cloud API to automate customer notifications and run promotional campaigns. Below is a comprehensive step-by-step guide on how to configure and use the app.
              </s-paragraph>
            </s-stack>
          </s-box>

          {/* Step 1 */}
          <s-section heading="Step 1: Setup Meta WhatsApp API Credentials">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack gap="base">
                <s-paragraph>
                  To get started, configure your WhatsApp Business Account (WABA) details inside the app.
                </s-paragraph>
                <s-unordered-list>
                  <s-list-item>
                    Go to the <strong>Dashboard (Overview)</strong> tab and scroll down to the <strong>Settings</strong> section.
                  </s-list-item>
                  <s-list-item>
                    Enter your Meta Developer App Details:
                    <ul style={{ paddingLeft: '20px', marginTop: '4px', listStyleType: 'disc' }}>
                      <li><strong>WhatsApp Business Account ID (WABA ID)</strong></li>
                      <li><strong>Phone Number ID</strong></li>
                      <li><strong>Meta WhatsApp Access Token</strong> (System User Access Token is recommended for permanent access)</li>
                      <li><strong>Meta App Secret</strong></li>
                    </ul>
                  </s-list-item>
                  <s-list-item>
                    Click <strong>Save Settings</strong>.
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-section>

          {/* Step 2 */}
          <s-section heading="Step 2: Configure Webhooks in Meta Developer Console">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack gap="base">
                <s-paragraph>
                  Webhooks enable the app to listen to delivery reports (Sent, Delivered, Read, Failed) and customer responses (Opt-ins/Opt-outs).
                </s-paragraph>
                <s-unordered-list>
                  <s-list-item>
                    In the app's <strong>Settings</strong> tab, find your auto-generated <strong>Webhook URL</strong> and <strong>Verification Token</strong>.
                  </s-list-item>
                  <s-list-item>
                    Log into the <s-link href="https://developers.facebook.com/" target="_blank">Meta Developer Portal</s-link>, go to your App, and add the <strong>WhatsApp</strong> product.
                  </s-list-item>
                  <s-list-item>
                    Navigate to <strong>WhatsApp Configuration</strong> &gt; <strong>Webhooks</strong>. Click <strong>Edit</strong>.
                  </s-list-item>
                  <s-list-item>
                    Paste the Webhook URL and the Verification Token, then verify and save.
                  </s-list-item>
                  <s-list-item>
                    Under Webhook fields, click <strong>Subscribe</strong> to the <code>messages</code> field.
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-section>

          {/* Step 3 */}
          <s-section heading="Step 3: Synchronize WhatsApp Message Templates">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack gap="base">
                <s-paragraph>
                  WhatsApp requires message templates to be pre-approved by Meta before they can be sent.
                </s-paragraph>
                <s-unordered-list>
                  <s-list-item>
                    Go to the <strong>Templates</strong> tab in the app dashboard.
                  </s-list-item>
                  <s-list-item>
                    Click the <strong>Sync Templates</strong> button. This pulls all templates registered under your WABA account.
                  </s-list-item>
                  <s-list-item>
                    Once synced, you can view template structures, categories (Marketing, Utility, Authentication), languages, and approval statuses directly.
                  </s-list-item>
                  <s-list-item>
                    <em>Note: Only approved templates can be used for automations and campaigns.</em>
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-section>

          {/* Step 4 */}
          <s-section heading="Step 4: Set up Checkout Abandonment Automation">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack gap="base">
                <s-paragraph>
                  Recover lost sales by sending automatic WhatsApp reminders when a customer leaves their cart.
                </s-paragraph>
                <s-unordered-list>
                  <s-list-item>
                    Navigate to the <strong>Automations</strong> tab on the Dashboard.
                  </s-list-item>
                  <s-list-item>
                    Toggle the <strong>Abandoned Checkout Automation</strong> state to <strong>Active</strong>.
                  </s-list-item>
                  <s-list-item>
                    Select an approved template (e.g. <code>abandoned_cart_reminder</code> or <code>abandoned_checkout_coupon</code>).
                  </s-list-item>
                  <s-list-item>
                    Set the dispatch delay (e.g. 1 hour, 6 hours, 24 hours).
                  </s-list-item>
                  <s-list-item>
                    Click <strong>Save Automation</strong>. The app will now automatically track checkout creation webhooks and queue reminders.
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-section>

          {/* Step 5 */}
          <s-section heading="Step 5: Launch Bulk Campaigns & Broadcasts">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack gap="base">
                <s-paragraph>
                  Send batch marketing or notification campaigns to your opted-in customers.
                </s-paragraph>
                <s-unordered-list>
                  <s-list-item>
                    Go to the <strong>Campaigns</strong> tab.
                  </s-list-item>
                  <s-list-item>
                    Enter a descriptive name (e.g., "Black Friday Pre-Access 2026").
                  </s-list-item>
                  <s-list-item>
                    Select the template (e.g. <code>black_friday_pre_access</code>) and select the corresponding language.
                  </s-list-item>
                  <s-list-item>
                    Choose to send it immediately or specify a scheduled date and time.
                  </s-list-item>
                  <s-list-item>
                    Click <strong>Create Campaign</strong>. The system will create background dispatch jobs.
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-section>

          {/* Step 6 */}
          <s-section heading="Step 6: Monitor Queue and Delivery Logs">
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack gap="base">
                <s-paragraph>
                  Track the background jobs worker queue and message statuses.
                </s-paragraph>
                <s-unordered-list>
                  <s-list-item>
                    Go to the <strong>Background Jobs</strong> page from the top navigation.
                  </s-list-item>
                  <s-list-item>
                    You can see pending, processing, completed, and failed tasks (like template syncs, campaign dispatches, and automations).
                  </s-list-item>
                  <s-list-item>
                    Inspect raw payload data or error details if a job fails, and trigger retries on demand.
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-section>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: '0' }}>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack gap="base">
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                Key Technical Details
              </h3>
              <s-paragraph>
                <strong>Encryption:</strong> Access tokens and app secrets are encrypted via AES-256-GCM before database insertion.
              </s-paragraph>
              <s-paragraph>
                <strong>Keywords:</strong> Customers can opt out of messages anytime by replying <code>STOP</code> or <code>UNSUBSCRIBE</code>. Opt-in keywords are <code>START</code> or <code>SUBSCRIBE</code>.
              </s-paragraph>
              <s-paragraph>
                <strong>Shopify CLI Dev Tunnel:</strong> When developing locally, ensure the local webhooks and API are routed correctly. Use <code>npm run dev</code> which automatically links app configurations.
              </s-paragraph>
            </s-stack>
          </s-box>
        </div>
      </div>
    </s-page>
  );
}
