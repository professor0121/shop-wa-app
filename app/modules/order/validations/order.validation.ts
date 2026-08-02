import { z } from 'zod';

export const orderWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  total_price: z.string(),
  currency: z.string(),
  checkout_id: z.union([z.number(), z.string()]).nullable().optional(),
  checkout_token: z.string().nullable().optional(),
  customer: z
    .object({
      id: z.union([z.number(), z.string()]).nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const checkoutWebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  token: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  total_price: z.string(),
  currency: z.string(),
  customer: z
    .object({
      id: z.union([z.number(), z.string()]).nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  billing_address: z
    .object({
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  shipping_address: z
    .object({
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type OrderWebhookPayload = z.infer<typeof orderWebhookPayloadSchema>;
export type CheckoutWebhookPayload = z.infer<typeof checkoutWebhookPayloadSchema>;
