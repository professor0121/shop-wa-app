import { productRepository, ProductRepository } from '../repositories/product.repository';
import { productWebhookPayloadSchema } from '../validations/product.validation';
import type { Product } from '@prisma/client';

export class ProductService {
  private repository: ProductRepository;

  constructor(repository: ProductRepository = productRepository) {
    this.repository = repository;
  }

  async syncProduct(shop: string, rawPayload: unknown): Promise<Product | null> {
    const parseResult = productWebhookPayloadSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.error(
        `[ProductService] Invalid product webhook payload for shop ${shop}:`,
        parseResult.error.format()
      );
      return null;
    }

    const payload = parseResult.data;

    const gid =
      typeof payload.id === 'string' && payload.id.startsWith('gid://')
        ? payload.id
        : `gid://shopify/Product/${payload.id}`;

    return this.repository.upsertProduct({
      id: gid,
      shop,
      title: payload.title,
      handle: payload.handle,
      description: payload.body_html || null,
      status: payload.status,
      vendor: payload.vendor || null,
      productType: payload.product_type || null,
    });
  }

  async deleteProduct(shop: string, rawId: string | number): Promise<void> {
    const gid =
      typeof rawId === 'string' && rawId.startsWith('gid://')
        ? rawId
        : `gid://shopify/Product/${rawId}`;

    console.log(`[ProductService] Deleting product ${gid} for shop ${shop}`);
    await this.repository.deleteProduct(gid);
  }
}

export const productService = new ProductService();
