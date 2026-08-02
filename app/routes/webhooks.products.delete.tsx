import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { productService } from '../modules/product/services/product.service';
import { productDeleteWebhookPayloadSchema } from '../modules/product/validations/product.validation';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const parseResult = productDeleteWebhookPayloadSchema.safeParse(payload);
  if (parseResult.success) {
    await productService.deleteProduct(shop, parseResult.data.id);
  } else {
    console.error(
      `[ProductDeleteWebhook] Invalid payload for shop ${shop}:`,
      parseResult.error.format()
    );
  }

  return new Response();
};
