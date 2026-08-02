import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { queueService } from '../modules/queue/services/queue.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (payload && payload.id) {
    await queueService.enqueueJob('DELETE_CUSTOMER', { shop, id: payload.id });
  }

  return new Response();
};
