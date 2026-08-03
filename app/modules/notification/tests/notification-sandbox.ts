import { notificationService } from '../services/notification.service';
import prisma from '../../../db.server';

async function runSandbox() {
  console.log('--- Starting Notification Service Sandbox Test ---');

  const shop = 'test-notification-shop.myshopify.com';

  // Cleanup any old test notifications for this test shop
  await prisma.notification.deleteMany({
    where: { shop },
  });

  // Test 1: Create a notification
  console.log('Test 1: Creating a notification...');
  const created = await notificationService.createNotification(
    shop,
    'Test Alert',
    'This is a test notification message.',
    'INFO'
  );
  console.log('Created Notification ID:', created.id);
  if (created.title !== 'Test Alert' || created.type !== 'INFO' || created.read !== false) {
    throw new Error('Test 1 Failed: Created notification properties are incorrect.');
  }

  // Test 2: Get unread count
  console.log('Test 2: Getting unread count...');
  const unreadCount = await notificationService.getUnreadCount(shop);
  console.log('Unread Count:', unreadCount);
  if (unreadCount !== 1) {
    throw new Error(`Test 2 Failed: Expected unread count to be 1, got ${unreadCount}`);
  }

  // Test 3: Get notifications list
  console.log('Test 3: Fetching notifications list...');
  const list = await notificationService.getNotifications(shop);
  console.log('Notifications Count in List:', list.length);
  if (list.length !== 1 || list[0].id !== created.id) {
    throw new Error('Test 3 Failed: List contains incorrect notifications.');
  }

  // Test 4: Mark as read
  console.log('Test 4: Marking notification as read...');
  const updated = await notificationService.markAsRead(shop, created.id);
  console.log('Notification read status after update:', updated.read);
  if (updated.read !== true) {
    throw new Error('Test 4 Failed: Notification read status not updated.');
  }

  const unreadCountAfterRead = await notificationService.getUnreadCount(shop);
  if (unreadCountAfterRead !== 0) {
    throw new Error(`Test 4 Failed: Expected unread count after marking read to be 0, got ${unreadCountAfterRead}`);
  }

  // Test 5: Delete notification
  console.log('Test 5: Deleting notification...');
  await notificationService.deleteNotification(shop, created.id);
  const listAfterDelete = await notificationService.getNotifications(shop);
  console.log('Notifications Count after delete:', listAfterDelete.length);
  if (listAfterDelete.length !== 0) {
    throw new Error('Test 5 Failed: Notification was not deleted.');
  }

  // Clean up
  await prisma.notification.deleteMany({
    where: { shop },
  });

  console.log('✅ Notification Sandbox Test PASSED!');
}

runSandbox().catch((err) => {
  console.error('❌ Notification Sandbox Test FAILED:', err);
  process.exit(1);
});
