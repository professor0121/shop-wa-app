import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { productService } from '../modules/product/services/product.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await productService.syncProduct(shop, payload);

  return new Response();
};
