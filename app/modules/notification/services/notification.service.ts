import { notificationRepository, NotificationRepository } from '../repositories/notification.repository';
import type { Notification } from '@prisma/client';

export class NotificationService {
  private repository: NotificationRepository;

  constructor(repository: NotificationRepository = notificationRepository) {
    this.repository = repository;
  }

  async createNotification(
    shop: string,
    title: string,
    message: string,
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  ): Promise<Notification> {
    return this.repository.createNotification(shop, {
      title,
      message,
      type,
    });
  }

  async getNotifications(
    shop: string,
    options: { limit?: number; offset?: number; onlyUnread?: boolean } = {}
  ): Promise<Notification[]> {
    return this.repository.listNotifications(shop, options);
  }

  async getUnreadCount(shop: string): Promise<number> {
    return this.repository.countUnread(shop);
  }

  async markAsRead(shop: string, id: string): Promise<Notification> {
    return this.repository.markAsRead(shop, id);
  }

  async markAllAsRead(shop: string): Promise<any> {
    return this.repository.markAllAsRead(shop);
  }

  async deleteNotification(shop: string, id: string): Promise<Notification> {
    return this.repository.deleteNotification(shop, id);
  }
}

export const notificationService = new NotificationService();
