import prisma from '../../../db.server';
import type { Order, Prisma } from '@prisma/client';

export class OrderRepository {
  async findOrderById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
    });
  }

  async upsertOrder(data: Prisma.OrderCreateInput): Promise<Order> {
    return prisma.order.upsert({
      where: { id: data.id },
      update: {
        shop: data.shop,
        phone: data.phone,
        email: data.email,
        totalPrice: data.totalPrice,
        currencyCode: data.currencyCode,
        customerId: data.customerId,
      },
      create: data,
    });
  }

  async deleteOrder(id: string): Promise<Order | null> {
    try {
      return await prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }
}

export const orderRepository = new OrderRepository();
