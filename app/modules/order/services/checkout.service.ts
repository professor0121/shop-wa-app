import { checkoutRepository, CheckoutRepository } from '../repositories/checkout.repository';
import { checkoutWebhookPayloadSchema } from '../validations/order.validation';
import { customerService } from '../../customer/services/customer.service';
import { automationService } from '../../automation/services/automation.service';
import type { Checkout } from '@prisma/client';

export class CheckoutService {
  private repository: CheckoutRepository;

  constructor(repository: CheckoutRepository = checkoutRepository) {
    this.repository = repository;
  }

  async syncCheckout(shop: string, rawPayload: unknown): Promise<Checkout | null> {
    const parseResult = checkoutWebhookPayloadSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.error(
        `[CheckoutService] Invalid checkout webhook payload for shop ${shop}:`,
        parseResult.error.format()
      );
      return null;
    }

    const payload = parseResult.data;

    // Find phone number in checkout payload:
    // 1. Root level phone
    // 2. Customer level phone
    // 3. Billing address phone
    // 4. Shipping address phone
    let rawPhone = payload.phone;
    if (!rawPhone && payload.customer?.phone) {
      rawPhone = payload.customer.phone;
    }
    if (!rawPhone && payload.billing_address?.phone) {
      rawPhone = payload.billing_address.phone;
    }
    if (!rawPhone && payload.shipping_address?.phone) {
      rawPhone = payload.shipping_address.phone;
    }

    if (!rawPhone) {
      console.log(
        `[CheckoutService] Skipping checkout ${payload.token} sync: no phone number found`
      );
      return null;
    }

    const normalizedPhone = customerService.normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      console.log(
        `[CheckoutService] Skipping checkout ${payload.token} sync: phone number "${rawPhone}" could not be normalized`
      );
      return null;
    }

    const checkout = await this.repository.upsertCheckout({
      id: payload.token,
      shop,
      phone: normalizedPhone,
      email: payload.email || null,
      totalPrice: payload.total_price,
      currencyCode: payload.currency,
      completed: false,
    });

    if (checkout) {
      await automationService.scheduleAbandonedCheckout(shop, checkout);
    }

    return checkout;
  }

  async completeCheckout(token: string): Promise<void> {
    console.log(`[CheckoutService] Marking checkout ${token} as completed`);
    await this.repository.markAsCompleted(token);
  }
}

export const checkoutService = new CheckoutService();
