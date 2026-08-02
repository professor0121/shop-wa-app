import { z } from 'zod';

export const customerWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  phone: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  default_address: z
    .object({
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  addresses: z
    .array(
      z.object({
        phone: z.string().nullable().optional(),
      })
    )
    .optional(),
});

export const customerDeleteWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
});

export type CustomerWebhookPayload = z.infer<typeof customerWebhookPayloadSchema>;
export type CustomerDeleteWebhookPayload = z.infer<typeof customerDeleteWebhookPayloadSchema>;
