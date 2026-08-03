import prisma from '../../../db.server';
import type { Notification } from '@prisma/client';

export class NotificationRepository {
  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  async listNotifications(
    shop: string,
    options: { limit?: number; offset?: number; onlyUnread?: boolean } = {}
  ): Promise<Notification[]> {
    const whereClause: any = { shop };
    if (options.onlyUnread) {
      whereClause.read = false;
    }

    return prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset,
    });
  }

  async countUnread(shop: string): Promise<number> {
    return prisma.notification.count({
      where: { shop, read: false },
    });
  }

  async createNotification(
    shop: string,
    data: {
      title: string;
      message: string;
      type: string; // INFO, WARNING, ERROR, SUCCESS
    }
  ): Promise<Notification> {
    return prisma.notification.create({
      data: {
        shop,
        title: data.title,
        message: data.message,
        type: data.type,
        read: false,
      },
    });
  }

  async markAsRead(shop: string, id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id, shop },
      data: { read: true },
    });
  }

  async markAllAsRead(shop: string): Promise<any> {
    return prisma.notification.updateMany({
      where: { shop, read: false },
      data: { read: true },
    });
  }

  async deleteNotification(shop: string, id: string): Promise<Notification> {
    return prisma.notification.delete({
      where: { id, shop },
    });
  }
}

export const notificationRepository = new NotificationRepository();
