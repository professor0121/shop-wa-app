import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { queueService } from '../modules/queue/services/queue.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await queueService.enqueueJob('SYNC_CUSTOMER', { shop, payload });

  return new Response();
};
