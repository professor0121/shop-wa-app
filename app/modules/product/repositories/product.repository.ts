import prisma from '../../../db.server';
import type { Product, Prisma } from '@prisma/client';

export class ProductRepository {
  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    });
  }

  async upsertProduct(data: Prisma.ProductCreateInput): Promise<Product> {
    return prisma.product.upsert({
      where: { id: data.id },
      update: {
        shop: data.shop,
        title: data.title,
        handle: data.handle,
        description: data.description,
        status: data.status,
        vendor: data.vendor,
        productType: data.productType,
      },
      create: data,
    });
  }

  async deleteProduct(id: string): Promise<Product | null> {
    try {
      return await prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }
}

export const productRepository = new ProductRepository();
