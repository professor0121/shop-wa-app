import prisma from '../../../db.server';
import type { Customer, Prisma } from '@prisma/client';

export class CustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { id },
    });
  }

  async findByPhone(shop: string, phone: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: {
        shop_phone: {
          shop,
          phone,
        },
      },
    });
  }

  async upsertCustomer(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return prisma.customer.upsert({
      where: { id: data.id },
      update: {
        shop: data.shop,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        optedIn: data.optedIn,
        optedInAt: data.optedInAt,
        optedOutAt: data.optedOutAt,
      },
      create: data,
    });
  }

  async deleteCustomer(id: string): Promise<Customer | null> {
    try {
      return await prisma.customer.delete({
        where: { id },
      });
    } catch (error) {
      return null;
    }
  }

  async updateOptInStatus(id: string, optedIn: boolean): Promise<Customer> {
    const now = new Date();
    return prisma.customer.update({
      where: { id },
      data: {
        optedIn,
        optedInAt: optedIn ? now : undefined,
        optedOutAt: !optedIn ? now : undefined,
      },
    });
  }
}

export const customerRepository = new CustomerRepository();
