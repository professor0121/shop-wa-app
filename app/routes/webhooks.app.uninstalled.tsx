import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { webhookService } from '../modules/webhook/services/webhook.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await webhookService.handleUninstall(shop);
  }

  return new Response();
};
