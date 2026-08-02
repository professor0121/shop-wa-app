import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { checkoutService } from '../modules/order/services/checkout.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await checkoutService.syncCheckout(shop, payload);

  return new Response();
};
