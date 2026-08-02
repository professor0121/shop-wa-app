import { customerRepository, CustomerRepository } from '../repositories/customer.repository';
import { customerWebhookPayloadSchema } from '../validations/customer.validation';
import type { Customer } from '@prisma/client';

export class CustomerService {
  private repository: CustomerRepository;

  constructor(repository: CustomerRepository = customerRepository) {
    this.repository = repository;
  }

  normalizePhoneNumber(phone: string): string | null {
    if (!phone) return null;
    const clean = phone.trim();
    if (clean.startsWith('+')) {
      const digits = clean.replace(/\D/g, '');
      return digits ? `+${digits}` : null;
    }
    if (clean.startsWith('00')) {
      const digits = clean.substring(2).replace(/\D/g, '');
      return digits ? `+${digits}` : null;
    }
    const digits = clean.replace(/\D/g, '');
    if (!digits) return null;
    // If it is a 10-digit number, assume US/Canada and prepend +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    // For other lengths, if it's long enough, prepend + assuming it already includes a country code
    if (digits.length >= 8) {
      return `+${digits}`;
    }
    return null;
  }

  async syncCustomer(shop: string, rawPayload: unknown): Promise<Customer | null> {
    const parseResult = customerWebhookPayloadSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.error(
        `[CustomerService] Invalid webhook payload for shop ${shop}:`,
        parseResult.error.format()
      );
      return null;
    }

    const payload = parseResult.data;

    // Find phone number:
    // 1. Root level phone
    // 2. Default address phone
    // 3. Any address phone
    let rawPhone = payload.phone;
    if (!rawPhone && payload.default_address?.phone) {
      rawPhone = payload.default_address.phone;
    }
    if (!rawPhone && payload.addresses) {
      for (const addr of payload.addresses) {
        if (addr.phone) {
          rawPhone = addr.phone;
          break;
        }
      }
    }

    if (!rawPhone) {
      console.log(`[CustomerService] Skipping customer ${payload.id} sync: no phone number found`);
      return null;
    }

    const normalizedPhone = this.normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      console.log(
        `[CustomerService] Skipping customer ${payload.id} sync: phone number "${rawPhone}" could not be normalized`
      );
      return null;
    }

    // Construct GraphQL GID if the ID is just a numeric string or number
    const gid =
      typeof payload.id === 'string' && payload.id.startsWith('gid://')
        ? payload.id
        : `gid://shopify/Customer/${payload.id}`;

    return this.repository.upsertCustomer({
      id: gid,
      shop,
      phone: normalizedPhone,
      firstName: payload.first_name || null,
      lastName: payload.last_name || null,
    });
  }

  async deleteCustomer(shop: string, rawId: string | number): Promise<void> {
    const gid =
      typeof rawId === 'string' && rawId.startsWith('gid://')
        ? rawId
        : `gid://shopify/Customer/${rawId}`;

    console.log(`[CustomerService] Deleting customer ${gid} for shop ${shop}`);
    await this.repository.deleteCustomer(gid);
  }

  async optInCustomer(shop: string, phone: string): Promise<Customer> {
    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }

    const existing = await this.repository.findByPhone(shop, normalized);
    const now = new Date();

    if (existing) {
      return this.repository.updateOptInStatus(existing.id, true);
    } else {
      // If customer doesn't exist locally, create a stub with a temporary UUID-based ID
      // We will replace it once we receive a Shopify webhook if applicable.
      const tempId = `gid://shopify/Customer/stub-${crypto.randomUUID()}`;
      return this.repository.upsertCustomer({
        id: tempId,
        shop,
        phone: normalized,
        optedIn: true,
        optedInAt: now,
      });
    }
  }

  async optOutCustomer(shop: string, phone: string): Promise<Customer> {
    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }

    const existing = await this.repository.findByPhone(shop, normalized);
    const now = new Date();

    if (existing) {
      return this.repository.updateOptInStatus(existing.id, false);
    } else {
      const tempId = `gid://shopify/Customer/stub-${crypto.randomUUID()}`;
      return this.repository.upsertCustomer({
        id: tempId,
        shop,
        phone: normalized,
        optedIn: false,
        optedOutAt: now,
      });
    }
  }
}

export const customerService = new CustomerService();
