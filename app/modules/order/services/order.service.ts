import { orderRepository, OrderRepository } from '../repositories/order.repository';
import { orderWebhookPayloadSchema } from '../validations/order.validation';
import { customerService } from '../../customer/services/customer.service';
import { checkoutService } from './checkout.service';
import type { Order } from '@prisma/client';

export class OrderService {
  private repository: OrderRepository;

  constructor(repository: OrderRepository = orderRepository) {
    this.repository = repository;
  }

  async syncOrder(shop: string, rawPayload: unknown): Promise<Order | null> {
    const parseResult = orderWebhookPayloadSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.error(
        `[OrderService] Invalid order webhook payload for shop ${shop}:`,
        parseResult.error.format()
      );
      return null;
    }

    const payload = parseResult.data;

    // Find phone number in order payload
    let rawPhone = payload.phone;
    if (!rawPhone && payload.customer?.phone) {
      rawPhone = payload.customer.phone;
    }

    if (!rawPhone) {
      console.log(`[OrderService] Skipping order ${payload.id} sync: no phone number found`);
      return null;
    }

    const normalizedPhone = customerService.normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      console.log(
        `[OrderService] Skipping order ${payload.id} sync: phone number "${rawPhone}" could not be normalized`
      );
      return null;
    }

    const gid =
      typeof payload.id === 'string' && payload.id.startsWith('gid://')
        ? payload.id
        : `gid://shopify/Order/${payload.id}`;

    const customerGid = payload.customer?.id
      ? typeof payload.customer.id === 'string' && payload.customer.id.startsWith('gid://')
        ? payload.customer.id
        : `gid://shopify/Customer/${payload.customer.id}`
      : null;

    const order = await this.repository.upsertOrder({
      id: gid,
      shop,
      phone: normalizedPhone,
      email: payload.email || null,
      totalPrice: payload.total_price,
      currencyCode: payload.currency,
      customerId: customerGid,
    });

    // Mark the associated checkout as completed
    if (payload.checkout_token) {
      await checkoutService.completeCheckout(payload.checkout_token);
    }

    return order;
  }
}

export const orderService = new OrderService();
