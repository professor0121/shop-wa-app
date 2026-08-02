import prisma from '../../../db.server';
import type { Checkout, Prisma } from '@prisma/client';

export class CheckoutRepository {
  async findCheckoutById(id: string): Promise<Checkout | null> {
    return prisma.checkout.findUnique({
      where: { id },
    });
  }

  async upsertCheckout(data: Prisma.CheckoutCreateInput): Promise<Checkout> {
    return prisma.checkout.upsert({
      where: { id: data.id },
      update: {
        shop: data.shop,
        phone: data.phone,
        email: data.email,
        totalPrice: data.totalPrice,
        currencyCode: data.currencyCode,
        completed: data.completed,
        completedAt: data.completedAt,
        abandonedEmailSent: data.abandonedEmailSent,
      },
      create: data,
    });
  }

  async markAsCompleted(id: string, completedAt: Date = new Date()): Promise<Checkout | null> {
    try {
      return await prisma.checkout.update({
        where: { id },
        data: {
          completed: true,
          completedAt,
        },
      });
    } catch (error) {
      return null;
    }
  }
}

export const checkoutRepository = new CheckoutRepository();
