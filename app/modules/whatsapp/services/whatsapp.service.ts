export class WhatsAppService {
  async fetchMetaTemplates(wabaId: string, decryptedToken: string): Promise<unknown> {
    const url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=1000`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meta API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async sendTemplateMessage(
    phoneNumberId: string,
    decryptedToken: string,
    to: string,
    templateName: string,
    languageCode: string
  ): Promise<{ messageId: string }> {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meta API send message error: ${response.status} - ${errorText}`);
    }

    const responseData = (await response.json()) as {
      messages?: { id: string }[];
    };
    const messageId = responseData.messages?.[0]?.id;
    if (!messageId) {
      throw new Error('Meta API did not return message ID');
    }

    return { messageId };
  }
}

export const whatsAppService = new WhatsAppService();
