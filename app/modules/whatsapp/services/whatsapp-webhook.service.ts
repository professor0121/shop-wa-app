import prisma from '../../../db.server';
import crypto from 'crypto';

export class WhatsAppWebhookService {
  verifySignature(rawBody: string, signatureHeader: string, appSecret: string): boolean {
    if (!signatureHeader) return false;
    const signature = signatureHeader.replace('sha256=', '');
    const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }

  async handleWebhookPayload(payload: any): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') return;

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || value.messaging_product !== 'whatsapp') continue;

        // 1. Process Status Updates
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const messageId = statusObj.id;
            const status = statusObj.status.toUpperCase(); // SENT, DELIVERED, READ, FAILED
            let errorMessage = null;

            if (statusObj.errors && statusObj.errors.length > 0) {
              errorMessage = statusObj.errors[0].message || 'Unknown error';
            }

            const log = await prisma.messageLog.findUnique({
              where: { id: messageId },
            });

            if (log) {
              await prisma.messageLog.update({
                where: { id: messageId },
                data: {
                  status: status === 'SENT' || status === 'DELIVERED' || status === 'READ' || status === 'FAILED' ? status : log.status,
                  errorMessage: errorMessage || log.errorMessage,
                },
              });
            }
          }
        }

        // 2. Process Inbound Messages
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const phone = msg.from.startsWith('+') ? msg.from : '+' + msg.from;
            const messageId = msg.id;
            const body = msg.text?.body || (msg.type ? `[Message type: ${msg.type}]` : '');

            const phoneNumberId = value.metadata?.phone_number_id;
            if (!phoneNumberId) continue;

            const config = await prisma.shopConfig.findFirst({
              where: { phoneNumberId },
            });

            if (!config) continue;
            const shop = config.shop;

            const customer = await prisma.customer.findFirst({
              where: { shop, phone },
            });

            const optOutKeywords = config.optOutKeywords.split(',').map(k => k.trim().toUpperCase());
            const textContent = body.trim().toUpperCase();

            if (optOutKeywords.includes(textContent)) {
              if (customer) {
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: {
                    optedIn: false,
                    optedOutAt: new Date(),
                  },
                });
                console.log(`[WhatsAppWebhook] Customer ${phone} opted out via keyword for shop ${shop}`);
              }
            }

            await prisma.messageLog.upsert({
              where: { id: messageId },
              update: {
                status: 'READ',
                body,
              },
              create: {
                id: messageId,
                shop,
                phone,
                direction: 'INBOUND',
                status: 'READ',
                body,
              },
            });
          }
        }
      }
    }
  }
}

export const whatsAppWebhookService = new WhatsAppWebhookService();
