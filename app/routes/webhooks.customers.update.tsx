import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { customerService } from '../modules/customer/services/customer.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await customerService.syncCustomer(shop, payload);

  return new Response();
};
