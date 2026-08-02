import { z } from 'zod';

export const productWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string(),
  handle: z.string(),
  body_html: z.string().nullable().optional(),
  status: z.string(),
  vendor: z.string().nullable().optional(),
  product_type: z.string().nullable().optional(),
});

export const productDeleteWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
});

export type ProductWebhookPayload = z.infer<typeof productWebhookPayloadSchema>;
export type ProductDeleteWebhookPayload = z.infer<typeof productDeleteWebhookPayloadSchema>;
