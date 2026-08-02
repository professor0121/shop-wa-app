import { sessionService } from '../../session/services/session.service';

export class WebhookService {
  async handleUninstall(shop: string): Promise<void> {
    console.log(`Processing app uninstallation webhook for shop: ${shop}`);
    // Clean up active merchant sessions on uninstall
    await sessionService.removeSessions(shop);
  }
}

export const webhookService = new WebhookService();
