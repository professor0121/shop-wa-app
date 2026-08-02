import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { orderService } from '../modules/order/services/order.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await orderService.syncOrder(shop, payload);

  return new Response();
};
