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
}

export const whatsAppService = new WhatsAppService();
