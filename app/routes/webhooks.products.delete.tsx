import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { productDeleteWebhookPayloadSchema } from '../modules/product/validations/product.validation';
import { queueService } from '../modules/queue/services/queue.service';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const parseResult = productDeleteWebhookPayloadSchema.safeParse(payload);
  if (parseResult.success) {
    await queueService.enqueueJob('DELETE_PRODUCT', { shop, id: parseResult.data.id });
  } else {
    console.error(
      `[ProductDeleteWebhook] Invalid payload for shop ${shop}:`,
      parseResult.error.format()
    );
  }

  return new Response();
};
